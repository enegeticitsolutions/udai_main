import { Router } from "express";
import mongoose from "mongoose";
import { ChatbotUser } from "../models/ChatbotUser.js";
import { appendRecord } from "../lib/fileStore.js";
import { config } from "../config.js";

const msg91BookingRouter = Router();

/**
 * Ensures Mongoose is connected (reuses existing connection if open).
 */
async function ensureMongoose(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const uri = config.mongoUri;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri, { dbName: config.mongoDbName });
  console.log("[MSG91-Booking] Mongoose connected to MongoDB");
}

/**
 * POST /api/msg91-booking
 *
 * Called by MSG91 Webhook Node at the end of the WhatsApp chatbot flow.
 * MSG91 sends the collected booking variables (name, phone, date, time, doctor)
 * in the request body.
 *
 * This endpoint:
 *   1. Saves/updates the user in `chatbotusers` collection (WhatsApp Bookings tab)
 *   2. Creates a formal inquiry in `therapistInquiries` collection (Appointments tab)
 */
msg91BookingRouter.post("/", async (req, res) => {
  try {
    console.log("[MSG91-Booking] Incoming payload:", JSON.stringify(req.body, null, 2));

    const { name, phone, date, time, doctor, age } = req.body;

    if (!phone) {
      res.status(400).json({ success: false, message: "Phone number is required" });
      return;
    }

    await ensureMongoose();

    // ── 1. Save/update in chatbotusers collection (for WhatsApp Bookings page) ──
    const existing = await ChatbotUser.findOne({ phone });

    if (existing) {
      existing.name = name || existing.name;
      existing.age = age || existing.age;
      existing.doctor = doctor || existing.doctor;
      existing.step = "completed";
      await existing.save();
    } else {
      await ChatbotUser.create({
        phone,
        name: name || "",
        age: age || "",
        doctor: doctor || "",
        step: "completed",
      });
    }

    // ── 2. Also create a formal appointment inquiry (for Appointments page) ──
    await appendRecord("therapist-inquiries.json", {
      childName: name || "N/A",
      parent: name || "N/A",
      email: "N/A (WhatsApp)",
      phone: phone,
      appointmentDate: date || "",
      appointmentTime: time || "",
      department: doctor || "",
      concern: `WhatsApp Chatbot Booking via MSG91.${age ? ` Age: ${age}` : ""}`,
      status: "new",
    });

    console.log(`[MSG91-Booking] Booking saved for ${phone} — ${name}`);

    res.json({ success: true, message: "Booking saved successfully" });
  } catch (error: any) {
    console.error("[MSG91-Booking] Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to save booking" });
  }
});

export default msg91BookingRouter;
