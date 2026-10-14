import { Router } from "express";
import { bulkUpsertSchedules, createSchedule, deleteSchedule, getReservedSlotsForDate, listSchedules, updateSchedule, verifyParent, getDayOfWeekFromDate, } from "../services/scheduleService.js";
import { getAvailableSlots } from "../services/bookingService.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
export const schedulesRouter = Router();
/**
 * GET /api/schedules
 * List all schedules with search and filters.
 */
schedulesRouter.get("/", async (req, res) => {
    try {
        const { search, therapist_id, therapy_type, day_of_week, status } = req.query;
        const schedules = await listSchedules({
            search: search ? String(search) : undefined,
            therapist_id: therapist_id ? String(therapist_id) : undefined,
            therapy_type: therapy_type ? String(therapy_type) : undefined,
            day_of_week: day_of_week ? String(day_of_week) : undefined,
            status: status ? String(status) : undefined,
        });
        res.status(200).json({
            success: true,
            count: schedules.length,
            data: schedules,
        });
    }
    catch (err) {
        console.error("[Schedules] GET error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to list schedules" });
    }
});
/**
 * POST /api/schedules
 * Insert a new child schedule row.
 */
schedulesRouter.post("/", async (req, res) => {
    try {
        const { child_name, parent_phone, therapist_id, therapy_type, recurring_slots, status, notes } = req.body;
        if (!child_name || !parent_phone) {
            return res.status(400).json({ success: false, message: "child_name and parent_phone are required" });
        }
        const created = await createSchedule({
            child_name,
            parent_phone,
            therapist_id: therapist_id || "Ms. Nikki",
            therapy_type: therapy_type || "Occupational Therapy",
            recurring_slots: Array.isArray(recurring_slots) && recurring_slots.length > 0 ? recurring_slots : [
                { day_of_week: "Monday", start_time: "10:00", end_time: "10:45" },
            ],
            status: status || "ACTIVE",
            notes,
        });
        res.status(201).json({
            success: true,
            data: created,
            message: "Child schedule created successfully",
        });
    }
    catch (err) {
        console.error("[Schedules] POST error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to create schedule" });
    }
});
/**
 * PATCH /api/schedules/:id
 * Granular inline cell update ({ [fieldName]: updatedValue }).
 */
schedulesRouter.patch("/:id", async (req, res) => {
    try {
        const id = String(req.params.id || "");
        if (!id) {
            return res.status(400).json({ success: false, message: "Schedule ID is required" });
        }
        const updated = await updateSchedule(id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Schedule not found" });
        }
        res.status(200).json({
            success: true,
            data: updated,
            message: "Schedule updated successfully",
        });
    }
    catch (err) {
        console.error("[Schedules] PATCH error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to update schedule" });
    }
});
/**
 * DELETE /api/schedules/:id
 * Remove a child's record.
 */
schedulesRouter.delete("/:id", async (req, res) => {
    try {
        const id = String(req.params.id || "");
        await deleteSchedule(id);
        res.status(200).json({
            success: true,
            message: "Child schedule deleted successfully",
        });
    }
    catch (err) {
        console.error("[Schedules] DELETE error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to delete schedule" });
    }
});
/**
 * POST /api/schedules/bulk
 * Batch upload / upsert array of child records.
 */
schedulesRouter.post("/bulk", async (req, res) => {
    try {
        const rows = Array.isArray(req.body) ? req.body : req.body.rows || [];
        if (!rows.length) {
            return res.status(400).json({ success: false, message: "No schedule rows provided" });
        }
        const inserted = await bulkUpsertSchedules(rows);
        res.status(200).json({
            success: true,
            count: inserted.length,
            data: inserted,
            message: `Successfully processed ${inserted.length} recurring schedules`,
        });
    }
    catch (err) {
        console.error("[Schedules] BULK error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to bulk upload schedules" });
    }
});
/**
 * Anti-collision slot engine router
 */
export const slotsRouter = Router();
/**
 * GET /api/slots/available?date=YYYY-MM-DD&therapist_id=...
 * Slot Availability & Anti-Collision Engine:
 * Exclude/suppress all reserved slots from returning schedules.
 */
