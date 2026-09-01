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
    const { status, appointmentDate, appointmentTime, assignedTherapist, concern, childName, parentName, age } = req.body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (appointmentDate !== undefined) updateData.appointmentDate = appointmentDate;
    if (appointmentTime !== undefined) updateData.appointmentTime = appointmentTime;
    if (assignedTherapist !== undefined) updateData.assignedTherapist = assignedTherapist;
    if (concern !== undefined) updateData.concern = concern;
    if (childName !== undefined) updateData.childName = childName;
    if (parentName !== undefined) updateData.parentName = parentName;
    if (age !== undefined) updateData.age = String(age);

    const updated = await WebhookMessage.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updated) {
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }

    if (updated.phone) {
      try {
        const db = mongoose.connection.db;
        if (db) {
          await db.collection("chatbotsubmissions").updateMany(
            { phone: updated.phone },
            {
              $set: {
                status: updated.status,
                "userDetails.appointmentDate": updated.appointmentDate,
                "userDetails.appointmentTime": updated.appointmentTime,
                "userDetails.name": updated.childName,
                "userDetails.parentName": updated.parentName,
                assignedTherapist: updated.assignedTherapist,
                updatedAt: new Date(),
              },
            }
          );
        }
      } catch (syncErr: any) {
        console.warn("Could not sync to chatbotsubmissions:", syncErr.message);
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
