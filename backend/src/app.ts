import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";
import { WebhookMessage } from "./models/WebhookMessage.js";

// ── MongoDB Connection ──────────────────────────────────────────────
// Uses config.mongoUri (from MONGODB_URI env) with explicit dbName
if (config.mongoUri) {
  mongoose
    .connect(config.mongoUri, { dbName: config.mongoDbName })
    .then(() => console.log(`✅ Mongoose connected to DB: "${config.mongoDbName}"`))
    .catch((err) => console.error("🚨 Mongoose Connection Error:", err));
}

export function createApp() {
  const app = express();
  const allowedOrigins = config.allowedOrigins.length > 0 ? config.allowedOrigins : [config.corsOrigin];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
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

  // ── Webhook: receive MSG91 data & save to MongoDB ─────────────────
  app.post("/webhook/receive-msg", async (req, res) => {
    try {
      const incomingData = req.body;
      console.log("📩 Webhook payload received:", JSON.stringify(incomingData).slice(0, 300));

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
      const department = pick(
        incomingData.department, incomingData.doctor, incomingData.therapistName,
        parsedContent.department
      );
      const concern = pick(
        incomingData.concern, incomingData.mainConcern, incomingData.problem,
        parsedContent.concern, incomingData.userDetails?.problem
      );

      const savedDoc = await WebhookMessage.create({
        rawData: incomingData,
        phone,
        childName,
        parentName,
        age,
        firstSession,
        appointmentDate,
        appointmentTime,
        department,
        concern,
      });
      console.log("💾 Saved to webhookmessages collection — _id:", savedDoc._id);

      res.status(200).json({
        success: true,
        message: "Data received and saved successfully",
        id: savedDoc._id,
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}