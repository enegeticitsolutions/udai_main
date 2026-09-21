import { Router } from "express";
import mongoose from "mongoose";
import { calculateAppointmentFee, normalizeAppointmentDate, saveMsg91Appointment } from "../services/msg91AppointmentService.js";
import { getAvailableDates, getAvailableSlots, getDepartments, normalizeDepartment } from "../services/bookingService.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";

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
    const rawDept = String(
      req.query.department ?? req.query.service ?? req.query.selected_service ??
      data.department ?? data.service ?? data.selected_service ?? data.service_name ?? ""
    ).trim();
    const department = normalizeDepartment(rawDept);
    const dates = await getAvailableDates(department || "Child and Parental Counselling");
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
    const rawDept = String(
      req.query.department ?? req.query.service ?? req.query.selected_service ??
      data.department ?? data.service ?? data.selected_service ?? data.service_name ?? ""
    ).trim();
    const department = normalizeDepartment(rawDept);
    const rawDate = String(
      req.query.date ?? req.query.appointment_date ?? req.query.selected_date ??
      data.date ?? data.appointment_date ?? data.selected_date ?? data.date_of_appointment ?? ""
    ).trim();
    const date = normalizeAppointmentDate(rawDate);

    const slots = await getAvailableSlots(department || "Child and Parental Counselling", date);
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
        department: appointment.department || "Child and Parental Counselling",
        concern: appointment.mainConcern || "",
        assignedTherapist: appointment.therapistName || "Ms. Tanu Rajput",
        assignedTherapistId: appointment.therapistId || "roster-counselling-1",
        status: "confirmed",
        session_frequency: appointment.session_frequency || "",
        totalSessions: appointment.totalSessions || 1,
        sessionSchedule: (appointment as any).sessionSchedule || [],
        sessionScheduleText: (appointment as any).sessionScheduleText || "",
        feeCharged: appointment.feeCharged ?? (appointment as any).amount ?? 0,
        amount: (appointment as any).amount || 0,
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
                department: appointment.department || "Child and Parental Counselling",
                session_frequency: appointment.session_frequency,
                totalSessions: appointment.totalSessions,
                sessionSchedule: (appointment as any).sessionSchedule || [],
                sessionScheduleText: (appointment as any).sessionScheduleText || "",
                feeCharged: appointment.feeCharged ?? (appointment as any).amount ?? 0,
              },
              assignedTherapist: appointment.therapistName || "Ms. Tanu Rajput",
              assignedTherapistId: appointment.therapistId || "roster-counselling-1",
              status: "confirmed",
              session_frequency: appointment.session_frequency,
              totalSessions: appointment.totalSessions,
              sessionSchedule: (appointment as any).sessionSchedule || [],
              sessionScheduleText: (appointment as any).sessionScheduleText || "",
              feeCharged: appointment.feeCharged ?? (appointment as any).amount ?? 0,
              amount: (appointment as any).amount,
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
 *  Returning + Counselling + 3 Days / "2400" – ₹2400, 3 sessions
 *  Returning + Counselling + 2 Days / "1600" – ₹1600, 2 sessions
 *  Returning + Counselling + Single           – ₹800,  1 session
 *  Returning + other services – Online: ₹600 | Offline: ₹800
 */
