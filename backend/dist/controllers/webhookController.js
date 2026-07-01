import mongoose from "mongoose";
import { ChatbotUser } from "../models/ChatbotUser.js";
import { sendWhatsAppText } from "../services/whatsappService.js";
import { appendRecord } from "../lib/fileStore.js";
import { config } from "../config.js";
import { saveMsg91Appointment } from "../services/msg91AppointmentService.js";
/**
 * Ensures Mongoose is connected to MongoDB.
 * Uses the same MONGODB_URI as the rest of the backend.
 */
async function ensureMongoose() {
    if (mongoose.connection.readyState === 1)
        return; // already connected
    const uri = config.mongoUri;
    if (!uri)
        throw new Error("MONGODB_URI not set");
    await mongoose.connect(uri, { dbName: config.mongoDbName });
    console.log("[Chatbot] Mongoose connected to MongoDB");
}
/**
 * POST /api/webhook
 * Receives incoming WhatsApp messages from MSG91 and drives the conversation flow.
 */
export async function handleWebhook(req, res) {
    // Acknowledge quickly so MSG91 doesn't retry
    res.status(200).json({ success: true });
    try {
        console.log("[Chatbot] Incoming webhook payload:", JSON.stringify(req.body, null, 2));
        // ── Parse MSG91 payload ─────────────────────────────────────────────────
        // MSG91 nests the message inside: data.payload.payload.messages[0]
        const entry = req.body?.data?.payload?.payload?.messages?.[0]
            ?? req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
            ?? null;
        if (!entry) {
            console.warn("[Chatbot] No message found in payload. Ignoring.");
            return;
        }
        const fromPhone = entry.from ?? entry.wa_id ?? "";
        const messageType = entry.type ?? "text";
        const incomingText = (entry.text?.body ?? entry.button?.text ?? "").trim();
        if (!fromPhone || messageType !== "text") {
            console.warn("[Chatbot] Non-text or missing sender. Ignoring.");
            return;
        }
        console.log(`[Chatbot] Message from ${fromPhone}: "${incomingText}"`);
        // ── Ensure DB connection ────────────────────────────────────────────────
        await ensureMongoose();
        // ── Find or create user session ────────────────────────────────────────
        let user = await ChatbotUser.findOne({ phone: fromPhone });
        if (!user) {
            // First time this number has messaged
            user = await ChatbotUser.create({ phone: fromPhone, step: "ask_name" });
        }
        // ── If user says "hi/hello/start", reset the flow ──────────────────────
        const lowerText = incomingText.toLowerCase();
        const isGreeting = ["hi", "hello", "hey", "start", "hii", "namaste"].includes(lowerText);
        if (isGreeting) {
            user.step = "ask_name";
            user.name = "";
            user.age = "";
            user.doctor = "";
            await user.save();
            await sendWhatsAppText(fromPhone, "Hello 👋 Welcome to *UDAI NGO*.\n\nWhat is your name?");
            return;
        }
        // ── Conversation state machine ─────────────────────────────────────────
        switch (user.step) {
            case "ask_name": {
                user.name = incomingText;
                user.step = "ask_age";
                await user.save();
                await sendWhatsAppText(fromPhone, `Nice to meet you, *${user.name}*! 😊\n\nHow old are you? (Please enter your age in years)`);
                break;
            }
            case "ask_age": {
                // Basic age validation
                const age = parseInt(incomingText, 10);
                if (isNaN(age) || age < 1 || age > 120) {
                    await sendWhatsAppText(fromPhone, "Please enter a valid age (e.g., 25).");
                    break;
                }
                user.age = incomingText;
                user.step = "ask_doctor";
                await user.save();
                await sendWhatsAppText(fromPhone, `Thank you! 🙏\n\nWhich department or doctor would you like to consult?\n\n` +
                    `*Available Departments:*\n` +
                    `• Occupational Therapy\n` +
                    `• Speech Therapy\n` +
                    `• Special Education\n` +
                    `• Counselling\n` +
                    `• Physical Therapy\n\n` +
                    `Please type the department name.`);
                break;
            }
            case "ask_doctor": {
                user.doctor = incomingText;
                user.step = "completed";
                await user.save();
                console.log(`[Chatbot] Appointment request saved for ${fromPhone}:`, {
                    name: user.name,
                    age: user.age,
                    doctor: user.doctor,
                });
                // Store as a formal inquiry in the DB for the Appointments dashboard
                try {
                    await appendRecord("therapist-inquiries.json", {
                        childName: user.name,
                        parent: user.name,
                        email: "N/A (WhatsApp)",
                        phone: fromPhone,
                        appointmentDate: "",
                        appointmentTime: "",
                        department: user.doctor,
                        concern: `WhatsApp Chatbot Booking. Age: ${user.age}`,
                        source: "WhatsApp",
                        status: "new",
                    });
                    console.log(`[Chatbot] Synced appointment to therapistInquiries collection.`);
                }
                catch (err) {
                    console.error("[Chatbot] Failed to store inquiry:", err);
                }
                try {
                    await saveMsg91Appointment({
                        patient_name: user.name,
                        phone_number: fromPhone,
                        age: Number(user.age),
                        gender: "Not provided",
                        city: "Not provided",
                        preferred_language: "Not provided",
                        therapist_name: user.doctor,
                        appointment_date: new Date().toISOString().slice(0, 10),
                        appointment_time: "12:00",
                        appointment_type: "In-Person",
                        main_concern: `WhatsApp chatbot booking for ${user.doctor}`,
                        concern_description: `Appointment request submitted through WhatsApp chatbot. Age: ${user.age}`,
                        additional_notes: "Date and time require admin confirmation.",
                        payment_status: "pending",
                        booking_status: "pending",
                    });
                    console.log(`[Chatbot] Synced appointment to appointments collection.`);
                }
                catch (err) {
                    console.error("[Chatbot] Failed to store appointment:", err);
                }
                await sendWhatsAppText(fromPhone, `✅ *Appointment Request Submitted!*\n\n` +
                    `*Name:* ${user.name}\n` +
                    `*Age:* ${user.age}\n` +
                    `*Department:* ${user.doctor}\n\n` +
                    `Our team will contact you shortly to confirm your appointment.\n\n` +
                    `Thank you for trusting *UDAI NGO*! ❤️\n\n` +
                    `Send "Hi" anytime to start a new request.`);
                break;
            }
            case "completed": {
                await sendWhatsAppText(fromPhone, `Your previous appointment request has already been submitted. ✅\n\n` +
                    `Send *"Hi"* to submit a new request.`);
                break;
            }
            default:
                console.warn("[Chatbot] Unknown step:", user.step);
        }
    }
    catch (error) {
        console.error("[Chatbot] Webhook handler error:", error.message || error);
    }
}
/**
 * GET /api/webhook
 * Webhook verification endpoint for MSG91 (if required).
 */
export function verifyWebhook(req, res) {
    const challenge = req.query["hub.challenge"] ?? "ok";
    res.status(200).send(String(challenge));
}
