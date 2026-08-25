import { Router } from "express";
import { getAvailableSlotsForDate, seedTherapistSlots } from "../services/slotService.js";
const appointmentRouter = Router();
/**
 * POST /api/appointments/available-slots
 * Queries available 10 slots for MSG91 WhatsApp Bot flows
 */
appointmentRouter.post("/available-slots", async (req, res, next) => {
    try {
        const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {});
        const appointmentDate = String(data.appointment_date ?? data.appointmentDate ?? data.date ?? req.query.date ?? "").trim();
        const therapistId = String(data.therapist_id ?? data.therapistId ?? req.query.therapist_id ?? "").trim();
        const result = await getAvailableSlotsForDate(appointmentDate, therapistId);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/appointments/seed-slots
 * Helper endpoint to trigger slot seeding on demand
 */
appointmentRouter.post("/seed-slots", async (_req, res, next) => {
    try {
        const result = await seedTherapistSlots();
        res.status(200).json({ success: true, message: "Slots seeded successfully", data: result });
    }
    catch (error) {
        next(error);
    }
});
export default appointmentRouter;
