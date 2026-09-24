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
// In-memory intent map for recent service selections (keyed by clean 10-digit phone, expires in 20 mins)
const recentServiceSelectionMap = new Map();
export function recordRecentDepartmentSelection(phone, department) {
    const digits = String(phone || "").replace(/\D/g, "");
    const clean = digits.length >= 10 ? digits.slice(-10) : "";
    if (!clean || !department)
        return;
    recentServiceSelectionMap.set(clean, {
        department,
        timestamp: Date.now(),
    });
}
export function clearRecentDepartmentSelection(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    const clean = digits.length >= 10 ? digits.slice(-10) : "";
    if (clean) {
        recentServiceSelectionMap.delete(clean);
    }
}
export function getRecentDepartmentSelection(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    const clean = digits.length >= 10 ? digits.slice(-10) : "";
    if (!clean)
        return null;
    const entry = recentServiceSelectionMap.get(clean);
    if (!entry)
        return null;
    if (Date.now() - entry.timestamp > 20 * 60 * 1000) {
        recentServiceSelectionMap.delete(clean);
        return null;
    }
    return entry.department;
}
/**
 * Match WhatsApp interactive clicked title (list_reply.title or button_reply.title)
 */
export function matchDepartmentFromTitle(title) {
    if (!title || typeof title !== "string")
        return null;
    const str = title.trim();
    if (!str || str.includes("@") || str.includes("{{"))
        return null;
    if (/Physiotherapy|Physio/i.test(str))
        return "Physiotherapy";
    if (/Physical\s*Therapy/i.test(str))
        return "Physical Therapy";
    if (/Occupational\s*Therapy|\bOT\b/i.test(str))
        return "Occupational Therapy";
    if (/Speech\s*Therapy|\bSpeech\b/i.test(str))
        return "Speech Therapy";
    if (/Special\s*Educat/i.test(str))
        return "Special Education";
    if (/Academic\s*Support|Remedial/i.test(str))
        return "Academic Support";
    if (/Counsell/i.test(str))
        return "Child and Parental Counselling";
    return null;
}
/**
 * Auto-detect chosen department from recent WhatsApp messages in db.collection("webhookmessages")
 * Always queries the absolute latest interactive webhook first to prevent stale cache leakage.
 */
export async function detectDepartmentFromRecentMessages(cleanPhone, incomingDept) {
    const dept = String(incomingDept || "").trim();
    const directMatch = matchDepartmentFromTitle(dept);
    if (directMatch) {
        recordRecentDepartmentSelection(cleanPhone, directMatch);
        return directMatch;
    }
    try {
        await connectMongoDb().catch(() => { });
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (db && cleanPhone) {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            // Query the absolute latest interactive webhook in db.collection("webhookmessages") for this user's phone
            const recentMsgs = await db
                .collection("webhookmessages")
                .find({
                $or: [
                    { phone: { $regex: cleanPhone + "$" } },
                    { phoneNumber: { $regex: cleanPhone + "$" } },
                    { "rawData.customerNumber": { $regex: cleanPhone + "$" } },
                    { "rawData.phoneNumber": { $regex: cleanPhone + "$" } },
                    { "rawData.phone": { $regex: cleanPhone + "$" } },
                    { "rawData.from": { $regex: cleanPhone + "$" } },
                ],
            })
                .sort({ receivedAt: -1, createdAt: -1, _id: -1 })
                .limit(10)
                .toArray();
            for (const msg of recentMsgs) {
                const ts = msg.receivedAt || msg.createdAt;
                if (ts) {
                    const d = new Date(ts);
                    if (!isNaN(d.getTime()) && d < fifteenMinutesAgo)
                        continue;
                }
                const interactiveCandidates = [
                    msg.rawData?.interactive?.list_reply?.title,
                    msg.rawData?.interactive?.button_reply?.title,
                    msg.rawData?.list_reply?.title,
                    msg.rawData?.button_reply?.title,
                    msg.rawData?.text?.body,
                    msg.message,
                    msg.rawData?.service,
                    msg.rawData?.department,
                    msg.rawData?.message,
                ];
                for (const candidate of interactiveCandidates) {
                    const match = matchDepartmentFromTitle(candidate);
                    if (match) {
                        console.log(`[Real-Time WhatsApp Extraction] Matched department "${match}" from "${candidate}" for phone ${cleanPhone}`);
                        // Overwrite any stale cached department with real-time selection
                        recordRecentDepartmentSelection(cleanPhone, match);
                        return match;
                    }
                }
            }
        }
    }
    catch (err) {
        console.warn("[detectDepartmentFromRecentMessages] Error:", err.message || err);
    }
    // Fallback to recent in-memory selection
    const cachedDept = getRecentDepartmentSelection(cleanPhone);
    if (cachedDept) {
        const matchedCached = matchDepartmentFromTitle(cachedDept) || cachedDept.trim();
        return matchedCached;
    }
    return dept && !dept.includes("@") && !dept.includes("{{") ? dept.trim() : null;
}
/**
 * Expose available dates for a department (GET or POST)
 */
