import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { handleWebhook, verifyWebhook } from "../controllers/webhookController.js";
import { WebhookMessage } from "../models/WebhookMessage.js";

const webhookRouter = Router();

// GET  /api/webhook  — verification ping (MSG91 / Meta)
webhookRouter.get("/", verifyWebhook);

// POST /api/webhook  — incoming WhatsApp messages
webhookRouter.post("/", handleWebhook);

// GET /api/webhook/messages — fetch all saved webhook messages
webhookRouter.get("/messages", async (_req: Request, res: Response) => {
  try {
    const messages = await WebhookMessage.find().sort({ receivedAt: -1 }).lean();
    res.json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    console.error("❌ Fetch Webhook Messages Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// PATCH /api/webhook/messages/:id — update status or appointment details
webhookRouter.patch("/messages/:id", async (req: Request, res: Response) => {
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
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }

    const db = mongoose.connection.db;
    if (db && updated.phone) {
      const cleanPhone = updated.phone.replace(/[^\d]/g, "");
      const phoneQueries = [updated.phone, cleanPhone];
      if (cleanPhone.length === 10) {
        phoneQueries.push(`91${cleanPhone}`, `+91${cleanPhone}`);
      }

      // Sync to chatbotsubmissions
      try {
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
      } catch (syncErr: any) {
        console.warn("Could not sync to chatbotsubmissions:", syncErr.message);
      }

      // Sync to appointments collection
      try {
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
      } catch (aptSyncErr: any) {
        console.warn("Could not sync to appointments collection:", aptSyncErr.message);
      }
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("❌ Update Webhook Message Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update record" });
  }
});

// DELETE /api/webhook/messages/:id — remove record
webhookRouter.delete("/messages/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await WebhookMessage.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }
    res.json({ success: true, message: "Record deleted successfully" });
  } catch (error: any) {
    console.error("❌ Delete Webhook Message Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete record" });
  }
});

export default webhookRouter;
