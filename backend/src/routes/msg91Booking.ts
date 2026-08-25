import { Router } from "express";
import { MongoServerError } from "mongodb";
import { ZodError } from "zod";
import { NoSlotsAvailableError, saveMsg91Appointment } from "../services/msg91AppointmentService.js";
import { getAvailableDates, getAvailableSlots, getDepartments } from "../services/bookingService.js";

const msg91BookingRouter = Router();

/**
 * Expose available departments for MSG91 flow (GET or POST)
 */
const handleDepartments = async (_req: any, res: any, next: any) => {
  try {
    const departments = await getDepartments();
    res.status(200).json({ success: true, status: "success", data: departments });
  } catch (error) {
    next(error);
  }
};
msg91BookingRouter.get("/departments", handleDepartments);
msg91BookingRouter.post("/departments", handleDepartments);

/**
 * Expose available dates for a department (GET or POST)
 */
const handleDates = async (req: any, res: any, next: any) => {
  try {
    const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {}) as Record<string, unknown>;
    const department = String(
      req.query.department ?? req.query.service ?? req.query.selected_service ??
      data.department ?? data.service ?? data.selected_service ?? data.service_name ?? ""
    ).trim();
    const dates = await getAvailableDates(department || "OT");
    res.status(200).json({ success: true, status: "success", data: dates });
  } catch (error) {
    next(error);
  }
};
msg91BookingRouter.get("/dates", handleDates);
msg91BookingRouter.post("/dates", handleDates);

/**
 * Expose available slots for a department on a date (GET or POST)
 */
const handleSlots = async (req: any, res: any, next: any) => {
  try {
    const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {}) as Record<string, unknown>;
    const department = String(
      req.query.department ?? req.query.service ?? req.query.selected_service ??
      data.department ?? data.service ?? data.selected_service ?? ""
    ).trim();
    const date = String(
      req.query.date ?? req.query.appointment_date ??
      data.date ?? data.appointment_date ?? data.selected_date ?? ""
    ).trim() || new Date().toISOString().slice(0, 10);

    const slots = await getAvailableSlots(department || "OT", date);
    const limitedSlots = slots.filter((s: any) => s.isAvailable !== false).slice(0, 10);

    res.status(200).json({ success: true, status: "success", data: limitedSlots });
  } catch (error) {
    next(error);
  }
};
msg91BookingRouter.get("/slots", handleSlots);
msg91BookingRouter.post("/slots", handleSlots);

import { WebhookMessage } from "../models/WebhookMessage.js";

/**
 * Backward-compatible alias for older MSG91 bot flow nodes.
 * New integrations should call POST /api/webhooks/msg91.
 */
msg91BookingRouter.post("/", async (req, res) => {
  console.info("[MSG91 legacy booking] Incoming payload:", JSON.stringify(req.body));
  try {
    const { appointment, duplicate, isPreliminary } = await saveMsg91Appointment(req.body);
    if (isPreliminary) {
      res.status(200).json({ success: true, status: "success", message: "Service selection acknowledged", data: [] });
      return;
    }

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
      console.log(`[MSG91 legacy booking] Logged appointment payload to WebhookMessage`);
    } catch (dbErr: any) {
      console.error("[MSG91 legacy booking] Failed to log WebhookMessage:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      status: "success",
      data: appointment,
      message: duplicate ? "Duplicate booking already recorded" : "Booking saved successfully",
    });
  } catch (error: any) {
    console.warn("[MSG91 legacy booking] Gracefully handled payload error:", error.message || error);
    res.status(200).json({
      success: true,
      status: "success",
      message: "Request processed",
    });
  }
});

export default msg91BookingRouter;
