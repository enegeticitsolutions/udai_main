import { Router } from "express";
import mongoose from "mongoose";
import { calculateAppointmentFee, normalizeAppointmentDate, saveMsg91Appointment } from "../services/msg91AppointmentService.js";
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

/**
 * POST /api/msg91/calculate-fee
 * Returns the correct appointment fee based on patient type, appointment mode,
 * department, and (for Counselling returning patients) session frequency.
 *
 * Body:
 *  {
 *    isNew: boolean,                        // from /check-patient-status response
 *    appointmentType: "online" | "offline", // consultation mode
 *    department: string,                    // e.g. "Counselling", "OT", "Speech Therapy"
 *    session_frequency?: string             // e.g. "Week", "3 Sessions", "full_week", "Single"
 *  }
 *
 * Response:
 *  { success: true, amount: number, totalSessions: number, feeCharged: number }
 *
 * Pricing rules:
 *  New patient   – Online: ₹600 | Offline: ₹800
 *  Returning + Counselling + weekly pkg  – ₹1500, 3 sessions
 *  Returning + Counselling + single      – ₹500,  1 session
 *  Returning + other services – Online: ₹600 | Offline: ₹800
 */
msg91BookingRouter.post("/calculate-fee", (req, res) => {
  try {
    const body = req.body ?? {};
    const isNew: boolean = body.isNew === true || body.isNew === "true";
    const appointmentType = String(body.appointmentType ?? body.appointment_type ?? "in-person").trim();
    const department = String(body.department ?? body.service ?? "").trim();
    const session_frequency = String(body.session_frequency ?? body.sessionFrequency ?? "").trim();

    if (!department) {
      return res.status(400).json({ success: false, message: "department is required" });
    }

    const { amount, totalSessions, feeCharged } = calculateAppointmentFee({
      isNew,
      appointmentType,
      department,
      session_frequency,
    });

    console.log(`[calculate-fee] isNew=${isNew} dept=${department} type=${appointmentType} freq=${session_frequency} => ₹${amount} (${totalSessions} session(s))`);

    return res.json({ success: true, amount, totalSessions, feeCharged });
  } catch (error: any) {
    console.error("[calculate-fee] Error:", error.message || error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /api/msg91/check-patient-status
 * Checks whether a phone number has any existing (non-cancelled/non-rejected)
 * appointments in the `appointments` collection.
 * Body: { phoneNumber: string }
 * Response: { success: true, isNew: boolean }
 */
msg91BookingRouter.post("/check-patient-status", async (req, res) => {
  try {
    const rawPhone = String(req.body?.phoneNumber ?? req.body?.phone ?? "").trim();
    // Strip non-digit chars, then take the last 10 digits for a clean Indian mobile number
    const digitsOnly = rawPhone.replace(/\D/g, "");
    const cleanPhone = digitsOnly.slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: "Valid phoneNumber is required" });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: "Database not connected" });
    }

    // Match phone stored as 10-digit, with country code prefix (91XXXXXXXXXX), or the raw value
    const phoneVariants = [cleanPhone, `91${cleanPhone}`, `+91${cleanPhone}`, rawPhone].filter(Boolean);
    const count = await db.collection("appointments").countDocuments({
      phoneNumber: { $in: phoneVariants },
      bookingStatus: { $nin: ["cancelled", "rejected"] },
    });

    console.log(`[check-patient-status] phone=${cleanPhone} count=${count}`);

    return res.json({ success: true, isNew: count === 0 });
  } catch (error: any) {
    console.error("[check-patient-status] Error:", error.message || error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default msg91BookingRouter;

