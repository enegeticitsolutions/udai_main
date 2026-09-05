import { Router } from "express";
import { ObjectId } from "mongodb";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import {
  authenticateAdmin,
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  resetCredentials,
  updateAdminUser,
} from "../services/adminAuthService.js";
import { createAdminRecord, deleteAdminRecord, getAdminBootstrap, updateAdminRecord, readRecords } from "../services/adminService.js";
import { upload } from "../middleware/upload.js";
import { uploadToSupabase } from "../lib/supabase.js";
import { config } from "../config.js";

import {
  getNewAdminWelcomeTemplate,
  getVolunteerApprovalTemplate,
  sendEmail,
} from "../services/emailService.js";
import {
  getAppointment,
  getAppointmentMetrics,
  listAppointments,
  subscribeToAppointmentEvents,
  updateAppointmentStatus,
} from "../services/appointmentService.js";

export const adminRouter = Router();

adminRouter.post("/login", async (req, res, next) => {
  try {
    const { email = "", password = "" } = req.body ?? {};
    const user = await authenticateAdmin(String(email).trim(), String(password));

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid admin credentials" });
      return;
    }

    const { password: _password, ...safeUser } = user;
    res.json({ success: true, data: safeUser, message: "Login successful" });
  } catch (error) {
    next(error);
  }
});