const handleDates = async (req, res, next) => {
    try {
        const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {});
        const rawCandidatePhone = req.query?.phone ?? req.query?.phoneNumber ?? req.query?.customerNumber ??
            data.phone ?? data.phoneNumber ?? data.customerNumber ?? data.mobile ?? "";
        const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
        const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
        let rawDept = String(req.query.department ?? req.query.service ?? req.query.selected_service ??
            data.department ?? data.service ?? data.selected_service ?? data.service_name ?? "").trim();
        const matched = matchDepartmentFromTitle(rawDept);
        if (cleanPhone && matched) {
            recordRecentDepartmentSelection(cleanPhone, matched);
            rawDept = matched;
        }
        else if (cleanPhone && (!rawDept || rawDept.includes("@") || rawDept.includes("{{") || rawDept.toLowerCase() === "child and parental counselling")) {
            const detected = await detectDepartmentFromRecentMessages(cleanPhone, rawDept);
            if (detected)
                rawDept = detected;
        }
        const department = normalizeDepartment(rawDept);
        const dates = await getAvailableDates(department || "Child and Parental Counselling");
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
        const rawCandidatePhone = req.query?.phone ?? req.query?.phoneNumber ?? req.query?.customerNumber ??
            data.phone ?? data.phoneNumber ?? data.customerNumber ?? data.mobile ?? "";
        const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
        const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
        let rawDept = String(req.query.department ?? req.query.service ?? req.query.selected_service ??
            data.department ?? data.service ?? data.selected_service ?? data.service_name ?? "").trim();
        const matched = matchDepartmentFromTitle(rawDept);
        if (cleanPhone && matched) {
            recordRecentDepartmentSelection(cleanPhone, matched);
            rawDept = matched;
        }
        else if (cleanPhone && (!rawDept || rawDept.includes("@") || rawDept.includes("{{") || rawDept.toLowerCase() === "child and parental counselling")) {
            const detected = await detectDepartmentFromRecentMessages(cleanPhone, rawDept);
            if (detected)
                rawDept = detected;
        }
        const department = normalizeDepartment(rawDept);
        const rawDate = String(req.query.date ?? req.query.appointment_date ?? req.query.selected_date ??
            data.date ?? data.appointment_date ?? data.selected_date ?? data.date_of_appointment ?? "").trim();
        const date = normalizeAppointmentDate(rawDate);
        const slots = await getAvailableSlots(department || "Child and Parental Counselling", date);
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
 * POST /api/msg91-booking and /msg91/booking
 * Receives incoming appointment booking requests from MSG91 bot flows.
 */
msg91BookingRouter.post(["/", "/booking"], async (req, res) => {
    console.log("==> Incoming MSG91 Booking Payload:", req.body);
    try {
        const rawBody = (req.body ?? {});
        const nestedData = (rawBody.data ?? rawBody.payload ?? rawBody.variables ?? {});
        // Extract phone to clean last 10 digits
        const rawCandidatePhone = rawBody.phoneNumber ||
            rawBody.customerNumber ||
            rawBody.phone ||
            rawBody.mobile ||
            rawBody.contact ||
            rawBody.sender ||
            nestedData.phoneNumber ||
            nestedData.customerNumber ||
            nestedData.phone ||
            nestedData.mobile ||
            nestedData.contact ||
            nestedData.sender ||
            nestedData.customer_number ||
            nestedData.from ||
            rawBody.customer_number ||
            rawBody.from ||
            req.query?.phone ||
            req.query?.phoneNumber ||
            req.query?.customerNumber ||
            "";
        const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
        let cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
        if (!cleanPhone && typeof req.body === "string") {
            const match = req.body.match(/\d{10,12}/);
            if (match)
                cleanPhone = match[0].slice(-10);
        }
        // 1. Extract chosen service title / department from interactive list replies and standard keys
        let chosenService = String(rawBody.service ||
            rawBody.department ||
            rawBody.selectedService ||
            rawBody.service_name ||
            rawBody.selected_service ||
            rawBody.selected_department ||
            rawBody.interactive?.list_reply?.title ||
            rawBody.list_reply?.title ||
            nestedData.service ||
            nestedData.department ||
            nestedData.selectedService ||
            nestedData.service_name ||
            nestedData.selected_service ||
            nestedData.selected_department ||
            nestedData.interactive?.list_reply?.title ||
            nestedData.list_reply?.title ||
            "").trim();
        // 1 & 2. Check if incoming department is empty, undefined, contains '@', contains '{{', or equals 'Child and Parental Counselling'
        // If it needs resolution, auto-detect chosen department from recent WhatsApp messages in db.collection("webhookmessages")
        const detectedDept = await detectDepartmentFromRecentMessages(cleanPhone, chosenService);
        if (detectedDept) {
            console.log(`[MSG91 Booking] Auto-detected department "${detectedDept}" from recent WhatsApp chat history for phone ${cleanPhone}`);
            chosenService = detectedDept;
        }
        if (chosenService) {
            rawBody.service = chosenService;
            rawBody.department = chosenService;
            rawBody.rawDepartment = chosenService;
            if (typeof rawBody.data === "object" && rawBody.data !== null) {
                rawBody.data.service = chosenService;
                rawBody.data.department = chosenService;
                rawBody.data.rawDepartment = chosenService;
            }
            if (typeof rawBody.payload === "object" && rawBody.payload !== null) {
                rawBody.payload.service = chosenService;
                rawBody.payload.department = chosenService;
                rawBody.payload.rawDepartment = chosenService;
            }
            if (typeof rawBody.variables === "object" && rawBody.variables !== null) {
                rawBody.variables.service = chosenService;
                rawBody.variables.department = chosenService;
                rawBody.variables.rawDepartment = chosenService;
            }
        }
        const { appointment, duplicate } = await saveMsg91Appointment(rawBody);
        console.info(`[MSG91 Booking] ${duplicate ? "Existing booking updated" : "New booking created"}: ${appointment.bookingId}`);
        // Final appointment department: preserve the exact user selection without overrides
        const finalDepartment = (detectedDept ||
            chosenService ||
            appointment.rawDepartment ||
            appointment.department ||
            "Child and Parental Counselling").trim();
        appointment.department = finalDepartment;
        appointment.rawDepartment = finalDepartment;
        // 1. Log to WebhookMessage (for WhatsApp Messages dashboard)
        try {
            await WebhookMessage.create({
                rawData: req.body,
                phone: appointment.phoneNumber || cleanPhone || "",
                childName: appointment.patientName || "Not specified",
                parentName: appointment.parentName || "",
                age: appointment.age !== undefined && appointment.age !== null ? String(appointment.age) : "",
                firstSession: appointment.firstSession || "",
                isFirstSession: appointment.isFirstSession,
                appointmentDate: appointment.appointmentDate || "",
                appointmentTime: appointment.appointmentTime || "",
                department: finalDepartment,
                service: finalDepartment,
                concern: appointment.mainConcern || "",
                assignedTherapist: appointment.therapistName || "Ms. Tanu Rajput",
                assignedTherapistId: appointment.therapistId || "roster-counselling-1",
                status: "confirmed",
                session_frequency: appointment.session_frequency || "",
                totalSessions: appointment.totalSessions || 1,
                sessionSchedule: appointment.sessionSchedule || [],
                sessionScheduleText: appointment.sessionScheduleText || "",
                feeCharged: appointment.feeCharged ?? appointment.amount ?? 0,
                amount: appointment.amount || 0,
                bookingSource: "whatsapp",
            });
            console.log(`[MSG91 Booking] Logged appointment payload to WebhookMessage with department "${finalDepartment}" and service "${finalDepartment}"`);
        }
        catch (dbErr) {
            console.error("[MSG91 Booking] Failed to log WebhookMessage:", dbErr.message);
        }
        // 2. Guarantee department and service are saved in both db.collection("appointments") and db.collection("webhookmessages")
        try {
            const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
            if (db) {
                // Save to db.collection("appointments")
                if (appointment.bookingId || appointment.phoneNumber) {
                    const apptFilters = [];
                    if (appointment.bookingId)
                        apptFilters.push({ bookingId: appointment.bookingId });
                    if (appointment.id)
                        apptFilters.push({ id: appointment.id });
                    if (appointment.phoneNumber && appointment.appointmentDate) {
                        apptFilters.push({ phoneNumber: appointment.phoneNumber, appointmentDate: appointment.appointmentDate });
                    }
                    if (cleanPhone && appointment.appointmentDate) {
                        apptFilters.push({ phoneNumber: { $regex: cleanPhone + "$" }, appointmentDate: appointment.appointmentDate });
                    }
                    if (apptFilters.length > 0) {
                        await db.collection("appointments").updateMany({ $or: apptFilters }, {
                            $set: {
                                department: finalDepartment,
                                rawDepartment: finalDepartment,
                                therapistName: appointment.therapistName,
                                therapistId: appointment.therapistId,
                                assignedTherapist: appointment.therapistName,
                                assignedTherapistId: appointment.therapistId,
                                updatedAt: new Date().toISOString(),
                            },
                        });
                        console.log(`[MSG91 Booking] Updated department "${finalDepartment}" and therapist "${appointment.therapistName}" in db.collection("appointments")`);
                    }
                }
                // Save to db.collection("webhookmessages")
                const ph = cleanPhone || (appointment.phoneNumber ? appointment.phoneNumber.replace(/\D/g, "").slice(-10) : "");
                const whFilters = [];
                if (appointment.bookingId) {
                    whFilters.push({ "rawData.bookingId": appointment.bookingId });
                    whFilters.push({ bookingId: appointment.bookingId });
                }
                if (ph && appointment.appointmentDate) {
                    whFilters.push({ phone: { $regex: ph + "$" }, appointmentDate: appointment.appointmentDate });
                    whFilters.push({ phoneNumber: { $regex: ph + "$" }, appointmentDate: appointment.appointmentDate });
                }
                else if (ph) {
                    whFilters.push({ phone: { $regex: ph + "$" } });
                    whFilters.push({ phoneNumber: { $regex: ph + "$" } });
                }
                if (whFilters.length > 0) {
                    await db.collection("webhookmessages").updateMany({ $or: whFilters }, {
                        $set: {
                            department: finalDepartment,
                            service: finalDepartment,
                            assignedTherapist: appointment.therapistName,
                            assignedTherapistId: appointment.therapistId,
                        },
                    });
                    console.log(`[MSG91 Booking] Updated department "${finalDepartment}", service, and therapist in db.collection("webhookmessages")`);
                }
            }
        }
        catch (updateErr) {
            console.error("[MSG91 Booking] Failed to update department in collections:", updateErr.message);
        }
        // 3. Sync to chatbotsubmissions (for WhatsApp Appointments dashboard)
        try {
            const db = mongoose.connection.db;
            if (db && (appointment.phoneNumber || cleanPhone)) {
                const txnId = appointment.bookingId || `MSG91-${Date.now()}`;
                await db.collection("chatbotsubmissions").updateOne({ transactionId: txnId }, {
                    $set: {
                        phone: appointment.phoneNumber || cleanPhone,
                        message: appointment.mainConcern || `Appointment for ${appointment.patientName}`,
                        department: finalDepartment,
                        service: finalDepartment,
                        userDetails: {
                            name: appointment.patientName || undefined,
                            age: appointment.age || undefined,
                            parentName: appointment.parentName || undefined,
                            problem: appointment.mainConcern || appointment.therapistName || undefined,
                            appointmentDate: appointment.appointmentDate,
                            appointmentTime: appointment.appointmentTime,
                            department: finalDepartment,
                            service: finalDepartment,
                            assignedTherapist: appointment.therapistName || "Ms Tanu Rajput",
                            session_frequency: appointment.session_frequency,
                            totalSessions: appointment.totalSessions,
                            sessionSchedule: appointment.sessionSchedule || [],
                            sessionScheduleText: appointment.sessionScheduleText || "",
                            feeCharged: appointment.feeCharged ?? appointment.amount ?? 0,
                        },
                        assignedTherapist: appointment.therapistName || "Ms Tanu Rajput",
                        assignedTherapistId: appointment.therapistId || "roster-counselling-1",
                        status: "confirmed",
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
        // Clear stale in-memory cached department so past selections never leak into future sessions
        clearRecentDepartmentSelection(cleanPhone);
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
msg91BookingRouter.all("/calculate-fee", async (req, res) => {
    try {
        const data = { ...(req.query || {}), ...(req.body || {}) };
        const rawCandidatePhone = data.phone ||
            data.phoneNumber ||
            data.customerNumber ||
            data.mobile ||
            "";
        const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
        const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
        let isNew;
        const rawIsNew = data.isNew ?? data.is_new ?? data.is_new_patient ?? data.isNewPatient ?? data.firstSession ?? data.isFirstSession;
        if (rawIsNew !== undefined && rawIsNew !== null && rawIsNew !== "") {
            isNew = rawIsNew === true || rawIsNew === "true" || rawIsNew === "yes" || rawIsNew === 1 || rawIsNew === "1";
        }
        else if (cleanPhone) {
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
            }
            else {
                isNew = false;
            }
        }
        else {
            isNew = false;
        }
        const appointmentType = String(data.appointmentType ?? data.appointment_type ?? data.paymentMode ?? data.payment_mode ?? data.mode ?? "in-person").trim();
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
    }
    catch (error) {
        console.error("[calculate-fee] Error:", error.message || error);
        return res.json({ success: true, amount: 800, totalSessions: 1, feeCharged: 800 });
    }
});
/**
 * ALL /api/msg91/check-patient-status and /msg91/check-patient-status
 * Handles both GET and POST requests.
 * Checks whether a phone number has any existing (non-cancelled/non-rejected)
 * appointments or bookings.
 * Resiliently extracts phone from query, body, params, nested payload, or customerNumber.
 * Never throws 400: defaults gracefully to isNew=true if phone is missing or invalid.
 */
msg91BookingRouter.all(["/check-patient-status", "/msg91/check-patient-status"], async (req, res) => {
    try {
        await connectMongoDb().catch(() => { });
        const body = req.body || {};
        const query = req.query || {};
        const params = req.params || {};
        const nested = body.data || body.payload || body.variables || {};
        // 1. Extract phone from req.body, req.query, params, or nested data
        const rawCandidate = body.phoneNumber ||
            body.customerNumber ||
            body.phone ||
            query.phoneNumber ||
            query.customerNumber ||
            query.phone ||
            params.phoneNumber ||
            params.customerNumber ||
            params.phone ||
            body.mobile ||
            body.contact ||
            body.sender ||
            (body.data && (body.data.phone || body.data.phoneNumber || body.data.contact || body.data.sender || body.data.customerNumber)) ||
            nested.phone ||
            nested.phoneNumber ||
            nested.customerNumber ||
            nested.mobile ||
            nested.contact ||
            nested.sender ||
            nested.customer_number ||
            nested.from ||
            body.customer_number ||
            body.customer_no ||
            body.mobile_number ||
            body.phone_number ||
            body.from ||
            body.number ||
            query.mobile ||
            query.contact ||
            query.sender ||
            query.customer_number ||
            query.from ||
            "";
        let rawPhone = (rawCandidate || "").toString().trim();
        // Fallback if candidate was empty but raw body is string containing phone digits
        if (!rawPhone && typeof req.body === "string") {
            const match = req.body.match(/\d{10,12}/);
            if (match)
                rawPhone = match[0];
        }
        // 2. Sanitize: strip non-digit characters and take the last 10 digits
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        let digitsOnly = rawPhone.replace(/\D/g, "");
        let cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
        // If phone is missing from request, fallback to latest webhook or appointment in DB
        if (!cleanPhone && db) {
            try {
                const [recentWebhook, recentAppt] = await Promise.all([
                    db.collection("webhookmessages").findOne({}, { sort: { receivedAt: -1, createdAt: -1, _id: -1 } }).catch(() => null),
                    db.collection("appointments").findOne({}, { sort: { createdAt: -1, _id: -1 } }).catch(() => null),
                ]);
                const fallbackPhone = recentWebhook?.phone ||
                    recentWebhook?.rawData?.customerNumber ||
                    recentWebhook?.rawData?.phoneNumber ||
                    recentAppt?.phoneNumber ||
                    recentAppt?.phone ||
                    recentAppt?.rawPayload?.customerNumber ||
                    recentAppt?.rawPayload?.phoneNumber ||
                    "";
                if (fallbackPhone) {
                    const fbDigits = String(fallbackPhone).replace(/\D/g, "");
                    if (fbDigits.length >= 10) {
                        cleanPhone = fbDigits.slice(-10);
                        console.log(`[check-patient-status] Phone was missing in request, fell back to latest DB record phone: ${cleanPhone}`);
                    }
                }
            }
            catch (fbErr) {
                console.warn("[check-patient-status] Error fetching fallback phone:", fbErr?.message || fbErr);
            }
        }
        // If phone is STILL missing or empty, do NOT throw 400! Log a warning and return HTTP 200 fallback
        if (!cleanPhone) {
            console.warn(`[check-patient-status] Missing or empty phone parameter: ${JSON.stringify(req.body)}. Defaulting to new patient.`);
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
                    patientName: "",
                    childName: "",
                    status: "new",
                    count: 0,
                },
            });
        }
        // 3. Query DB for existing appointments/messages matching last 10 digits regex
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
    }
    catch (error) {
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
