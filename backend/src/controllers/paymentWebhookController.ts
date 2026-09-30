import { Request, Response } from "express";
import crypto from "node:crypto";
import { getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

/**
 * POST /api/payment-webhook
 * Handles Razorpay webhook events, verifies HMAC-SHA256 signature,
 * and updates appointment booking records on `payment_link.paid`.
 */
export async function handlePaymentWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Verify x-razorpay-signature using crypto HMAC-SHA256 and process.env.RAZORPAY_WEBHOOK_SECRET
    if (webhookSecret) {
      if (!signature) {
        console.warn("⚠️ [Payment Webhook] Missing x-razorpay-signature header");
        res.status(400).json({ success: false, message: "Missing x-razorpay-signature header" });
        return;
      }

      const rawPayload =
        (req as any).rawBody ||
        (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawPayload)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("⚠️ [Payment Webhook] Razorpay signature mismatch! Expected:", expectedSignature, "Received:", signature);
        res.status(400).json({ success: false, message: "Invalid signature" });
        return;
      }
      console.log("✅ [Payment Webhook] Razorpay signature verified successfully");
    } else {
      console.warn("⚠️ [Payment Webhook] process.env.RAZORPAY_WEBHOOK_SECRET is not configured; skipping signature verification");
    }

    const event = req.body?.event;
    console.log(`🔔 [Payment Webhook] Received Razorpay event: "${event}"`);

    // 2. On payment_link.paid, find the booking by ID from notes and update paymentStatus to 'complete', bookingStatus to 'confirmed', and store the transaction ID
    if (event === "payment_link.paid" || event === "payment.captured") {
      const paymentLinkEntity = req.body?.payload?.payment_link?.entity;
      const paymentEntity = req.body?.payload?.payment?.entity;

      const notes = paymentLinkEntity?.notes || paymentEntity?.notes || req.body?.notes || {};
      const bookingId = String(notes.bookingId || notes.booking_id || "").trim();

      const transactionId = String(
        paymentEntity?.id ||
        paymentLinkEntity?.payment_id ||
        paymentLinkEntity?.id ||
        ""
      ).trim();

      const paymentLinkId = String(paymentLinkEntity?.id || "").trim();

      console.log(`[Payment Webhook] Booking ID from notes: "${bookingId}", Transaction ID: "${transactionId}"`);

      if (!bookingId) {
        console.warn("⚠️ [Payment Webhook] No bookingId found in notes:", notes);
        res.status(200).json({ success: true, message: "Webhook received but no bookingId found in notes" });
        return;
      }

      const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
      if (db) {
        const nowIso = new Date().toISOString();
        const nowDate = new Date();

        const queryConditions: any[] = [
          { bookingId: bookingId },
          { id: bookingId },
        ];
        if (ObjectId.isValid(bookingId)) {
          queryConditions.push({ _id: new ObjectId(bookingId) });
        }

        const appointment = await db.collection("appointments").findOne({ $or: queryConditions });

        if (appointment) {
          // Update ONLY this single appointment record
          await db.collection("appointments").updateOne(
            { _id: appointment._id },
            {
              $set: {
                paymentStatus: "complete",
                bookingStatus: "confirmed",
                transactionId: transactionId || appointment.transactionId,
                paymentCompletedAt: nowIso,
                updatedAt: nowIso,
                ...(paymentLinkId ? { paymentLinkId } : {}),
              },
            }
          );
          console.log(`✅ [Payment Webhook] Successfully updated booking (${appointment.bookingId || appointment._id}) -> paymentStatus: 'complete', bookingStatus: 'confirmed', transactionId: '${transactionId}'`);

          // Sync to webhookmessages collection for this specific booking
          try {
            const whQuery: any[] = [
              { bookingId: bookingId },
              { "rawData.bookingId": bookingId },
            ];
            if (ObjectId.isValid(bookingId)) {
              whQuery.push({ _id: new ObjectId(bookingId) });
            }
            const targetWh = await db.collection("webhookmessages").findOne({ $or: whQuery });
            if (targetWh) {
              await db.collection("webhookmessages").updateOne(
                { _id: targetWh._id },
                {
                  $set: {
                    paymentStatus: "complete",
                    status: "confirmed",
                    bookingStatus: "confirmed",
                    transactionId: transactionId || targetWh.transactionId,
                    updatedAt: nowDate,
                  },
                }
              );
              console.log(`✅ [Payment Webhook] Synced specific webhook message record (_id: ${targetWh._id})`);
            }
          } catch (whErr: any) {
            console.warn("⚠️ [Payment Webhook] webhookmessages sync warning:", whErr.message);
          }

          // Sync to chatbotsubmissions collection for this specific transaction
          try {
            await db.collection("chatbotsubmissions").updateOne(
              { transactionId: bookingId },
              {
                $set: {
                  paymentStatus: "complete",
                  status: "confirmed",
                  bookingStatus: "confirmed",
                  transactionId: transactionId || bookingId,
                  updatedAt: nowDate,
                },
              }
            );
            console.log(`✅ [Payment Webhook] Synced specific chatbotsubmissions record (${bookingId})`);
          } catch (chatErr: any) {
            console.warn("⚠️ [Payment Webhook] chatbotsubmissions sync warning:", chatErr.message);
          }
        } else {
          console.warn(`⚠️ [Payment Webhook] No appointment found matching bookingId: "${bookingId}"`);
        }
      } else {
        console.warn("⚠️ [Payment Webhook] MongoDB is not connected; unable to update appointment");
      }
    }

    res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (err: any) {
    console.error("❌ [Payment Webhook] Error:", err?.message || err);
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
}