msg91BookingRouter.all("/calculate-fee", async (req, res) => {
  try {
    const data = { ...(req.query || {}), ...(req.body || {}) };
    const rawCandidatePhone =
      data.phone ||
      data.phoneNumber ||
      data.customerNumber ||
      data.mobile ||
      "";
    const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    let isNew: boolean;
    const rawIsNew = data.isNew ?? data.is_new ?? data.is_new_patient ?? data.isNewPatient ?? data.firstSession ?? data.isFirstSession;
    if (rawIsNew !== undefined && rawIsNew !== null && rawIsNew !== "") {
      isNew = rawIsNew === true || rawIsNew === "true" || rawIsNew === "yes" || rawIsNew === 1 || rawIsNew === "1";
    } else if (cleanPhone) {
      // Check if phone has existing bookings
      const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
      if (db) {
        const phoneRegex = new RegExp(`${cleanPhone}$`);
        const priorCount = await db.collection("appointments").countDocuments({
          $or: [
            { phoneNumber: phoneRegex },
            { phone: phoneRegex },
            { "rawPayload.customerNumber": phoneRegex },
            { "rawPayload.phoneNumber": phoneRegex },
          ],
          bookingStatus: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
        }).catch(() => 0);
        isNew = priorCount === 0;
      } else {
        isNew = false;
      }
    } else {
      isNew = false;
    }

    const appointmentType = String(
      data.appointmentType ?? data.appointment_type ?? data.paymentMode ?? data.payment_mode ?? data.mode ?? "in-person"
    ).trim();
    const rawDept = String(data.department ?? data.service ?? data.selected_service ?? "").trim();
    // Only lock to Counselling if patient is strictly a new first-time patient!
    const department = isNew ? "Child and Parental Counselling" : normalizeDepartment(rawDept);
    const session_frequency = String(data.session_frequency ?? data.sessionFrequency ?? data.frequency ?? "").trim();

    const { amount, totalSessions, feeCharged } = calculateAppointmentFee({
      isNew,
      appointmentType,
      department,
      session_frequency,
    });

    console.log(`[calculate-fee] isNew=${isNew} dept=${department} type=${appointmentType} freq=${session_frequency} => ₹${amount} (${totalSessions} session(s))`);

    return res.json({
      success: true,
      amount,
      totalSessions,
      feeCharged,
      fee: feeCharged,
      sessions: totalSessions,
      data: { amount, totalSessions, feeCharged }
    });
  } catch (error: any) {
    console.error("[calculate-fee] Error:", error.message || error);
    return res.json({ success: true, amount: 800, totalSessions: 1, feeCharged: 800 });
  }
});

/**
 * ALL /api/msg91/check-patient-status
 * Checks whether a phone number has any existing (non-cancelled/non-rejected)
 * appointments or bookings.
 * Resiliently extracts phone from body, query, nested payload, or customerNumber.
 * Never throws 400: defaults gracefully to isNew=true if phone is missing or invalid.
 */
