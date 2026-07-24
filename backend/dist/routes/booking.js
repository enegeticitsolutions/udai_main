/**
 * booking.ts — Public booking availability endpoints
 *
 * GET /api/booking/available-dates?department=Speech+Therapy
 * GET /api/booking/available-slots?department=Speech+Therapy&date=YYYY-MM-DD
 */
import { Router } from "express";
import { getAvailableDates, getAvailableSlots, getDepartments, normalizeDepartment } from "../services/bookingService.js";
const bookingRouter = Router();
/**
 * GET /api/booking/departments
 *
 * Returns a list of unique departments of active therapists.
 */
bookingRouter.get("/departments", async (_req, res) => {
    try {
        const departments = await getDepartments();
        res.json({
            success: true,
            count: departments.length,
            departments,
        });
    }
    catch (error) {
        console.error("[GET /api/booking/departments] Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch departments." });
    }
});
/**
 * GET /api/booking/available-dates
 *
 * Query params:
 *   department  (required) — e.g. "Speech Therapy"
 *
 * Returns array of YYYY-MM-DD strings that have ≥1 available slot.
 */
bookingRouter.get("/available-dates", async (req, res) => {
    try {
        const rawDept = String(req.query.department ?? "").trim();
        if (!rawDept) {
            res.status(400).json({
                success: false,
                message: "Query parameter 'department' is required.",
            });
            return;
        }
        const normalizedDept = normalizeDepartment(rawDept);
        const dates = await getAvailableDates(normalizedDept);
        res.json({
            success: true,
            department: normalizedDept,
            count: dates.length,
            dates,
        });
    }
    catch (error) {
        console.error("[GET /api/booking/available-dates] Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch available dates." });
    }
});
/**
 * GET /api/booking/available-slots
 *
 * Query params:
 *   department  (required) — e.g. "Speech Therapy"
 *   date        (required) — YYYY-MM-DD
 *
 * Returns array of slot objects:
 *   { time, label, totalTherapists, bookedCount, availableCount, isAvailable }
 */
bookingRouter.get("/available-slots", async (req, res) => {
    try {
        const rawDept = String(req.query.department ?? "").trim();
        const dateInput = String(req.query.date ?? "").trim();
        if (!rawDept || !dateInput) {
            res.status(400).json({
                success: false,
                message: "Query parameters 'department' and 'date' are required.",
            });
            return;
        }
        let extractedDate = "";
        // 1. Try to extract first YYYY-MM-DD pattern
        const dateMatch = dateInput.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
            extractedDate = dateMatch[0];
        }
        else {
            // 2. Try to parse "dd MMM" or "dd Month" pattern
            const textMatch = dateInput.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
            if (textMatch) {
                const dayNumber = Number(textMatch[1]);
                const monthStr = textMatch[2].toLowerCase();
                const monthMap = {
                    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
                    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
                };
                const monthNumber = monthMap[monthStr];
                if (monthNumber) {
                    const kolkataTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
                    const currentYear = new Date(kolkataTime).getFullYear();
                    const monthPart = String(monthNumber).padStart(2, "0");
                    const dayPart = String(dayNumber).padStart(2, "0");
                    extractedDate = `${currentYear}-${monthPart}-${dayPart}`;
                }
            }
        }
        if (!extractedDate) {
            res.status(400).json({
                success: false,
                message: "Invalid date format. Use YYYY-MM-DD.",
            });
            return;
        }
        const normalizedDept = normalizeDepartment(rawDept);
        const slots = await getAvailableSlots(normalizedDept, extractedDate);
        const mappedSlots = slots.map((s) => ({
            title: s.label,
            value: s.time,
        }));
        if (mappedSlots.length === 0) {
            res.status(404).json({
                success: false,
                department: normalizedDept,
                date: extractedDate,
                slots: [],
                message: "No appointment slots are available for the selected date.",
            });
            return;
        }
        const visibleSlots = mappedSlots.slice(0, 8);
        res.json({
            success: true,
            department: normalizedDept,
            date: extractedDate,
            slots: visibleSlots,
        });
    }
    catch (error) {
        console.error("[GET /api/booking/available-slots] Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch available slots." });
    }
});
export default bookingRouter;
