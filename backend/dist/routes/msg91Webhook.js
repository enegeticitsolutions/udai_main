import { Router } from "express";
import { MongoServerError } from "mongodb";
import { ZodError } from "zod";
import { saveMsg91Appointment } from "../services/msg91AppointmentService.js";
const msg91WebhookRouter = Router();
msg91WebhookRouter.post("/", async (req, res) => {
    console.info("[MSG91 appointment webhook] Incoming payload:", JSON.stringify(req.body));
    try {
        const configuredSecret = process.env.MSG91_WEBHOOK_SECRET?.trim();
        const receivedSecret = String(req.header("x-msg91-webhook-secret") ?? req.header("x-webhook-secret") ?? "");
        if (configuredSecret && receivedSecret !== configuredSecret) {
            console.warn("[MSG91 appointment webhook] Rejected request with invalid webhook secret");
            res.status(401).json({ success: false, message: "Invalid webhook secret" });
            return;
        }
        const { appointment, duplicate } = await saveMsg91Appointment(req.body);
        console.info(`[MSG91 appointment webhook] ${duplicate ? "Duplicate ignored" : "Booking saved"}: ${appointment.bookingId}`);
        res.status(duplicate ? 200 : 201).json({
            success: true,
            data: appointment,
            message: duplicate ? "Duplicate booking already recorded" : "Booking saved successfully",
        });
    }
    catch (error) {
        if (error instanceof ZodError) {
            console.warn("[MSG91 appointment webhook] Validation failed:", error.flatten());
            res.status(422).json({ success: false, message: "Invalid booking payload", errors: error.flatten().fieldErrors });
            return;
        }
        if (error instanceof MongoServerError && error.code === 11000) {
            console.info("[MSG91 appointment webhook] Duplicate booking ignored after concurrent delivery");
            res.status(200).json({ success: true, message: "Duplicate booking already recorded" });
            return;
        }
        console.error("[MSG91 appointment webhook] Database save failed:", error);
        res.status(500).json({ success: false, message: "Failed to save booking" });
    }
});
export default msg91WebhookRouter;
