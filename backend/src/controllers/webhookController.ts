import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ChatbotUser } from "../models/ChatbotUser.js";
import { sendWhatsAppText } from "../services/whatsappService.js";
import { config } from "../config.js";

/**
 * Ensures Mongoose is connected to MongoDB.
 * Uses the same MONGODB_URI as the rest of the backend.
 */
async function ensureMongoose(): Promise<void> {
  if (mongoose.connection.readyState === 1) return; // already connected

  const uri = config.mongoUri;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri, { dbName: config.mongoDbName });
  console.log("[Chatbot] Mongoose connected to MongoDB");
}

/**
 * POST /api/webhook
 * Receives incoming WhatsApp messages from MSG91 and drives the conversation flow.
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
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

    const fromPhone: string = entry.from ?? entry.wa_id ?? "";
    const messageType: string = entry.type ?? "text";
    const incomingText: string = (
      entry.text?.body ?? entry.button?.text ?? ""
    ).trim();

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

      await sendWhatsAppText(
        fromPhone,
        "Hello 👋 Welcome to *UDAI NGO*.\n\nWhat is your name?"
      );
      return;
    }

    // ── Conversation state machine ─────────────────────────────────────────
    switch (user.step) {
      case "ask_name": {
        user.name = incomingText;
        user.step = "ask_age";
        await user.save();

        await sendWhatsAppText(
          fromPhone,
          `Nice to meet you, *${user.name}*! 😊\n\nHow old are you? (Please enter your age in years)`
        );
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

        await sendWhatsAppText(
          fromPhone,
          `Thank you! 🙏\n\nWhich department or doctor would you like to consult?\n\n` +
          `*Available Departments:*\n` +
          `• Occupational Therapy\n` +
          `• Speech Therapy\n` +
          `• Special Education\n` +
          `• Counselling\n` +
          `• Physical Therapy\n\n` +
          `Please type the department name.`
        );
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

        await sendWhatsAppText(
          fromPhone,
          `✅ *Appointment Request Submitted!*\n\n` +
          `*Name:* ${user.name}\n` +
          `*Age:* ${user.age}\n` +
          `*Department:* ${user.doctor}\n\n` +
          `Our team will contact you shortly to confirm your appointment.\n\n` +
          `Thank you for trusting *UDAI NGO*! ❤️\n\n` +
          `Send "Hi" anytime to start a new request.`
        );
        break;
      }

      case "completed": {
        await sendWhatsAppText(
          fromPhone,
          `Your previous appointment request has already been submitted. ✅\n\n` +
          `Send *"Hi"* to submit a new request.`
        );
        break;
      }

      default:
        console.warn("[Chatbot] Unknown step:", user.step);
    }
  } catch (error: any) {
    console.error("[Chatbot] Webhook handler error:", error.message || error);
  }
}

/**
 * GET /api/webhook
 * Webhook verification endpoint for MSG91 (if required).
 */
export function verifyWebhook(req: Request, res: Response): void {
  const challenge = req.query["hub.challenge"] ?? "ok";
  res.status(200).send(String(challenge));
}
