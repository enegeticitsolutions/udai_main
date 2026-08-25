import { Router } from "express";
import { saveMsg91Appointment } from "../services/msg91AppointmentService.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
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
        const { appointment, duplicate, isPreliminary } = await saveMsg91Appointment(req.body);
        if (isPreliminary) {
            res.status(200).json({ success: true, message: "Service selection acknowledged" });
            return;
        }
        console.info(`[MSG91 appointment webhook] ${duplicate ? "Duplicate ignored" : "Booking saved"}: ${appointment.bookingId}`);
        // Save to WebhookMessage for the WhatsApp Messages dashboard
        try {
            await WebhookMessage.create({
                rawData: req.body,
                phone: appointment.phoneNumber || "",
                childName: appointment.patientName || "",
                parentName: appointment.parentName || appointment.patientName || "",
                age: appointment.age !== undefined && appointment.age !== null ? String(appointment.age) : "",
                firstSession: "",
                appointmentDate: appointment.appointmentDate || "",
                appointmentTime: appointment.appointmentTime || "",
                department: appointment.therapistName || "",
                concern: appointment.mainConcern || "",
                assignedTherapist: appointment.therapistName || "",
                assignedTherapistId: appointment.therapistId || "",
                status: "confirmed",
                bookingSource: "whatsapp",
            });
            console.log(`[MSG91 appointment webhook] Logged appointment payload to WebhookMessage`);
        }
        catch (dbErr) {
            console.error("[MSG91 appointment webhook] Failed to log WebhookMessage:", dbErr.message);
        }
        res.status(200).json({
            success: true,
            status: "success",
            data: appointment,
            message: duplicate ? "Duplicate booking already recorded" : "Booking saved successfully",
        });
    }
    catch (error) {
        console.warn("[MSG91 appointment webhook] Gracefully handled payload error:", error.message || error);
        res.status(200).json({
            success: true,
            status: "success",
            message: "Request processed",
        });
    }
});
export default msg91WebhookRouter;
