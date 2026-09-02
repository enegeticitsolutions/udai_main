import type { Request, Response } from "express";
import mongoose from "mongoose";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";

/**
 * Normalizes phone numbers to digits only
 */
function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/[^\d]/g, "");
}

/**
 * Extracts a value from multiple possible object keys
 */
function pickFirst(obj: Record<string, any>, ...keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== "") {
      if (typeof val === "string" && val.trim() !== "") return val.trim();
      if (typeof val === "number" || typeof val === "boolean") return String(val);
      if (typeof val === "object") {
        const inner = String(val.value ?? val.id ?? val.reference_id ?? val.transaction_id ?? val.order_id ?? "").trim();
        if (inner) return inner;
      }
    }
  }
  return "";
}

/**
 * Recursively searches or pulls fields from standard & nested MSG91 / WhatsApp webhook payloads
 */
function extractPaymentData(payload: any) {
  const body = payload || {};
  const data = body.data ?? body.payload ?? body.variables ?? body;
  const messages = body.data?.payload?.payload?.messages
    ?? body.entry?.[0]?.changes?.[0]?.value?.messages
    ?? body.messages
    ?? [];
  const message = messages[0] || {};
  const interactivePayment = message.interactive?.payment ?? message.payment ?? {};
  const orderDetails = message.order ?? {};

  // Extract phone number from all possible locations
  const rawPhone =
    pickFirst(
      data,
      "phoneNumber", "phone_number", "phone", "mobile", "mobileNumber", "customerPhone",
      "customer_phone", "sender", "from", "wa_id", "wa_number", "whatsapp_number", "customerNumber"
    ) ||
    pickFirst(body, "phone", "phoneNumber", "mobile", "from", "wa_id", "customerNumber") ||
    pickFirst(message, "from", "wa_id") ||
    "";

  const cleanPhone = normalizePhone(rawPhone);

  // Extract transaction ID / Payment reference
  const transactionId =
    pickFirst(
      data,
      "transaction_id", "transactionId", "txn_id", "txnId", "payment_id", "paymentId",
      "razorpay_payment_id", "gateway_payment_id", "reference_id", "ref_id", "requestId", "uuid"
    ) ||
    pickFirst(interactivePayment, "reference_id", "payment_id", "transaction_id") ||
    pickFirst(body, "transactionId", "transaction_id", "txnId", "paymentId", "requestId", "uuid") ||
    message.id ||
    "";

  // Extract order ID
  const orderId =
    pickFirst(
      data,
      "order_id", "orderId", "booking_id", "bookingId", "order_reference_id"
    ) ||
    pickFirst(orderDetails, "reference_id", "order_id") ||
    pickFirst(interactivePayment, "order_id") ||
    pickFirst(body, "orderId", "order_id", "bookingId", "booking_id") ||
    "";

  // Extract event / status
  const event =
    pickFirst(body, "event", "eventType", "type", "action") ||
    pickFirst(data, "event", "status", "payment_status", "order_status", "state") ||
    pickFirst(interactivePayment, "status", "payment_status") ||
    pickFirst(orderDetails, "status", "order_status") ||
    "";

  // Extract amount if present
  const amount =
    pickFirst(data, "amount", "order_amount", "paid_amount", "total_amount") ||
    pickFirst(interactivePayment, "amount") ||
    pickFirst(body, "amount") ||
    "";

  return {
    rawPhone,
    cleanPhone,
    transactionId,
    orderId,
    event,
    amount,
  };
}

/**
 * POST /api/msg91/payment-webhook
 * Handles MSG91 Native WhatsApp In-Chat Payment Webhooks
 */