// Admin User Management Routes (Super Admin)
adminRouter.get("/users", async (_req, res, next) => {
  try {
    const users = await listAdminUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users", async (req, res, next) => {
  try {
    const rawPassword = req.body?.password;
    const newUser = await createAdminUser(req.body ?? {});

    // Automatically send login ID & password to the new admin's email address
    let emailSent = false;
    try {
      const portalUrl = req.headers.origin || process.env.ADMIN_ORIGIN || "http://localhost:5191";
      await sendEmail({
        to: newUser.email,
        subject: "Welcome to UDAI Admin Portal - Your Login Credentials",
        html: getNewAdminWelcomeTemplate({
          name: newUser.name,
          email: newUser.email,
          password: rawPassword,
          role: newUser.role,
          permissions: newUser.permissions,
          portalUrl,
        }),
      });
      emailSent = true;
    } catch (emailErr) {
      console.warn("⚠️ Could not send welcome email to new admin:", emailErr.message);
    }

    res.status(201).json({
      success: true,
      data: newUser,
      message: emailSent
        ? `Admin created & login credentials sent to ${newUser.email}`
        : "Admin user created successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

adminRouter.put("/users/:id", async (req, res, next) => {
  try {
    const updatedUser = await updateAdminUser(req.params.id, req.body ?? {});

    // If password was updated by Super Admin, notify user
    if (req.body?.password) {
      try {
        const portalUrl = req.headers.origin || process.env.ADMIN_ORIGIN || "http://localhost:5191";
        await sendEmail({
          to: updatedUser.email,
          subject: "UDAI Admin Portal - Your Credentials Have Been Updated",
          html: getNewAdminWelcomeTemplate({
            name: updatedUser.name,
            email: updatedUser.email,
            password: req.body.password,
            role: updatedUser.role,
            permissions: updatedUser.permissions,
            portalUrl,
          }),
        });
      } catch (emailErr) {
        console.warn("⚠️ Could not send updated credentials email:", emailErr.message);
      }
    }

    res.json({ success: true, data: updatedUser, message: "Admin user updated successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

adminRouter.delete("/users/:id", async (req, res, next) => {
  try {
    const requesterEmail = req.headers["x-admin-email"] || req.query.requesterEmail || "";
    const result = await deleteAdminUser(req.params.id, requesterEmail);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Self-Service Reset Credentials (Login ID & Password)
adminRouter.post("/reset-credentials", async (req, res, next) => {
  try {
    const updatedUser = await resetCredentials(req.body ?? {});
    res.json({ success: true, data: updatedUser, message: "Credentials updated successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

adminRouter.get("/bootstrap", async (_req, res, next) => {
  try {
    const data = await getAdminBootstrap();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/appointments", async (req, res, next) => {
  try {
    const data = await listAppointments(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/appointments/metrics", async (_req, res, next) => {
  try {
    const data = await getAppointmentMetrics();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/appointments/events", async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`event: ready\ndata: ${JSON.stringify({ connected: true })}\n\n`);

    const unsubscribe = await subscribeToAppointmentEvents((event) => {
      res.write(`event: appointment\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/appointments/:id", async (req, res, next) => {
  try {
    const appointment = await getAppointment(req.params.id);
    if (!appointment) {
      res.status(404).json({ success: false, message: "Appointment not found" });
      return;
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/appointments/:id/status", async (req, res, next) => {
  try {
    const bookingStatus = String(req.body?.bookingStatus ?? "").trim().toLowerCase();
    const appointment = await updateAppointmentStatus(req.params.id, bookingStatus);
    if (!appointment) {
      res.status(404).json({ success: false, message: "Appointment not found" });
      return;
    }
    res.json({ success: true, data: appointment, message: "Appointment status updated successfully" });
  } catch (error) {
    if (error.message === "Invalid booking status") {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

adminRouter.post("/subscribers", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const record = await createAdminRecord("subscribers", { email });
    res.status(201).json({ success: true, data: record, message: "Subscriber saved successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/contacts", async (req, res, next) => {
  try {
    const payload = {
      name: String(req.body?.name ?? "").trim(),
      email: String(req.body?.email ?? "").trim(),
      subject: String(req.body?.subject ?? "").trim(),
      website: String(req.body?.website ?? "").trim(),
      message: String(req.body?.message ?? "").trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      res.status(400).json({ success: false, message: "Name, email, subject, and message are required" });
      return;
    }

    const record = await createAdminRecord("contacts", payload);
    res.status(201).json({ success: true, data: record, message: "Contact message saved successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/subscribers/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("subscribers", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Subscriber not found" });
      return;
    }
    res.json({ success: true, data: deleted, message: "Subscriber removed successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/contacts/:id", async (req, res, next) => {
  try {
    const updated = await updateAdminRecord("contacts", req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ success: false, message: "Contact message not found" });
      return;
    }
    res.json({ success: true, data: updated, message: "Contact message updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/contacts/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("contacts", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Contact message not found" });
      return;
    }
    res.json({ success: true, data: deleted, message: "Contact message removed successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/inquiries/:id", async (req, res, next) => {
  try {
    const updated = await updateAdminRecord("inquiries", req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ success: false, message: "Inquiry not found" });
      return;
    }

    res.json({ success: true, data: updated, message: "Inquiry updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/volunteers/:id", async (req, res, next) => {
  try {
    const updated = await updateAdminRecord("volunteers", req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ success: false, message: "Volunteer request not found" });
      return;
    }

    res.json({ success: true, data: updated, message: "Volunteer request updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/approve-volunteer", async (req, res, next) => {
  try {
    const volunteer = req.body?.volunteer ?? req.body ?? {};
    const id = String(volunteer.id ?? "").trim();
    const email = String(volunteer.email ?? "").trim().toLowerCase();

    if (!id || !email) {
      res.status(400).json({ success: false, message: "Volunteer id and email are required" });
      return;
    }

    const approvedAt = new Date().toISOString();
    const updated = await updateAdminRecord("volunteers", id, {
      status: "approved",
      approvedAt,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: "Volunteer request not found" });
      return;
    }

    try {
      await sendEmail({
        to: email,
        subject: "Your UDAI volunteer application has been approved",
        html: getVolunteerApprovalTemplate({ ...volunteer, ...updated }),
      });

      res.json({
        success: true,
        data: { ...updated, emailSent: true },
        message: "Volunteer approved and approval email sent successfully",
      });
    } catch (emailError) {
      console.error("Volunteer approval email failed:", emailError);
      res.status(202).json({
        success: true,
        data: { ...updated, emailSent: false },
        message: "Volunteer approved, but the approval email could not be sent. Please verify email settings and try again.",
      });
    }
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/orders/:id", async (req, res, next) => {
  try {
    const updated = await updateAdminRecord("orders", req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, data: updated, message: "Order updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/therapists", async (req, res, next) => {
  try {
    const payload = {
      name: String(req.body?.name ?? "").trim(),
      department: String(req.body?.department ?? "").trim(),
      role: String(req.body?.role ?? "").trim(),
      experience: String(req.body?.experience ?? "").trim(),
      image: String(req.body?.image ?? "").trim() || "/images/doctor2.png",
      active: req.body?.active !== false,
    };

    if (!payload.name || !payload.department || !payload.role || !payload.experience) {
      res.status(400).json({ success: false, message: "Name, department, role, and experience are required" });
      return;
    }

    const record = await createAdminRecord("therapists", payload);
    res.status(201).json({ success: true, data: record, message: "Therapist added successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/therapists/:id", async (req, res, next) => {
  try {
    const updated = await updateAdminRecord("therapists", req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ success: false, message: "Therapist not found" });
      return;
    }

    res.json({ success: true, data: updated, message: "Therapist updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/therapists/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("therapists", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Therapist not found" });
      return;
    }

    res.json({ success: true, data: deleted, message: "Therapist removed successfully" });
  } catch (error) {
    next(error);
  }
});

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

adminRouter.post("/upload", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    let fileUrl = "";
    try {
      if (config.supabaseUrl && (config.supabaseServiceRole || config.supabaseAnon)) {
        fileUrl = await uploadToSupabase(req.file.path, req.file.originalname, req.file.mimetype);
      } else {
        fileUrl = `/uploads/${req.file.filename}`;
      }
    } catch (supabaseErr) {
      console.warn("⚠️ Supabase upload failed, falling back to local file storage:", supabaseErr?.message || supabaseErr);
      fileUrl = `/uploads/${req.file.filename}`;
    }
    res.json({ success: true, url: fileUrl, message: "File uploaded successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/products", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    if (!payload.title || !payload.price || !payload.image) {
      res.status(400).json({ success: false, message: "Title, price, and image are required" });
      return;
    }

    if (!payload.slug) {
      payload.slug = slugify(payload.title);
    }

    const record = await createAdminRecord("products", payload);
    res.status(201).json({ success: true, data: record, message: "Product added successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/products/:id", async (req, res, next) => {
  try {
    const updates = req.body ?? {};
    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title);
    }
    const updated = await updateAdminRecord("products", req.params.id, updates);
    if (!updated) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.json({ success: true, data: updated, message: "Product updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/products/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("products", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.json({ success: true, data: deleted, message: "Product removed successfully" });
  } catch (error) {
    next(error);
  }
});

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCareerPayload(body) {
  return {
    title: String(body?.title ?? "").trim(),
    department: String(body?.department ?? "").trim(),
    location: String(body?.location ?? "").trim(),
    type: String(body?.type ?? "").trim(),
    experience: String(body?.experience ?? "").trim(),
    description: String(body?.description ?? "").trim(),
    responsibilities: normalizeList(body?.responsibilities),
    requirements: normalizeList(body?.requirements),
    status: body?.status === "closed" ? "closed" : "open",
  };
}

adminRouter.post("/careers", async (req, res, next) => {
  try {
    const payload = normalizeCareerPayload(req.body);
    if (!payload.title || !payload.department || !payload.location || !payload.type || !payload.experience || !payload.description) {
      res.status(400).json({ success: false, message: "Complete all required career fields" });
      return;
    }

    const record = await createAdminRecord("careers", payload);
    res.status(201).json({ success: true, data: record, message: "Career added successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/careers/:id", async (req, res, next) => {
  try {
    const updated = await updateAdminRecord("careers", req.params.id, normalizeCareerPayload(req.body));
    if (!updated) {
      res.status(404).json({ success: false, message: "Career not found" });
      return;
    }
    res.json({ success: true, data: updated, message: "Career updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/careers/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("careers", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Career not found" });
      return;
    }
    res.json({ success: true, data: deleted, message: "Career removed successfully" });
  } catch (error) {
    next(error);
  }
});

// ── Webhook Messages (WhatsApp Bot Records) ───────────────────────
adminRouter.get("/webhook/messages", async (_req, res, next) => {
  try {
    await connectMongoDb();
    if (isMongoConnected()) {
      const db = getMongoDb();
      const docs = await db.collection("webhookmessages").find({}).sort({ receivedAt: -1 }).toArray();
      const mapped = docs.map((doc) => ({
        ...doc,
        id: doc._id ? doc._id.toString() : String(doc.id ?? ""),
      }));
      return res.json({ success: true, count: mapped.length, data: mapped });
    }
    res.json({ success: true, count: 0, data: [] });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/webhook/messages/:id", async (req, res, next) => {
  try {
    await connectMongoDb();
    if (!isMongoConnected()) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    const db = getMongoDb();
    const id = req.params.id;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
    const {
      status,
      bookingStatus,
      appointmentDate,
      appointmentTime,
      assignedTherapist,
      concern,
      childName,
      parentName,
      age,
      paymentStatus,
      paymentMode,
      transactionId,
    } = req.body;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (bookingStatus !== undefined) updateData.bookingStatus = bookingStatus;
    if (appointmentDate !== undefined) updateData.appointmentDate = appointmentDate;
    if (appointmentTime !== undefined) updateData.appointmentTime = appointmentTime;
    if (assignedTherapist !== undefined) updateData.assignedTherapist = assignedTherapist;
    if (concern !== undefined) updateData.concern = concern;
    if (childName !== undefined) updateData.childName = childName;
    if (parentName !== undefined) updateData.parentName = parentName;
    if (age !== undefined) updateData.age = String(age);
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (transactionId !== undefined) updateData.transactionId = transactionId;
    updateData.updatedAt = new Date();

    const result = await db.collection("webhookmessages").findOneAndUpdate(filter, { $set: updateData }, { returnDocument: "after" });

    // Also sync to appointments and chatbotsubmissions
    const doc = result.value || result;
    if (doc && doc.phone) {
      const cleanPhone = String(doc.phone).replace(/[^\d]/g, "");
      const phoneQueries = [doc.phone, cleanPhone];
      if (cleanPhone.length === 10) phoneQueries.push(`91${cleanPhone}`, `+91${cleanPhone}`);

      try {
        await db.collection("appointments").updateMany(
          { phoneNumber: { $in: phoneQueries } },
          {
            $set: {
              ...(paymentStatus ? { paymentStatus } : {}),
              ...(status ? { bookingStatus: status } : {}),
              ...(bookingStatus ? { bookingStatus } : {}),
              ...(appointmentDate ? { appointmentDate } : {}),
              ...(appointmentTime ? { appointmentTime } : {}),
              ...(assignedTherapist ? { therapistName: assignedTherapist } : {}),
              ...(transactionId ? { transactionId } : {}),
              updatedAt: new Date().toISOString(),
            },
          }
        );
      } catch (aptErr) {
        console.warn("admin.js appointments sync error:", aptErr.message);
      }
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/webhook/messages/:id", async (req, res, next) => {
  try {
    await connectMongoDb();
    if (!isMongoConnected()) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    const db = getMongoDb();
    const id = req.params.id;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
    await db.collection("webhookmessages").deleteOne(filter);
    res.json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// ── Availability Manager Endpoints ────────────────────────────────
adminRouter.get("/availability", async (req, res, next) => {
  try {
    await connectMongoDb();
    if (!isMongoConnected()) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    const db = getMongoDb();
    const { startDate, endDate, date, department } = req.query;
    const filter = {};
    if (date) filter.date = String(date).trim();
    else if (startDate && endDate) filter.date = { $gte: String(startDate).trim(), $lte: String(endDate).trim() };
    else if (startDate) filter.date = { $gte: String(startDate).trim() };
    if (department) filter.department = String(department).trim();

    const records = await db.collection("availabilities").find(filter).toArray();
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/availability/toggle", async (req, res, next) => {
  try {
    await connectMongoDb();
    if (!isMongoConnected()) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    const db = getMongoDb();
    const { therapistName, department, date, isAvailable } = req.body;
    if (!therapistName || !date) {
      return res.status(400).json({ success: false, message: "therapistName and date are required" });
    }
    const cleanDate = String(date).trim();
    const cleanName = String(therapistName).trim();
    const cleanDept = String(department || "").trim();
    const availableVal = isAvailable === undefined ? true : Boolean(isAvailable);

    await db.collection("availabilities").updateOne(
      { therapistName: cleanName, date: cleanDate },
      {
        $set: {
          therapistName: cleanName,
          department: cleanDept,
          date: cleanDate,
          isAvailable: availableVal,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const doc = await db.collection("availabilities").findOne({ therapistName: cleanName, date: cleanDate });
    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
});

// ── Notifications Center ──────────────────────────────────
adminRouter.get("/notifications", async (_req, res, next) => {
  try {
    const records = await readRecords("notifications");
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/notifications/send", async (req, res, next) => {
  try {
    const { inquiryId, type = "General Notice", phone = "", email = "", recipientName = "", customMessage = "", channel = "system" } = req.body ?? {};

    const notificationRecord = {
      inquiryId: String(inquiryId || ""),
      type: String(type),
      recipientName: String(recipientName || "Patient"),
      phone: String(phone || ""),
      email: String(email || ""),
      message: String(customMessage || `${type} notification sent to ${recipientName || phone || "patient"}`),
      channel: String(channel || "system"),
      status: "sent",
      sentAt: new Date().toISOString(),
    };

    const saved = await createAdminRecord("notifications", notificationRecord);

    let emailSent = false;
    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: `UDAI Clinic: ${type}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: #2563eb; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0; margin: -24px -24px 20px -24px;">
                <h2 style="margin: 0; font-size: 20px;">UDAI Clinic Notification</h2>
              </div>
              <p>Dear <strong>${recipientName || "Patient / Parent"}</strong>,</p>
              <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155;">${notificationRecord.message}</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">If you have any questions or need assistance, please contact the UDAI helpdesk.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">UDAI - Upliftment Development Association of India</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err) {
        console.warn("Notification email delivery notice:", err.message);
      }
    }

    res.status(201).json({
      success: true,
      data: { ...saved, emailSent },
      message: emailSent ? "Notification sent and logged successfully" : "Notification recorded successfully",
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/notifications/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("notifications", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Notification record not found" });
      return;
    }
    res.json({ success: true, data: deleted, message: "Notification removed successfully" });
  } catch (error) {
    next(error);
  }
});

// ── Message Broadcast ─────────────────────────────────────
adminRouter.get("/broadcast/history", async (_req, res, next) => {
  try {
    const records = await readRecords("broadcasts");
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/broadcast/send", async (req, res, next) => {
  try {
    const { targetAudience = "all_subscribers", subject = "", message = "", category = "Announcement", sentBy = "Admin" } = req.body ?? {};

    if (!subject.trim() || !message.trim()) {
      res.status(400).json({ success: false, message: "Subject and message are required" });
      return;
    }

    let targetEmails = [];
    if (targetAudience === "all_subscribers" || targetAudience === "all_users") {
      const subscribers = await readRecords("subscribers");
      targetEmails.push(...subscribers.map((s) => s.email).filter(Boolean));
    }
    if (targetAudience === "all_inquiries" || targetAudience === "all_users") {
      const inquiries = await readRecords("inquiries");
      targetEmails.push(...inquiries.map((i) => i.email || i.parentEmail).filter(Boolean));
    }

    const uniqueEmails = [...new Set(targetEmails.map((e) => String(e).trim().toLowerCase()))].filter(Boolean);

    let sentCount = 0;
    let failedCount = 0;
    for (const to of uniqueEmails) {
      try {
        await sendEmail({
          to,
          subject: `[UDAI ${category}] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: #2563eb; color: #ffffff; padding: 18px 24px; border-radius: 8px 8px 0 0; margin: -28px -28px 24px -28px;">
                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85;">${category}</span>
                <h2 style="margin: 6px 0 0; font-size: 20px;">${subject}</h2>
              </div>
              <div style="font-size: 15px; line-height: 1.7; color: #334155; white-space: pre-wrap;">${message}</div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">UDAI - Upliftment Development Association of India • You received this message because you are registered with UDAI.</p>
            </div>
          `,
        });
        sentCount++;
      } catch (err) {
        console.warn(`Failed sending broadcast email to ${to}:`, err.message);
        failedCount++;
      }
    }

    const broadcastRecord = {
      subject: subject.trim(),
      message: message.trim(),
      category,
      targetAudience,
      recipientCount: uniqueEmails.length,
      sentCount,
      failedCount,
      sentBy,
      sentAt: new Date().toISOString(),
      status: "completed",
    };

    const saved = await createAdminRecord("broadcasts", broadcastRecord);
    res.status(201).json({
      success: true,
      data: saved,
      message: `Broadcast sent to ${uniqueEmails.length} recipients (${sentCount} emails delivered).`,
    });
  } catch (error) {
    next(error);
  }
});

// ── Settings ──────────────────────────────────────────────
adminRouter.get("/settings", async (_req, res, next) => {
  try {
    const list = await readRecords("settings");
    const currentSettings = list[0] || {
      clinicName: "UDAI Child Development & Therapy Centre",
      supportEmail: "support@udai.in",
      supportPhone: "+91 98765 43210",
      address: "123, Health Avenue, New Delhi, India",
      workingHours: "Mon - Sat: 9:00 AM - 6:00 PM",
      appointmentNotice: "Please arrive 10 minutes prior to your scheduled therapy session.",
      maintenanceMode: false,
    };
    res.json({ success: true, data: currentSettings });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/settings", async (req, res, next) => {
  try {
    const list = await readRecords("settings");
    let updated;
    if (list.length > 0 && list[0].id) {
      updated = await updateAdminRecord("settings", list[0].id, req.body ?? {});
    } else {
      updated = await createAdminRecord("settings", {
        clinicName: "UDAI Child Development & Therapy Centre",
        supportEmail: "support@udai.in",
        supportPhone: "+91 98765 43210",
        address: "123, Health Avenue, New Delhi, India",
        workingHours: "Mon - Sat: 9:00 AM - 6:00 PM",
        appointmentNotice: "Please arrive 10 minutes prior to your scheduled therapy session.",
        maintenanceMode: false,
        ...(req.body ?? {}),
      });
    }
    res.json({ success: true, data: updated, message: "Settings saved successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/settings/test-email", async (req, res, next) => {
  try {
    const targetEmail = String(req.body?.targetEmail || process.env.EMAIL_USER || "").trim();
    if (!targetEmail) {
      res.status(400).json({ success: false, message: "Target recipient email is required" });
      return;
    }

    await sendEmail({
      to: targetEmail,
      subject: "UDAI System Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #10b981; border-radius: 12px; max-width: 500px; margin: auto;">
          <h3 style="color: #059669; margin-top: 0;">✅ SMTP Email Service is Working!</h3>
          <p>This verification email was successfully dispatched from the UDAI Admin Settings diagnostic panel.</p>
          <p style="font-size: 13px; color: #64748b;">Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    res.json({ success: true, message: `Test email successfully dispatched to ${targetEmail}` });
  } catch (error) {
    console.error("Test email failed:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send test email" });
  }
});


