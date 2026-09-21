import { Router } from "express";
import mongoose from "mongoose";
import { calculateAppointmentFee, normalizeAppointmentDate, saveMsg91Appointment } from "../services/msg91AppointmentService.js";
import { getAvailableDates, getAvailableSlots, getDepartments } from "../services/bookingService.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
const msg91BookingRouter = Router();
/**
 * Expose available departments for MSG91 flow (GET or POST)
 */
const handleDepartments = async (_req, res, next) => {
    try {
        const departments = await getDepartments();
        res.status(200).json({ success: true, status: "success", data: departments });
    }
    catch (error) {
        next(error);
    }
};
msg91BookingRouter.get("/departments", handleDepartments);
msg91BookingRouter.post("/departments", handleDepartments);
/**
 * Expose available dates for a department (GET or POST)
 */
const handleDates = async (req, res, next) => {
    try {
        const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {});
        const department = String(req.query.department ?? req.query.service ?? req.query.selected_service ??
            data.department ?? data.service ?? data.selected_service ?? data.service_name ?? "").trim();
        const dates = await getAvailableDates(department || "OT");
        res.status(200).json({ success: true, status: "success", data: dates });
    }
    catch (error) {
        next(error);
    }
};
msg91BookingRouter.get("/dates", handleDates);
msg91BookingRouter.post("/dates", handleDates);
/**
 * Expose available slots for a department on a date (GET or POST)
 */