msg91BookingRouter.all("/check-patient-status", async (req, res) => {
  try {
    await connectMongoDb().catch(() => {});

    const body = req.body || {};
    const query = req.query || {};
    const nested = body.data || body.payload || body.variables || {};

    // 1. Normalize phone extraction across all possible keys from MSG91 bot flows
    const rawCandidate =
      body.phone ||
      body.phoneNumber ||
      body.mobile ||
      body.contact ||
      body.sender ||
      (body.data && (body.data.phone || body.data.phoneNumber || body.data.contact || body.data.sender || body.data.customerNumber)) ||
      nested.phone ||
      nested.phoneNumber ||
      nested.mobile ||
      nested.contact ||
      nested.sender ||
      nested.customerNumber ||
      nested.customer_number ||
      nested.from ||
      body.customerNumber ||
      body.customer_number ||
      body.customer_no ||
      body.mobile_number ||
      body.phone_number ||
      body.from ||
      body.number ||
      query.phone ||
      query.phoneNumber ||
      query.mobile ||
      query.contact ||
      query.sender ||
      query.customerNumber ||
      query.customer_number ||
      query.from ||
      "";

    let rawPhone = String(rawCandidate || "").trim();

    // Fallback if candidate was empty but raw body is string containing phone digits
    if (!rawPhone && typeof req.body === "string") {
      const match = req.body.match(/\d{10,12}/);
      if (match) rawPhone = match[0];
    }

    // 2. Sanitize: strip non-digit characters and take the last 10 digits
    const digitsOnly = rawPhone.replace(/\D/g, "");
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    // If phone is missing or empty, do NOT throw 400! Log a warning and return HTTP 200 fallback
    if (!cleanPhone) {
      console.warn(`[check-patient-status] Missing or empty phone parameter: ${JSON.stringify(req.body)}. Defaulting to new patient.`);
      return res.status(200).json({
        success: true,
        isNew: true,
        is_new: true,
        is_new_patient: true,
        isNewPatient: true,
        existingPatient: false,
        existing_patient: false,
        is_returning: false,
        isReturning: false,
        patientName: "",
        childName: "",
        status: "new",
        count: 0,
        message: "Defaulted to new patient due to missing phone parameter",
        data: {
          success: true,
          isNew: true,
          is_new: true,
          is_new_patient: true,
          isNewPatient: true,
          existingPatient: false,
          existing_patient: false,
          patientName: "",
          childName: "",
          status: "new",
          count: 0,
        },
      });
    }

    // 3. Query DB for existing appointments/messages matching last 10 digits regex
    const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
    let count = 0;
    let patientName = "";

    if (db) {
      const phoneRegex = new RegExp(`${cleanPhone}$`);
      const apptFilter = {
        $or: [
          { phoneNumber: phoneRegex },
          { phone: phoneRegex },
          { "rawPayload.customerNumber": phoneRegex },
          { "rawPayload.phoneNumber": phoneRegex },
        ],
        bookingStatus: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
      };
      const webhookFilter = {
        $or: [
          { phone: phoneRegex },
          { phoneNumber: phoneRegex },
          { "rawData.customerNumber": phoneRegex },
          { "rawData.phoneNumber": phoneRegex },
        ],
        status: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
      };

      const [apptCount, webhookCount, latestAppt, latestWebhook] = await Promise.all([
        db.collection("appointments").countDocuments(apptFilter).catch(() => 0),
        db.collection("webhookmessages").countDocuments(webhookFilter).catch(() => 0),
        db.collection("appointments").findOne(apptFilter, { sort: { createdAt: -1, _id: -1 } }).catch(() => null),
        db.collection("webhookmessages").findOne(webhookFilter, { sort: { createdAt: -1, _id: -1 } }).catch(() => null),
      ]);

      count = (apptCount || 0) + (webhookCount || 0);
      patientName =
        latestAppt?.patientName ||
        latestWebhook?.childName ||
        latestWebhook?.patientName ||
        latestAppt?.parentName ||
        latestWebhook?.parentName ||
        "";
    }

    const existingPatient = count > 0;
    const isNew = !existingPatient;
    console.log(`[check-patient-status] phone=${cleanPhone} existingPatient=${existingPatient} totalCount=${count} patientName="${patientName}" => isNew=${isNew}`);

    return res.status(200).json({
      success: true,
      isNew,
      is_new: isNew,
      is_new_patient: isNew ? "true" : "false",
      isNewPatient: isNew,
      is_new_patient_bool: isNew,
      existingPatient,
      existing_patient: existingPatient,
      is_returning: existingPatient,
      isReturning: existingPatient,
      patientName,
      childName: patientName,
      status: isNew ? "new" : "returning",
      phone: cleanPhone,
      count,
      data: {
        success: true,
        isNew,
        is_new: isNew,
        is_new_patient: isNew ? "true" : "false",
        isNewPatient: isNew,
        is_new_patient_bool: isNew,
        existingPatient,
        existing_patient: existingPatient,
        is_returning: existingPatient,
        isReturning: existingPatient,
        patientName,
        childName: patientName,
        status: isNew ? "new" : "returning",
        count,
      },
    });
  } catch (error: any) {
    console.error("[check-patient-status] Error:", error?.message || error);
    // Never return 400 or 500 to prevent MSG91 bot from hanging
    return res.status(200).json({
      success: true,
      isNew: true,
      is_new: true,
      is_new_patient: "true",
      isNewPatient: true,
      is_new_patient_bool: true,
      existingPatient: false,
      existing_patient: false,
      is_returning: false,
      isReturning: false,
      patientName: "",
      childName: "",
      status: "new",
      count: 0,
      fallback: true,
      message: "Defaulted to new patient due to missing phone parameter",
      data: {
        success: true,
        isNew: true,
        is_new: true,
        is_new_patient: "true",
        isNewPatient: true,
        is_new_patient_bool: true,
        existingPatient: false,
        existing_patient: false,
        is_returning: false,
        isReturning: false,
        patientName: "",
        childName: "",
        status: "new",
        count: 0,
      },
    });
  }
});

export default msg91BookingRouter;

