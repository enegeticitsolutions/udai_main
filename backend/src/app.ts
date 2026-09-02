import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";
import { WebhookMessage } from "./models/WebhookMessage.js";
import { assignTherapist, getAvailableSlots, normalizeDepartment } from "./services/bookingService.js";
import { handleMsg91PaymentWebhook } from "./controllers/msg91PaymentWebhookController.js";

// ── MongoDB Connection & Lifecycle Logging ──────────────────────────
// Uses config.mongoUri (from MONGODB_URI env) with explicit dbName
if (config.mongoUri) {
  // Verbose Mongoose debug logs removed to prevent console spam

  mongoose
    .connect(config.mongoUri, { dbName: config.mongoDbName })
    .then(() => console.log(`✅ Mongoose connect() promise resolved for DB: "${config.mongoDbName}"`))
    .catch((err) => console.error("🚨 Mongoose Initial Connection Error:", err));
} else {
  console.warn("⚠️ MONGODB_URI env variable is not set or empty in config.");
}

export function createApp() {
  const app = express();
  const allowedOrigins = config.allowedOrigins.length > 0 ? config.allowedOrigins : [config.corsOrigin];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          (process.env.NODE_ENV !== "production" &&
            /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin))
        ) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
    }),
  );
  app.use(express.json());
  app.use(morgan("dev"));
  app.use("/uploads", express.static(path.join(config.storageDir, "uploads")));

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "UDAI backend API",
      docs: {
        health: "/api/health",
        content: "/api/content/*",
        forms: "/api/forms/*",
      },
    });
  });

  app.use("/api", apiRouter);

  // ── MSG91 WhatsApp Payment Webhook Direct Route ──────────────────
  app.post("/api/msg91/payment-webhook", handleMsg91PaymentWebhook);
  app.post("/msg91/payment-webhook", handleMsg91PaymentWebhook);
  app.post("/api/msg91", handleMsg91PaymentWebhook);

  // ── Webhook: receive MSG91 data & save to MongoDB ─────────────────
  app.post("/webhook/receive-msg", async (req, res) => {
    try {
      const readyStateMap: Record<number, string> = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
      };
      const state = mongoose.connection.readyState;
      console.log(`[Webhook Hit] Mongoose readyState: ${state} (${readyStateMap[state] ?? "unknown"})`);

      const incomingData = req.body || {};
      console.log("📩 Webhook payload received:", JSON.stringify(incomingData));

      // Try to parse content if it's a JSON string (chatbot responses may embed user data)
      let parsedContent: Record<string, any> = {};
      try {
        if (typeof incomingData.content === "string" && incomingData.content.startsWith("{")) {
          parsedContent = JSON.parse(incomingData.content);
        }
      } catch {
        // content is plain text — that's fine
      }

      // Helper: pick the first non-empty value from multiple sources
      const pick = (...values: any[]) => {
        for (const v of values) {
          if (v !== undefined && v !== null && v !== "") return String(v);
        }
        return "";
      };

      // Extract all relevant fields from wherever they might be in the payload
      const phone = pick(
        incomingData.customerNumber, incomingData.phone, incomingData.phoneNumber,
        incomingData.phone_number, incomingData.from, incomingData.sender,
        parsedContent.phone, parsedContent.customerNumber
      );
      const childName = pick(
        incomingData.childName, incomingData.child_name, incomingData.name,
        incomingData.patientName, incomingData.patient_name,
        parsedContent.childName, parsedContent.name,
        incomingData.userDetails?.name
      );
      const parentName = pick(
        incomingData.parentName, incomingData.parent_name, incomingData.parent,
        incomingData.guardianName, parsedContent.parentName, parsedContent.parent,
        incomingData.userDetails?.parentName
      );
      const age = pick(
        incomingData.age, incomingData.child_age, incomingData.patientAge,
        parsedContent.age, incomingData.userDetails?.age
      );
      const firstSession = pick(
        incomingData.firstSession, incomingData.first_session, incomingData.isFirstSession,
        parsedContent.firstSession
      );
      const appointmentDate = pick(
        incomingData.appointmentDate, incomingData.appointment_date, incomingData.date,
        parsedContent.appointmentDate, parsedContent.date
      );
      const appointmentTime = pick(
        incomingData.appointmentTime, incomingData.appointment_time, incomingData.time,
        incomingData.slot, parsedContent.appointmentTime, parsedContent.time
      );
      const rawDepartment = pick(
        incomingData.department, incomingData.doctor, incomingData.therapistName,
        parsedContent.department
      );
      const department = normalizeDepartment(rawDepartment);
      const concern = pick(
        incomingData.concern, incomingData.mainConcern, incomingData.problem,
        parsedContent.concern, incomingData.userDetails?.problem
      );
      const message = pick(
        incomingData.message, incomingData.content, incomingData.responseBody,
        incomingData.user_message, parsedContent.message
      );
      const transactionId = pick(
        incomingData.transactionId, incomingData.msg91TransactionId,
        incomingData.transaction_id, incomingData.requestId, incomingData.uuid
      );

      // ── Therapist assignment & availability check ───────────────────────
      let assignedTherapistId = "";
      let assignedTherapistName = "";
      let bookingStatus = "pending";
      const bookingSource = "whatsapp";

      const hasSlotRequest = Boolean(appointmentDate && department);
      let finalAppointmentTime = appointmentTime;

      if (hasSlotRequest) {
        if (!finalAppointmentTime || finalAppointmentTime.trim() === "") {
          const availableSlots = await getAvailableSlots(department, appointmentDate);
          if (availableSlots && availableSlots.length > 0) {
            finalAppointmentTime = availableSlots[0].time;
          } else {
            finalAppointmentTime = "10:00";
          }
        }

        // ── Assign an available therapist if available ───────────────────────
        const assignment = await assignTherapist(department, appointmentDate, finalAppointmentTime);

        if (assignment) {
          assignedTherapistId = assignment.id;
          assignedTherapistName = assignment.name;
        } else {
          assignedTherapistName = department;
        }
        bookingStatus = "confirmed";
        console.log(`✅ Therapist assigned: ${assignedTherapistName} for slot ${finalAppointmentTime}`);
      }

      // ── 1. Save to webhookmessages (WhatsApp Messages page) ────────
      const savedDoc = await WebhookMessage.create({
        rawData: incomingData,
        phone,
        childName,
        parentName,
        age,
        firstSession,
        appointmentDate,
        appointmentTime: finalAppointmentTime,
        department,
        concern,
        assignedTherapistId,
        assignedTherapist: assignedTherapistName,
        status: bookingStatus,
        bookingSource,
      });
      console.log("💾 Saved to webhookmessages — _id:", savedDoc._id);

      // ── 2. Sync to chatbotsubmissions (WhatsApp Appointments page) ─
      // Only sync if we have at least a phone number (skip empty delivery pings)
      if (phone) {
        try {
          const db = mongoose.connection.db;
          if (db) {
            const txnId = transactionId || `WH-${phone}-${Date.now()}`;
            await db.collection("chatbotsubmissions").updateOne(
              { transactionId: txnId },
              {
                $set: {
                  phone,
                  message: message || concern,
                  userDetails: {
                    name: childName || undefined,
                    age: age ? Number(age) : undefined,
                    parentName: parentName || undefined,
                    problem: concern || department || undefined,
                  },
                  assignedTherapist: assignedTherapistName || undefined,
                  assignedTherapistId: assignedTherapistId || undefined,
                  status: bookingStatus,
                  source: bookingSource,
                  rawPayload: incomingData,
                  updatedAt: new Date(),
                },
                $setOnInsert: { transactionId: txnId, createdAt: new Date() },
              },
              { upsert: true }
            );
            console.log("💾 Synced to chatbotsubmissions — txnId:", txnId);
          }
        } catch (syncErr: any) {
          console.error("⚠️ chatbotsubmissions sync failed:", syncErr.message);
        }
      }

      res.status(200).json({
        success: true,
        message: hasSlotRequest
          ? `Appointment confirmed with ${assignedTherapistName}`
          : "Data received and saved successfully",
        id: savedDoc._id,
        status: bookingStatus,
        assignedTherapist: assignedTherapistName || undefined,
      });
    } catch (error) {
      console.error("❌ Webhook Error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });

  // ── GET: fetch all saved webhook messages (latest first) ──────────
  app.get("/webhook/messages", async (_req, res) => {
    try {
      const messages = await WebhookMessage.find().sort({ receivedAt: -1 }).lean();
      res.json({ success: true, count: messages.length, data: messages });
    } catch (error) {
      console.error("❌ Fetch Webhook Messages Error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });

  // ── PATCH: update status, appointment date/time, or details ───────
  app.patch("/webhook/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        status,
        bookingStatus,
        appointmentDate,
        appointmentTime,
        assignedTherapist,
        assignedTherapistId,
        concern,
        childName,
        parentName,
        age,
        paymentStatus,
        paymentMode,
        transactionId,
      } = req.body;

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (bookingStatus !== undefined) updateData.bookingStatus = bookingStatus;
      if (appointmentDate !== undefined) updateData.appointmentDate = appointmentDate;
      if (appointmentTime !== undefined) updateData.appointmentTime = appointmentTime;
      if (assignedTherapist !== undefined) updateData.assignedTherapist = assignedTherapist;
      if (assignedTherapistId !== undefined) updateData.assignedTherapistId = assignedTherapistId;
      if (concern !== undefined) updateData.concern = concern;
      if (childName !== undefined) updateData.childName = childName;
      if (parentName !== undefined) updateData.parentName = parentName;
      if (age !== undefined) updateData.age = String(age);
      if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
      if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
      if (transactionId !== undefined) updateData.transactionId = transactionId;
      updateData.updatedAt = new Date();

      const updated = await WebhookMessage.findByIdAndUpdate(id, { $set: updateData }, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: "Record not found" });
      }

      // Also sync status and details to chatbotsubmissions and appointments if phone exists
      if (updated.phone) {
        try {
          const db = mongoose.connection.db;
          if (db) {
            const cleanPhone = updated.phone.replace(/[^\d]/g, "");
            const phoneQueries = [updated.phone, cleanPhone];
            if (cleanPhone.length === 10) {
              phoneQueries.push(`91${cleanPhone}`, `+91${cleanPhone}`);
            }

            await db.collection("chatbotsubmissions").updateMany(
              { phone: { $in: phoneQueries } },
              {
                $set: {
                  ...(updated.status ? { status: updated.status } : {}),
                  ...(paymentStatus ? { paymentStatus } : {}),
                  ...(paymentMode ? { paymentMode } : {}),
                  ...(transactionId ? { transactionId } : {}),
                  "userDetails.appointmentDate": updated.appointmentDate,
                  "userDetails.appointmentTime": updated.appointmentTime,
                  "userDetails.name": updated.childName,
                  "userDetails.parentName": updated.parentName,
                  assignedTherapist: updated.assignedTherapist,
                  updatedAt: new Date(),
                },
              }
            );

            const appointmentUpdate: any = { updatedAt: new Date().toISOString() };
            if (paymentStatus) appointmentUpdate.paymentStatus = paymentStatus;
            if (status) appointmentUpdate.bookingStatus = status;
            if (bookingStatus) appointmentUpdate.bookingStatus = bookingStatus;
            if (appointmentDate) appointmentUpdate.appointmentDate = appointmentDate;
            if (appointmentTime) appointmentUpdate.appointmentTime = appointmentTime;
            if (assignedTherapist) appointmentUpdate.therapistName = assignedTherapist;
            if (transactionId) appointmentUpdate.transactionId = transactionId;

            await db.collection("appointments").updateMany(
              { phoneNumber: { $in: phoneQueries } },
              { $set: appointmentUpdate }
            );
          }
        } catch (syncErr: any) {
          console.warn("Could not sync to chatbotsubmissions/appointments:", syncErr.message);
        }
      }

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error("❌ Update Webhook Message Error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to update record" });
    }
  });

  // ── DELETE: remove a webhook message record ───────────────────────
  app.delete("/webhook/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await WebhookMessage.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Record not found" });
      }
      res.json({ success: true, message: "Record deleted successfully" });
    } catch (error: any) {
      console.error("❌ Delete Webhook Message Error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to delete record" });
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}