slotsRouter.get("/available", async (req, res) => {
    try {
        const rawDate = String(req.query.date || "").trim();
        const therapistId = req.query.therapist_id ? String(req.query.therapist_id).trim() : "";
        const department = req.query.department ? String(req.query.department).trim() : "OT";
        if (!rawDate) {
            return res.status(400).json({ success: false, message: "Date is required (YYYY-MM-DD)" });
        }
        const dayOfWeek = getDayOfWeekFromDate(rawDate);
        if (!dayOfWeek || dayOfWeek === "Sunday") {
            return res.status(200).json({
                success: true,
                date: rawDate,
                day_of_week: dayOfWeek || "Sunday",
                therapist_id: therapistId,
                message: "Clinic is closed on Sundays",
                reserved_slots: [],
                available_slots: [],
            });
        }
        // 1. Fetch reserved slots for active recurring schedules
        const reserved = await getReservedSlotsForDate(rawDate, therapistId);
        const reservedTimes = new Set(reserved.map((r) => r.start_time));
        // 2. Fetch general available clinical slots from bookingService
        const candidateSlots = await getAvailableSlots(department, rawDate);
        // 3. Exclude reserved slots so new intake appointments cannot book over existing children
        const filteredSlots = candidateSlots.filter((slot) => !reservedTimes.has(slot.time));
        res.status(200).json({
            success: true,
            date: rawDate,
            day_of_week: dayOfWeek,
            therapist_id: therapistId,
            reserved_slots: Array.from(reservedTimes),
            reserved_details: reserved,
            available_slots: filteredSlots,
            count: filteredSlots.length,
        });
    }
    catch (err) {
        console.error("[Slots Engine] Error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to calculate slot availability" });
    }
});
/**
 * WhatsApp parent verification & confirmation router
 */
export const whatsappParentRouter = Router();
/**
 * GET & POST /api/whatsapp/verify-parent
 * Verifies incoming parent phone and returns recurring slot menu & is_frequent status for MSG91.
 */
whatsappParentRouter.all(["/verify-parent", "/check-frequent", "/verify-frequent"], async (req, res) => {
    try {
        const b = req.body || {};
        const q = req.query || {};
        const phone = b.phone || b.phoneNumber || b.sender || b.customerNumber || b.customer_number || b.mobile || b.wa_id ||
            q.phone || q.phoneNumber || q.sender || q.customerNumber || q.customer_number || q.mobile ||
            b.data?.phone || b.data?.sender || b.data?.phoneNumber || b.variables?.phone || b.variables?.sender;
        if (!phone) {
            return res.status(200).json({
                success: true,
                isReturningParent: false,
                is_frequent: false,
                isFrequent: false,
                message: "No phone parameter provided",
            });
        }
        const verification = await verifyParent(String(phone));
        res.status(200).json({
            success: true,
            ...verification,
            data: {
                success: true,
                ...verification,
            },
        });
    }
    catch (err) {
        console.error("[WhatsApp Verify] Error:", err);
        res.status(500).json({ success: false, is_frequent: false, message: err.message || "Failed to verify parent" });
    }
});
/**
 * POST /api/whatsapp/confirm-weekly
 * One-click batch confirmation of weekly recurring appointments.
 */
whatsappParentRouter.post("/confirm-weekly", async (req, res) => {
    try {
        const phone = req.body.phone || req.body.phoneNumber || req.body.mobile;
        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }
        const verification = await verifyParent(phone);
        if (!verification.isReturningParent) {
            return res.status(404).json({ success: false, message: "No active recurring schedule found for this phone" });
        }
        // Create confirmed WebhookMessage / appointment record for the weekly schedule
        const slots = verification.recurring_slots || [];
        const appointmentRecords = [];
        for (const slot of slots) {
            const record = {
                patientName: verification.child_name,
                childName: verification.child_name,
                phone: verification.parent_phone,
                department: verification.therapy_type,
                assignedTherapist: verification.therapist_id,
                appointmentTime: slot.start_time,
                status: "confirmed",
                dayOfWeek: slot.day_of_week,
                notes: `Weekly recurring appointment confirmation (${slot.day_of_week} ${slot.start_time})`,
                createdAt: new Date(),
            };
            try {
                await WebhookMessage.create({
                    rawData: { source: "recurring_weekly_confirm", slot },
                    phone: verification.parent_phone,
                    childName: verification.child_name,
                    parentName: "Parent of " + verification.child_name,
                    department: verification.therapy_type,
                    assignedTherapist: verification.therapist_id,
                    appointmentTime: slot.start_time,
                    status: "confirmed",
                    bookingSource: "whatsapp_recurring",
                });
            }
            catch (logErr) {
                // Continue even if logging fails
            }
            appointmentRecords.push(record);
        }
        res.status(200).json({
            success: true,
            message: `Successfully confirmed ${slots.length} recurring session(s) for ${verification.child_name}`,
            child_name: verification.child_name,
            confirmed_slots: slots,
            bot_response: `Thank you! ${verification.child_name}'s sessions for this week (${verification.slots_summary}) are all confirmed. We look forward to seeing you at UDAI!`,
        });
    }
    catch (err) {
        console.error("[WhatsApp Confirm Weekly] Error:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to confirm weekly appointments" });
    }
});
