import { Router } from "express";
import mongoose from "mongoose";
import { normalizeAppointmentDate, saveMsg91Appointment } from "../services/msg91AppointmentService.js";
import { getAvailableDates, getAvailableSlots, getDepartments } from "../services/bookingService.js";
import { WebhookMessage } from "../models/WebhookMessage.js";

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
      data.department ?? data.service ?? data.selected_service ?? data.service_name ?? ""
    ).trim();
    const rawDate = String(
      req.query.date ?? req.query.appointment_date ?? req.query.selected_date ??
      data.date ?? data.appointment_date ?? data.selected_date ?? data.date_of_appointment ?? ""
    ).trim();
    const date = normalizeAppointmentDate(rawDate);

    const slots = await getAvailableSlots(department || "OT", date);
    const formattedSlots = slots
      .filter((s: any) => s.isAvailable !== false)
      .slice(0, 10)
      .map((slot: any) => ({
        title: slot.label || slot.time,
        value: slot.time,
        id: slot.time,
        label: slot.label || slot.time,
        time: slot.time,
        isAvailable: slot.isAvailable,
        availableCount: slot.availableCount,
        bookedCount: slot.bookedCount,
        totalTherapists: slot.totalTherapists,
      }));

    res.status(200).json({ success: true, status: "success", data: formattedSlots });
  } catch (error) {
    next(error);
  }
};
msg91BookingRouter.get("/slots", handleSlots);
msg91BookingRouter.post("/slots", handleSlots);

/**
 * POST /api/msg91-booking
 * Receives incoming appointment booking requests from MSG91 bot flows.
 */
msg91BookingRouter.post("/", async (req, res) => {
  console.log("==> Incoming MSG91 Booking Payload:", req.body);
  try {
    const { appointment, duplicate } = await saveMsg91Appointment(req.body);
    console.info(`[MSG91 Booking] ${duplicate ? "Existing booking updated" : "New booking created"}: ${appointment.bookingId}`);

    // 1. Log to WebhookMessage (for WhatsApp Messages dashboard)
    try {
      await WebhookMessage.create({
        rawData: req.body,
        phone: appointment.phoneNumber || "",
        childName: appointment.patientName || "Not specified",
        parentName: appointment.parentName || "",
        age: appointment.age !== undefined && appointment.age !== null ? String(appointment.age) : "",
        firstSession: (appointment as any).firstSession || "",
        isFirstSession: (appointment as any).isFirstSession,
        appointmentDate: appointment.appointmentDate || "",
        appointmentTime: appointment.appointmentTime || "",
        department: appointment.therapistName || "",
        concern: appointment.mainConcern || "",
        assignedTherapist: appointment.therapistName || "",
        assignedTherapistId: appointment.therapistId || "",
        status: appointment.bookingStatus || "confirmed",
        bookingSource: "whatsapp",
      });
      console.log(`[MSG91 Booking] Logged appointment payload to WebhookMessage`);
    } catch (dbErr: any) {
      console.error("[MSG91 Booking] Failed to log WebhookMessage:", dbErr.message);
    }

    // 2. Sync to chatbotsubmissions (for WhatsApp Appointments dashboard)
    try {
      const db = mongoose.connection.db;
      if (db && appointment.phoneNumber) {
        const txnId = appointment.bookingId || `MSG91-${Date.now()}`;
        await db.collection("chatbotsubmissions").updateOne(
          { transactionId: txnId },
          {
            $set: {
              phone: appointment.phoneNumber,
              message: appointment.mainConcern || `Appointment for ${appointment.patientName}`,
              userDetails: {
                name: appointment.patientName || undefined,
                age: appointment.age || undefined,
                parentName: appointment.parentName || undefined,
                problem: appointment.mainConcern || appointment.therapistName || undefined,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
              },
              assignedTherapist: appointment.therapistName || undefined,
              assignedTherapistId: appointment.therapistId || undefined,
              status: appointment.bookingStatus || "confirmed",
              source: "whatsapp",
              rawPayload: req.body,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              transactionId: txnId,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    } catch (submissionsErr: any) {
      console.error("[MSG91 Booking] Failed to sync chatbotsubmissions:", submissionsErr.message);
    }

    res.status(200).json({
      success: true,
      status: "success",
      data: appointment,
      message: duplicate ? "Booking record updated successfully" : "Booking saved successfully",
    });
  } catch (error: any) {
    console.error("[MSG91 Booking] Error saving booking:", error.message || error);
    res.status(200).json({
      success: true,
      status: "success",
      message: "Request processed",
      error: error.message,
    });
  }
});

export default msg91BookingRouter;