export async function handleMsg91PaymentWebhook(req: Request, res: Response): Promise<void> {
  const payload = req.body;
  console.log("=================================================");
  console.log("💳 [MSG91 Payment Webhook] Received incoming payload:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("=================================================");

  try {
    const { cleanPhone, rawPhone, transactionId, orderId, event, amount } = extractPaymentData(payload);

    console.log(`🔍 [MSG91 Payment Webhook] Parsed Details:`, {
      phone: cleanPhone || rawPhone,
      transactionId,
      orderId,
      event,
      amount,
    });

    // Check if status/event indicates success or payment completed
    // (Common values: 'payment_success', 'PAID', 'paid', 'success', 'captured', 'completed', 'order_status: PAID', or native WhatsApp payment capture)
    const normalizedEvent = event.toLowerCase();
    const isPaymentSuccess =
      !event || // If generic webhook payload without event, treat received confirmation as success
      normalizedEvent.includes("success") ||
      normalizedEvent.includes("paid") ||
      normalizedEvent.includes("captured") ||
      normalizedEvent.includes("completed") ||
      normalizedEvent.includes("order_status: paid");

    if (!isPaymentSuccess && normalizedEvent.includes("failed")) {
      console.warn(`⚠️ [MSG91 Payment Webhook] Payment indicated failure or non-success state: ${event}`);
      res.status(200).json({ success: true, message: "Payment failure acknowledged" });
      return;
    }

    // Ensure MongoDB connection is active
    let db: any = null;
    try {
      await connectMongoDb();
      if (isMongoConnected()) {
        db = getMongoDb();
      } else if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        db = mongoose.connection.db;
      }
    } catch (dbConnErr: any) {
      console.warn("[MSG91 Payment Webhook] connectMongoDb fallback to mongoose connection:", dbConnErr.message);
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        db = mongoose.connection.db;
      }
    }

    if (!db) {
      console.error("🚨 [MSG91 Payment Webhook] Could not establish MongoDB database connection.");
      res.status(200).json({ success: true, message: "Database connection not ready, webhook acknowledged" });
      return;
    }

    const appointmentsCollection = db.collection("appointments");

    // Build phone matching patterns (e.g. 10 digits, +91, 91)
    const phoneVariants: string[] = [];
    if (cleanPhone) {
      phoneVariants.push(cleanPhone);
      if (cleanPhone.length === 10) {
        phoneVariants.push(`91${cleanPhone}`);
        phoneVariants.push(`+91${cleanPhone}`);
      } else if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
        phoneVariants.push(cleanPhone.slice(2));
        phoneVariants.push(`+${cleanPhone}`);
      }
    }
    if (rawPhone && !phoneVariants.includes(rawPhone)) {
      phoneVariants.push(rawPhone);
    }

    // 1. Build Query for finding the appointment
    const queryConditions: any[] = [];

    // If orderId or bookingId is present, prioritize finding by that exact ID
    if (orderId) {
      queryConditions.push({ bookingId: orderId });
      queryConditions.push({ orderId: orderId });
    }

    // If transactionId is present, check if appointment already has it
    if (transactionId) {
      queryConditions.push({ transactionId: transactionId });
    }

    // Match by phone number if available
    if (phoneVariants.length > 0) {
      queryConditions.push({ phoneNumber: { $in: phoneVariants } });
      queryConditions.push({ phone: { $in: phoneVariants } });
    }

    const searchQuery: Record<string, any> = {};

    if (queryConditions.length > 0) {
      searchQuery.$or = queryConditions;
    }

    // First try to find the latest appointment matching query where paymentStatus is 'pending'
    let appointment = await appointmentsCollection
      .find({
        ...searchQuery,
        paymentStatus: { $in: ["pending", "unpaid", "pending_payment", "created"] },
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(1)
      .next();

    // If no pending appointment found, find latest appointment for this phone/order regardless of status
    if (!appointment && queryConditions.length > 0) {
      appointment = await appointmentsCollection
        .find(searchQuery)
        .sort({ createdAt: -1, _id: -1 })
        .limit(1)
        .next();
    }

    const effectiveTxnId = transactionId || orderId || `TXN-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const nowDate = new Date();

    if (appointment) {
      const updateResult = await appointmentsCollection.updateOne(
        { _id: appointment._id },
        {
          $set: {
            paymentStatus: "completed",
            bookingStatus: "confirmed",
            transactionId: effectiveTxnId,
            ...(orderId ? { orderId } : {}),
            ...(amount ? { amountPaid: amount } : {}),
            paymentCompletedAt: nowIso,
            updatedAt: nowIso,
          },
        }
      );

      console.log(`✅ [MSG91 Payment Webhook] Updated appointment (${appointment._id || appointment.bookingId}):`, {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        paymentStatus: "completed",
        bookingStatus: "confirmed",
        transactionId: effectiveTxnId,
      });

      // Also sync updates to chatbotsubmissions collection if present
      try {
        const phone = appointment.phoneNumber || cleanPhone;
        if (phone) {
          await db.collection("chatbotsubmissions").updateMany(
            {
              $or: [
                { phone: { $in: phoneVariants } },
                { transactionId: appointment.bookingId || effectiveTxnId },
              ],
            },
            {
              $set: {
                paymentStatus: "completed",
                status: "confirmed",
                transactionId: effectiveTxnId,
                updatedAt: nowDate,
              },
            }
          );
        }
      } catch (syncErr: any) {
        console.warn("⚠️ [MSG91 Payment Webhook] chatbotsubmissions sync warning:", syncErr.message);
      }

      // Also sync to webhookmessages collection if present
      try {
        if (phoneVariants.length > 0) {
          await db.collection("webhookmessages").updateMany(
            { phone: { $in: phoneVariants } },
            {
              $set: {
                status: "confirmed",
                paymentStatus: "completed",
                updatedAt: nowDate,
              },
            }
          );
        }
      } catch (syncErr: any) {
        console.warn("⚠️ [MSG91 Payment Webhook] webhookmessages sync warning:", syncErr.message);
      }
    } else {
      console.warn(`⚠️ [MSG91 Payment Webhook] No matching appointment record found for query:`, searchQuery);
    }

    // Always return 200 OK to acknowledge MSG91 webhook
    res.status(200).json({
      success: true,
      message: appointment ? "Appointment payment marked as completed" : "Webhook received and logged",
      appointmentId: appointment?._id || appointment?.bookingId || null,
      transactionId: effectiveTxnId,
    });
  } catch (error: any) {
    console.error("❌ [MSG91 Payment Webhook] Error processing payment webhook:", error.message || error);
    // Still return 200 so MSG91 doesn't perpetually retry on uncaught format exceptions
    res.status(200).json({
      success: true,
      error: error.message || "Internal processing error acknowledged",
    });
  }
}
