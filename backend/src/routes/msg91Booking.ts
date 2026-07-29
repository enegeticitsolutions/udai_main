import { Router } from "express";
import { MongoServerError } from "mongodb";
import { ZodError } from "zod";
import { NoSlotsAvailableError, saveMsg91Appointment } from "../services/msg91AppointmentService.js";
import { getAvailableDates, getAvailableSlots, getDepartments } from "../services/bookingService.js";

const msg91BookingRouter = Router();

/**
 * Expose available departments for MSG91 flow
 */
msg91BookingRouter.get("/departments", async (_req, res, next) => {
  try {
    const departments = await getDepartments();
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
});

/**
 * Expose available dates for a department (next 5 days with open slots)
 */
msg91BookingRouter.get("/dates", async (req, res, next) => {
  try {
    const department = String(req.query.department ?? "").trim();
    if (!department) {
      res.status(400).json({ success: false, message: "department query param is required" });
      return;
    }
    const dates = await getAvailableDates(department);
    res.json({ success: true, data: dates });
  } catch (error) {
    next(error);
  }
});

/**
 * Expose available 45-min slots for a department on a date
 */
msg91BookingRouter.get("/slots", async (req, res, next) => {
  try {
    const department = String(req.query.department ?? "").trim();
    const date = String(req.query.date ?? "").trim();
    if (!department || !date) {
      res.status(400).json({ success: false, message: "department and date query params are required" });
      return;
    }
    const slots = await getAvailableSlots(department, date);
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
});

/**
 * Backward-compatible alias for older MSG91 bot flow nodes.
 * New integrations should call POST /api/webhooks/msg91.
 */
msg91BookingRouter.post("/", async (req, res) => {
  console.info("[MSG91 legacy booking] Incoming payload:", JSON.stringify(req.body));
  try {
    const { appointment, duplicate } = await saveMsg91Appointment(req.body);
    res.status(duplicate ? 200 : 201).json({
      success: true,
      data: appointment,
      message: duplicate ? "Duplicate booking already recorded" : "Booking saved successfully",
    });
  } catch (error) {
    if (error instanceof NoSlotsAvailableError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    if (error instanceof ZodError) {
      console.warn("[MSG91 legacy booking] Validation failed:", error.flatten());
      res.status(422).json({ success: false, message: "Invalid booking payload", errors: error.flatten().fieldErrors });
      return;
    }

    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(200).json({ success: true, message: "Duplicate booking already recorded" });
      return;
    }

    console.error("[MSG91 legacy booking] Database save failed:", error);
    res.status(500).json({ success: false, message: "Failed to save booking" });
  }
});

export default msg91BookingRouter;
