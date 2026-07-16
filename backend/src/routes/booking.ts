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
  } catch (error) {
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
  } catch (error) {
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

    // Extract first YYYY-MM-DD pattern
    const dateMatch = dateInput.match(/\d{4}-\d{2}-\d{2}/);
    if (!dateMatch) {
      res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
      return;
    }
    const extractedDate = dateMatch[0];

    const normalizedDept = normalizeDepartment(rawDept);
    const slots = await getAvailableSlots(normalizedDept, extractedDate);

    const mappedSlots = slots.map((s) => ({
      title: s.label,
      value: s.time,
    }));

    res.json({
      success: true,
      department: normalizedDept,
      date: extractedDate,
      slots: mappedSlots,
    });
  } catch (error) {
    console.error("[GET /api/booking/available-slots] Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch available slots." });
  }
});

export default bookingRouter;