const handleSlots = async (req, res, next) => {
    try {
        const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {});
        const department = String(req.query.department ?? req.query.service ?? req.query.selected_service ??
            data.department ?? data.service ?? data.selected_service ?? data.service_name ?? "").trim();
        const rawDate = String(req.query.date ?? req.query.appointment_date ?? req.query.selected_date ??
            data.date ?? data.appointment_date ?? data.selected_date ?? data.date_of_appointment ?? "").trim();
        const date = normalizeAppointmentDate(rawDate);
        const slots = await getAvailableSlots(department || "OT", date);
        const formattedSlots = slots
            .filter((s) => s.isAvailable !== false)
            .slice(0, 10)
            .map((slot) => ({
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
    }
    catch (error) {
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
                firstSession: appointment.firstSession || "",
                isFirstSession: appointment.isFirstSession,
                appointmentDate: appointment.appointmentDate || "",
                appointmentTime: appointment.appointmentTime || "",
                department: appointment.department || appointment.therapistName || "",
                concern: appointment.mainConcern || "",
                assignedTherapist: appointment.therapistName || "",
                assignedTherapistId: appointment.therapistId || "",
                status: appointment.bookingStatus || "confirmed",
                session_frequency: appointment.session_frequency || "",
                totalSessions: appointment.totalSessions || 1,
                sessionSchedule: appointment.sessionSchedule || [],
                sessionScheduleText: appointment.sessionScheduleText || "",
                feeCharged: appointment.feeCharged ?? appointment.amount ?? 0,
                amount: appointment.amount || 0,
                bookingSource: "whatsapp",
            });
            console.log(`[MSG91 Booking] Logged appointment payload to WebhookMessage`);
        }
        catch (dbErr) {
            console.error("[MSG91 Booking] Failed to log WebhookMessage:", dbErr.message);
        }
        // 2. Sync to chatbotsubmissions (for WhatsApp Appointments dashboard)
        try {
            const db = mongoose.connection.db;
            if (db && appointment.phoneNumber) {
                const txnId = appointment.bookingId || `MSG91-${Date.now()}`;
                await db.collection("chatbotsubmissions").updateOne({ transactionId: txnId }, {
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
                            department: appointment.department || appointment.therapistName || undefined,
                            session_frequency: appointment.session_frequency,
                            totalSessions: appointment.totalSessions,
                            sessionSchedule: appointment.sessionSchedule || [],
                            sessionScheduleText: appointment.sessionScheduleText || "",
                            feeCharged: appointment.feeCharged ?? appointment.amount ?? 0,
                        },
                        assignedTherapist: appointment.therapistName || undefined,
                        assignedTherapistId: appointment.therapistId || undefined,
                        status: appointment.bookingStatus || "confirmed",
                        session_frequency: appointment.session_frequency,
                        totalSessions: appointment.totalSessions,
                        sessionSchedule: appointment.sessionSchedule || [],
                        sessionScheduleText: appointment.sessionScheduleText || "",
                        feeCharged: appointment.feeCharged ?? appointment.amount ?? 0,
                        amount: appointment.amount,
                        source: "whatsapp",
                        rawPayload: req.body,
                        updatedAt: new Date(),
                    },
                    $setOnInsert: {
                        transactionId: txnId,
                        createdAt: new Date(),
                    },
                }, { upsert: true });
            }
        }
        catch (submissionsErr) {
            console.error("[MSG91 Booking] Failed to sync chatbotsubmissions:", submissionsErr.message);
        }
        res.status(200).json({
            success: true,
            status: "success",
            data: appointment,
            message: duplicate ? "Booking record updated successfully" : "Booking saved successfully",
        });
    }
    catch (error) {
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
msg91BookingRouter.all("/calculate-fee", (req, res) => {
    try {
        const data = { ...(req.query || {}), ...(req.body || {}) };
        const rawIsNew = data.isNew ?? data.is_new ?? data.is_new_patient ?? data.isNewPatient;
        const isNew = rawIsNew === true || rawIsNew === "true" || rawIsNew === 1 || rawIsNew === "1";
        const appointmentType = String(data.appointmentType ?? data.appointment_type ?? data.paymentMode ?? data.payment_mode ?? data.mode ?? "in-person").trim();
        const department = String(data.department ?? data.service ?? data.selected_service ?? "Counselling").trim() || "Counselling";
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
    }
    catch (error) {
        console.error("[calculate-fee] Error:", error.message || error);
        return res.json({ success: true, amount: 800, totalSessions: 1, feeCharged: 800 });
    }
});
/**
 * ALL /api/msg91/check-patient-status
 * Checks whether a phone number has any existing (non-cancelled/non-rejected)
 * appointments or bookings.
 * Resiliently extracts phone from body, query, nested payload, or customerNumber.
 * Always returns HTTP 200 with both `isNew` and `is_new_patient` so MSG91 Flow never halts.
 */
msg91BookingRouter.all("/check-patient-status", async (req, res) => {
    try {
        await connectMongoDb().catch(() => { });
        const body = req.body || {};
        const query = req.query || {};
        const nested = body.data || body.payload || body.variables || {};
        // Check all possible field names used by MSG91 and chat flows
        const candidatePhone = body.phoneNumber ??
            body.phone ??
            body.customerNumber ??
            body.customer_number ??
            body.customer_no ??
            body.mobile ??
            body.mobile_number ??
            body.phone_number ??
            body.from ??
            body.sender ??
            body.contact ??
            body.number ??
            nested.phoneNumber ??
            nested.phone ??
            nested.customerNumber ??
            nested.customer_number ??
            nested.mobile ??
            nested.from ??
            query.phoneNumber ??
            query.phone ??
            query.customerNumber ??
            query.customer_number ??
            query.mobile ??
            query.from ??
            "";
        let rawPhone = String(candidatePhone || "").trim();
        // If candidatePhone was empty but body is a string or object containing numbers
        if (!rawPhone && typeof req.body === "string") {
            const match = req.body.match(/\d{10,12}/);
            if (match)
                rawPhone = match[0];
        }
        const digitsOnly = rawPhone.replace(/\D/g, "");
        const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
        // If no phone could be extracted, safely default to new patient with HTTP 200
        // so MSG91 flow does NOT fail or stop responding to the user!
        if (!cleanPhone) {
            console.warn(`[check-patient-status] No phone found in request body/query: ${JSON.stringify(req.body)}. Defaulting to is_new_patient=true`);
            return res.json({
                success: true,
                isNew: true,
                is_new: true,
                is_new_patient: true,
                isNewPatient: true,
                is_returning: false,
                isReturning: false,
                status: "new",
                count: 0,
                message: "No phone provided; defaulted to new patient"
            });
        }
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        let count = 0;
        if (db) {
            const phoneVariants = [cleanPhone, `91${cleanPhone}`, `+91${cleanPhone}`, rawPhone].filter(Boolean);
            const apptCount = await db.collection("appointments").countDocuments({
                phoneNumber: { $in: phoneVariants },
                bookingStatus: { $nin: ["cancelled", "rejected"] },
            }).catch(() => 0);
            const webhookCount = await db.collection("webhookmessages").countDocuments({
                phone: { $in: phoneVariants },
                status: { $nin: ["cancelled", "rejected"] },
            }).catch(() => 0);
            count = apptCount + webhookCount;
        }
        const isNew = count === 0;
        console.log(`[check-patient-status] phone=${cleanPhone} totalCount=${count} => isNew=${isNew}`);
        return res.json({
            success: true,
            isNew,
            is_new: isNew,
            is_new_patient: isNew,
            isNewPatient: isNew,
            is_returning: !isNew,
            isReturning: !isNew,
            status: isNew ? "new" : "returning",
            phone: cleanPhone,
            count,
            data: {
                isNew,
                is_new: isNew,
                is_new_patient: isNew,
                isNewPatient: isNew,
                is_returning: !isNew,
                isReturning: !isNew,
                status: isNew ? "new" : "returning",
                count,
            }
        });
    }
    catch (error) {
        console.error("[check-patient-status] Error:", error.message || error);
        // Never return 400/500 to MSG91 to prevent bot from hanging!
        return res.json({
            success: true,
            isNew: true,
            is_new: true,
            is_new_patient: true,
            isNewPatient: true,
            is_returning: false,
            status: "new",
            count: 0,
            fallback: true
        });
    }
});
export default msg91BookingRouter;
