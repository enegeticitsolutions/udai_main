import { Router } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import { config } from "../config.js";
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
    if (!str || str.startsWith("@") || str.startsWith("{{") || str.includes("@") || str.includes("{{"))
        return null;
    if (/Physical\s*Therapy/i.test(str))
        return "Physical Therapy";
    if (/Physiotherapy|Physio/i.test(str))
        return "Physiotherapy";
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
 * Calculates upcoming dates for routine recurring slots.
 * Format: "Mon 19 Oct, Wed 21 Oct, Fri 23 Oct"
 */
export function calculateNextDates(slots) {
    if (!Array.isArray(slots) || slots.length === 0)
        return "";
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const currentIdx = now.getDay();
    const entries = [];
    const seenDays = new Set();
    for (const slot of slots) {
        const rawDay = typeof slot === "string" ? slot : (slot?.day_of_week || slot?.day || "");
        if (!rawDay)
            continue;
        const targetIdx = days.indexOf(String(rawDay).trim().toLowerCase());
        if (targetIdx === -1)
            continue;
        if (seenDays.has(targetIdx))
            continue;
        seenDays.add(targetIdx);
        let diff = targetIdx - currentIdx;
        if (diff <= 0)
            diff += 7;
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + diff);
        const dayName = shortDays[targetDate.getDay()];
        const dayNum = targetDate.getDate();
        const monthName = shortMonths[targetDate.getMonth()];
        entries.push({
            targetDate,
            text: `${dayName} ${dayNum} ${monthName}`,
        });
    }
    // Sort chronologically by date
    entries.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
    return entries.map((e) => e.text).join(", ");
}
/**
 * Auto-detect chosen department from recent WhatsApp messages in db.collection("webhookmessages")
 * Always queries the absolute latest interactive webhook first to prevent stale cache leakage.
 */
export async function detectDepartmentFromRecentMessages(cleanPhone, incomingDept) {
    const dept = String(incomingDept || "").trim();
    const isInvalid = !dept || dept.startsWith("@") || dept.startsWith("{{") || dept.includes("@") || dept.includes("{{");
    if (!isInvalid) {
        const directMatch = matchDepartmentFromTitle(dept);
        if (directMatch) {
            recordRecentDepartmentSelection(cleanPhone, directMatch);
            return directMatch;
        }
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
                    { "rawData.sender": { $regex: cleanPhone + "$" } },
                ],
            })
                .sort({ receivedAt: -1, createdAt: -1, _id: -1 })
                .limit(15)
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
                    msg.rawData?.text?.body,
                    msg.message,
                    msg.rawData?.list_reply?.title,
                    msg.rawData?.button_reply?.title,
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
    return dept && !dept.startsWith("@") && !dept.startsWith("{{") && !dept.includes("@") && !dept.includes("{{") ? dept.trim() : null;
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
        // 1 & 2. Identify the user's clicked service and target incoming webhook for THIS specific flow run
        let targetWebhookId = null;
        let detectedDept = null;
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (db && cleanPhone) {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
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
                    { "rawData.sender": { $regex: cleanPhone + "$" } },
                ],
            })
                .sort({ receivedAt: -1, createdAt: -1, _id: -1 })
                .limit(10)
                .toArray();
            // Priority 1: inspect interactive list_reply / button_reply within the last 2 minutes
            for (const msg of recentMsgs) {
                const ts = msg.receivedAt || msg.createdAt;
                const msgDate = ts ? new Date(ts) : null;
                if (msgDate && !isNaN(msgDate.getTime()) && msgDate < twoMinutesAgo)
                    continue;
                const interactiveCandidates = [
                    msg.rawData?.interactive?.list_reply?.title,
                    msg.rawData?.interactive?.button_reply?.title,
                    msg.rawData?.text?.body,
                    msg.message,
                    msg.rawData?.list_reply?.title,
                    msg.rawData?.button_reply?.title,
                ];
                for (const candidate of interactiveCandidates) {
                    const match = matchDepartmentFromTitle(candidate);
                    if (match) {
                        detectedDept = match;
                        targetWebhookId = msg._id;
                        console.log(`[MSG91 Booking] Matched department "${match}" from session webhook _id=${msg._id} within last 2 minutes`);
                        break;
                    }
                }
                if (detectedDept)
                    break;
            }
            // Priority 2: fallback up to 15 minutes if not detected in last 2 minutes
            if (!detectedDept) {
                for (const msg of recentMsgs) {
                    const ts = msg.receivedAt || msg.createdAt;
                    const msgDate = ts ? new Date(ts) : null;
                    if (msgDate && !isNaN(msgDate.getTime()) && msgDate < fifteenMinutesAgo)
                        continue;
                    const candidates = [
                        msg.rawData?.interactive?.list_reply?.title,
                        msg.rawData?.interactive?.button_reply?.title,
                        msg.rawData?.text?.body,
                        msg.message,
                        msg.rawData?.list_reply?.title,
                        msg.rawData?.button_reply?.title,
                    ];
                    for (const candidate of candidates) {
                        const match = matchDepartmentFromTitle(candidate);
                        if (match) {
                            detectedDept = match;
                            targetWebhookId = msg._id;
                            console.log(`[MSG91 Booking] Matched department "${match}" from session webhook _id=${msg._id} (fallback)`);
                            break;
                        }
                    }
                    if (detectedDept)
                        break;
                }
            }
            // If no interactive match was found, still associate with the latest session message _id within 2 minutes
            if (!targetWebhookId && recentMsgs.length > 0) {
                const latest = recentMsgs[0];
                const ts = latest.receivedAt || latest.createdAt;
                const msgDate = ts ? new Date(ts) : null;
                if (msgDate && !isNaN(msgDate.getTime()) && msgDate >= twoMinutesAgo) {
                    targetWebhookId = latest._id;
                }
            }
        }
        const isInvalidChosen = !chosenService || chosenService.startsWith("@") || chosenService.startsWith("{{") || chosenService.includes("@") || chosenService.includes("{{");
        if (detectedDept && (isInvalidChosen || chosenService.toLowerCase() === "child and parental counselling")) {
            chosenService = detectedDept;
        }
        else {
            const direct = matchDepartmentFromTitle(chosenService);
            if (direct)
                chosenService = direct;
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
        const finalDepartment = (chosenService ||
            appointment.rawDepartment ||
            appointment.department ||
            "Child and Parental Counselling").trim();
        appointment.department = finalDepartment;
        appointment.rawDepartment = finalDepartment;
        // 3. Update ONLY the specific incoming webhook document for this session in db.collection("webhookmessages") using its exact _id
        try {
            if (db && targetWebhookId) {
                await db.collection("webhookmessages").updateOne({ _id: targetWebhookId }, {
                    $set: {
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
                        assignedTherapist: appointment.therapistName,
                        assignedTherapistId: appointment.therapistId,
                        status: "confirmed",
                        bookingStatus: "confirmed",
                        session_frequency: appointment.session_frequency || "",
                        totalSessions: appointment.totalSessions || 1,
                        sessionSchedule: appointment.sessionSchedule || [],
                        sessionScheduleText: appointment.sessionScheduleText || "",
                        feeCharged: appointment.feeCharged ?? appointment.amount ?? 0,
                        amount: appointment.amount || 0,
                        bookingSource: "whatsapp",
                        bookingId: appointment.bookingId,
                        receivedAt: new Date(),
                        updatedAt: new Date().toISOString(),
                    },
                });
                console.log(`[MSG91 Booking] Updated specific webhook document (_id: ${targetWebhookId}) with department "${finalDepartment}" and therapist "${appointment.therapistName}"`);
            }
            else {
                // If no prior webhook document in this session, create a single new one
                await WebhookMessage.create({
                    rawData: req.body,
                    receivedAt: new Date(),
                    createdAt: new Date(),
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
                    assignedTherapist: appointment.therapistName,
                    assignedTherapistId: appointment.therapistId || undefined,
                    status: "confirmed",
                    session_frequency: appointment.session_frequency || "",
                    totalSessions: appointment.totalSessions || 1,
                    sessionSchedule: appointment.sessionSchedule || [],
                    sessionScheduleText: appointment.sessionScheduleText || "",
                    feeCharged: appointment.feeCharged ?? appointment.amount ?? 0,
                    amount: appointment.amount || 0,
                    bookingSource: "whatsapp",
                    bookingId: appointment.bookingId,
                });
                console.log(`[MSG91 Booking] Created isolated WebhookMessage with department "${finalDepartment}" and therapist "${appointment.therapistName}"`);
            }
        }
        catch (whErr) {
            console.error("[MSG91 Booking] Failed to save/update WebhookMessage:", whErr.message);
        }
        // 4. Sync ONLY this single transaction to chatbotsubmissions (for WhatsApp Appointments dashboard)
        try {
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
        // 5. Razorpay dynamic payment link integration
        let paymentUrl = "";
        let paymentLinkId = "";
        const fee = appointment.feeCharged ?? appointment.amount ?? 800;
        try {
            const keyId = process.env.RAZORPAY_KEY_ID || config.razorpayKeyId;
            const keySecret = process.env.RAZORPAY_KEY_SECRET || config.razorpayKeySecret;
            if (keyId && keySecret) {
                const razorpay = new Razorpay({
                    key_id: keyId,
                    key_secret: keySecret,
                });
                const customerContact = cleanPhone
                    ? (cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone.slice(-10)}`)
                    : undefined;
                const customerName = appointment.parentName || appointment.patientName || "Parent";
                const paymentLinkPayload = {
                    amount: Math.round(Number(fee) * 100),
                    currency: "INR",
                    accept_partial: false,
                    description: `Appointment Booking for ${appointment.patientName || "Patient"} (${appointment.bookingId})`,
                    customer: {
                        name: customerName,
                        contact: customerContact,
                        ...(rawBody.email || nestedData.email ? { email: rawBody.email || nestedData.email } : {}),
                    },
                    notify: {
                        sms: false,
                        email: false,
                    },
                    reminder_enable: false,
                    notes: {
                        bookingId: appointment.bookingId,
                        childName: appointment.patientName || "",
                        department: finalDepartment,
                    },
                };
                const paymentLink = await razorpay.paymentLink.create(paymentLinkPayload);
                paymentUrl = paymentLink?.short_url || "";
                paymentLinkId = paymentLink?.id || "";
                console.log(`✅ [MSG91 Booking] Razorpay Payment Link Created: ${paymentLinkId} -> ${paymentUrl}`);
                if (db && appointment.bookingId && paymentUrl) {
                    await db.collection("appointments").updateOne({ bookingId: appointment.bookingId }, {
                        $set: {
                            paymentUrl,
                            paymentLinkId,
                            paymentStatus: "pending",
                            updatedAt: new Date().toISOString(),
                        },
                    });
                    if (targetWebhookId) {
                        await db.collection("webhookmessages").updateOne({ _id: targetWebhookId }, { $set: { paymentUrl, paymentLinkId, updatedAt: new Date().toISOString() } });
                    }
                    await db.collection("chatbotsubmissions").updateOne({ transactionId: appointment.bookingId }, { $set: { paymentUrl, paymentLinkId, updatedAt: new Date() } });
                }
            }
            else {
                console.warn("⚠️ [MSG91 Booking] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured");
            }
        }
        catch (rzpErr) {
            console.error("❌ [MSG91 Booking] Failed to create Razorpay payment link:", rzpErr?.message || rzpErr);
        }
        res.status(200).json({
            success: true,
            status: "success",
            bookingId: appointment.bookingId,
            fee: fee,
            paymentUrl: paymentUrl,
            paymentLinkId: paymentLinkId,
            data: {
                ...appointment,
                paymentUrl,
                paymentLinkId,
                fee,
            },
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
 * Checks whether incoming phone number is a frequent/routine patient with a schedule.
 * Returns HTTP 200 with patient details and routine schedule summary if frequent/routine.
 * Returns HTTP 404 with { success: false, message: 'Not frequent' } if new or no routine schedule found.
 */
msg91BookingRouter.all(["/check-patient-status", "/msg91/check-patient-status"], async (req, res) => {
    try {
        await connectMongoDb().catch(() => { });
        const body = (req.body && typeof req.body === "object" ? req.body : {});
        const query = (req.query && typeof req.query === "object" ? req.query : {});
        const params = (req.params && typeof req.params === "object" ? req.params : {});
        const nestedData = (body.data && typeof body.data === "object" ? body.data : {});
        const nestedVars = (body.variables && typeof body.variables === "object" ? body.variables : {});
        const nestedPayload = (body.payload && typeof body.payload === "object" ? body.payload : {});
        // 1. Extract phone from all possible locations in query, body, variables, data, payload, or params
        const phoneCandidates = [
            query.phone, query.phoneNumber, query.phone_number, query.customerNumber, query.customer_number, query.customer_no, query.mobile, query.mobile_number, query.contact, query.sender, query.from, query.wa_id, query.wa_number, query.caller, query.user_phone, query.number, query.msisdn,
            body.phone, body.phoneNumber, body.phone_number, body.customerNumber, body.customer_number, body.customer_no, body.mobile, body.mobile_number, body.mobile_no, body.contact, body.sender, body.from, body.wa_id, body.wa_number, body.whatsapp_number, body.caller, body.user_phone, body.number, body.msisdn,
            nestedVars.phone, nestedVars.phoneNumber, nestedVars.phone_number, nestedVars.customerNumber, nestedVars.customer_number, nestedVars.customer_no, nestedVars.mobile, nestedVars.mobile_number, nestedVars.contact, nestedVars.sender, nestedVars.from, nestedVars.wa_id, nestedVars.wa_number, nestedVars.caller, nestedVars.user_phone, nestedVars.number,
            nestedData.phone, nestedData.phoneNumber, nestedData.phone_number, nestedData.customerNumber, nestedData.customer_number, nestedData.customer_no, nestedData.mobile, nestedData.mobile_number, nestedData.contact, nestedData.sender, nestedData.from, nestedData.wa_id, nestedData.wa_number, nestedData.caller, nestedData.user_phone, nestedData.number,
            nestedPayload.phone, nestedPayload.phoneNumber, nestedPayload.phone_number, nestedPayload.customerNumber, nestedPayload.customer_number, nestedPayload.customer_no, nestedPayload.mobile, nestedPayload.mobile_number, nestedPayload.contact, nestedPayload.sender, nestedPayload.from, nestedPayload.wa_id, nestedPayload.wa_number, nestedPayload.caller, nestedPayload.user_phone, nestedPayload.number,
            params.phone, params.phoneNumber, params.customerNumber
        ];
        let rawPhone = "";
        for (const c of phoneCandidates) {
            if (c !== undefined && c !== null && String(c).trim() !== "" && !String(c).includes("{{") && !String(c).startsWith("@")) {
                const d = String(c).replace(/\D/g, "");
                if (d.length >= 10) {
                    rawPhone = String(c).trim();
                    break;
                }
            }
        }
        // Fallback: check query or body values if no candidate was found
        if (!rawPhone) {
            const searchPool = [...Object.values(query), ...Object.values(body), ...Object.values(nestedVars), ...Object.values(nestedData)];
            for (const val of searchPool) {
                if (typeof val === "string" || typeof val === "number") {
                    const d = String(val).replace(/\D/g, "");
                    if (d.length >= 10 && d.length <= 13) {
                        rawPhone = String(val);
                        break;
                    }
                }
            }
        }
        // Fallback if raw body is string containing phone digits
        if (!rawPhone && typeof req.body === "string") {
            const match = req.body.match(/\d{10,13}/);
            if (match)
                rawPhone = match[0];
        }
        // 2. Sanitize: strip non-digit characters and take the last 10 digits
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        const digitsOnly = rawPhone.replace(/\D/g, "");
        const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
        console.log("--> MSG91 HIT: check-patient-status", {
            method: req.method,
            query: req.query,
            body: req.body,
            receivedPhone: rawPhone,
            cleanPhone: cleanPhone,
        });
        // If phone is missing or empty, do NOT query DB. Return HTTP 404 Not frequent
        if (!cleanPhone || cleanPhone.length < 10) {
            console.log("--> MSG91 HIT: Status Code sent: 404 (Missing or invalid phone parameter)");
            return res.status(404).json({
                success: false,
                message: "Not frequent",
                status: "new",
                isNew: true,
                is_new: true,
                is_new_patient: "true",
                isNewPatient: true,
                is_new_patient_bool: true,
                is_returning: false,
                isReturning: false,
                existingPatient: false,
                existing_patient: false,
                is_frequent: false,
                isFrequent: false,
                data: {
                    success: false,
                    message: "Not frequent",
                    status: "new",
                    isNew: true,
                    is_new: true,
                    is_returning: false,
                    is_frequent: false,
                },
            });
        }
        // 3. Query DB for existing appointments/messages matching last 10 digits regex
        let count = 0;
        let patientName = "";
        let recurringChild = null;
        let routineSummary = "";
        let therapyName = "";
        if (db) {
            const phoneRegex = new RegExp(`${cleanPhone}$`);
            const phoneVariants = [
                cleanPhone,
                `+91${cleanPhone}`,
                `91${cleanPhone}`,
                `0${cleanPhone}`,
                Number(cleanPhone),
                Number(`91${cleanPhone}`),
            ];
            const phoneOrQueries = [];
            for (const field of ["parent_phone", "parentPhone", "phone", "phoneNumber", "mobile", "parent_mobile"]) {
                for (const variant of phoneVariants) {
                    phoneOrQueries.push({ [field]: variant });
                }
                phoneOrQueries.push({ [field]: phoneRegex });
            }
            const apptFilter = {
                $or: [
                    ...phoneVariants.flatMap((v) => [
                        { phoneNumber: v },
                        { phone: v },
                        { "rawPayload.customerNumber": v },
                        { "rawPayload.phoneNumber": v },
                        { "rawPayload.phone": v },
                    ]),
                    { phoneNumber: phoneRegex },
                    { phone: phoneRegex },
                    { "rawPayload.customerNumber": phoneRegex },
                    { "rawPayload.phoneNumber": phoneRegex },
                    { "rawPayload.phone": phoneRegex },
                ],
                bookingStatus: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
            };
            const webhookFilter = {
                $or: [
                    ...phoneVariants.flatMap((v) => [
                        { phone: v },
                        { phoneNumber: v },
                        { "rawData.customerNumber": v },
                        { "rawData.phoneNumber": v },
                        { "rawData.phone": v },
                    ]),
                    { phone: phoneRegex },
                    { phoneNumber: phoneRegex },
                    { "rawData.customerNumber": phoneRegex },
                    { "rawData.phoneNumber": phoneRegex },
                    { "rawData.phone": phoneRegex },
                ],
                status: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
            };
            const [apptCount, webhookCount, latestAppt, latestWebhook] = await Promise.all([
                db.collection("appointments").countDocuments(apptFilter).catch(() => 0),
                db.collection("webhookmessages").countDocuments(webhookFilter).catch(() => 0),
                db.collection("appointments").findOne(apptFilter, { sort: { createdAt: -1, _id: -1 } }).catch(() => null),
                db.collection("webhookmessages").findOne(webhookFilter, { sort: { createdAt: -1, _id: -1 } }).catch(() => null),
            ]);
            try {
                recurringChild = await db.collection("childSchedules").findOne({
                    status: { $regex: /^active$/i },
                    $or: phoneOrQueries,
                });
                if (!recurringChild) {
                    recurringChild = await db.collection("childSchedules").findOne({
                        $or: phoneOrQueries,
                    });
                }
                // In-memory fallback if phone had spaces/dashes/special formatting
                if (!recurringChild) {
                    const allActive = await db.collection("childSchedules").find({
                        status: { $regex: /^active$/i }
                    }).toArray().catch(() => []);
                    for (const doc of allActive) {
                        const p = String(doc.parent_phone || doc.parentPhone || doc.phone || doc.phoneNumber || "").replace(/\D/g, "");
                        if (p && p.endsWith(cleanPhone)) {
                            recurringChild = doc;
                            console.log(`[check-patient-status] In-memory fallback matched childSchedule: "${doc.child_name}" for phone: ${cleanPhone}`);
                            break;
                        }
                    }
                }
            }
            catch (childErr) {
                console.warn("[check-patient-status] Child schedule lookup error:", childErr.message);
            }
            if (!recurringChild) {
                try {
                    const routineBooking = await db.collection("routineBookings").findOne({
                        $or: [
                            ...phoneVariants.flatMap((v) => [{ parent_phone: v }, { phoneNumber: v }, { phone: v }]),
                            { parent_phone: phoneRegex },
                            { phoneNumber: phoneRegex },
                            { phone: phoneRegex },
                        ],
                    });
                    if (routineBooking) {
                        recurringChild = {
                            child_name: routineBooking.child_name || routineBooking.patientName || routineBooking.childName,
                            therapy_type: routineBooking.therapy_type || routineBooking.department,
                            recurring_slots: routineBooking.sessionSchedule || [],
                            status: routineBooking.status,
                        };
                    }
                }
                catch (rbErr) {
                    // ignore
                }
            }
            count = (apptCount || 0) + (webhookCount || 0) + (recurringChild ? 1 : 0);
            patientName =
                recurringChild?.child_name ||
                    latestAppt?.patientName ||
                    latestWebhook?.childName ||
                    latestWebhook?.patientName ||
                    latestAppt?.parentName ||
                    latestWebhook?.parentName ||
                    "";
            routineSummary = recurringChild?.recurring_slots && Array.isArray(recurringChild.recurring_slots)
                ? recurringChild.recurring_slots.map((s) => `${s.day_of_week} at ${s.start_time}${s.end_time ? `-${s.end_time}` : ""}`).join(", ")
                : "";
            therapyName = recurringChild?.therapy_type || recurringChild?.therapy_name || "";
        }
        const isFrequent = Boolean(recurringChild);
        const existingPatient = count > 0;
        const isNew = !existingPatient;
        console.log(`[check-patient-status] phone=${cleanPhone} existingPatient=${existingPatient} isFrequent=${isFrequent} totalCount=${count} patientName="${patientName}" => isNew=${isNew}`);
        if (isFrequent) {
            const upcomingDates = recurringChild?.recurring_slots
                ? calculateNextDates(recurringChild.recurring_slots)
                : "";
            console.log(`--> MSG91 HIT: Status Code sent: 200 OK for phone=${cleanPhone} (Frequent/routine patient: "${patientName}", Therapy: "${therapyName}", Upcoming: "${upcomingDates}")`);
            return res.status(200).json({
                success: true,
                isNew: false,
                is_new: false,
                is_new_patient: "false",
                isNewPatient: false,
                is_new_patient_bool: false,
                existingPatient: true,
                existing_patient: true,
                is_returning: true,
                isReturning: true,
                is_frequent: true,
                isFrequent: true,
                child_name: patientName,
                childName: patientName,
                patientName,
                therapy_name: therapyName,
                therapy_type: therapyName,
                routine_summary: routineSummary,
                slots_summary: routineSummary,
                upcoming_dates: upcomingDates,
                status: "returning",
                phone: cleanPhone,
                count,
                data: {
                    success: true,
                    isNew: false,
                    is_new: false,
                    is_new_patient: "false",
                    isNewPatient: false,
                    is_new_patient_bool: false,
                    existingPatient: true,
                    existing_patient: true,
                    is_returning: true,
                    isReturning: true,
                    is_frequent: true,
                    isFrequent: true,
                    child_name: patientName,
                    childName: patientName,
                    patientName,
                    therapy_name: therapyName,
                    routine_summary: routineSummary,
                    upcoming_dates: upcomingDates,
                    status: "returning",
                    count,
                },
            });
        }
        const patientStatus = isNew ? "new" : "returning";
        console.log(`--> MSG91 HIT: Status Code sent: 404 Not frequent for phone=${cleanPhone} (status="${patientStatus}", isNew=${isNew}, patientName="${patientName}")`);
        return res.status(404).json({
            success: false,
            message: "Not frequent",
            status: patientStatus,
            isNew: isNew,
            is_new: isNew,
            is_new_patient: String(isNew),
            isNewPatient: isNew,
            is_new_patient_bool: isNew,
            is_returning: !isNew,
            isReturning: !isNew,
            existingPatient: existingPatient,
            existing_patient: existingPatient,
            is_frequent: false,
            isFrequent: false,
            is_frequent_str: "false",
            is_frequent_bool: false,
            child_name: patientName,
            childName: patientName,
            patientName: patientName,
            phone: cleanPhone,
            phoneNumber: cleanPhone,
            count,
            data: {
                success: false,
                message: "Not frequent",
                status: patientStatus,
                isNew: isNew,
                is_new: isNew,
                is_new_patient: String(isNew),
                isNewPatient: isNew,
                is_new_patient_bool: isNew,
                is_returning: !isNew,
                isReturning: !isNew,
                existingPatient: existingPatient,
                existing_patient: existingPatient,
                is_frequent: false,
                isFrequent: false,
                child_name: patientName,
                childName: patientName,
                patientName: patientName,
                phone: cleanPhone,
                count,
            },
        });
    }
    catch (error) {
        console.error("[check-patient-status] Error:", error?.message || error);
        console.log("--> MSG91 HIT: Status Code sent: 404 (due to exception/error)");
        return res.status(404).json({
            success: false,
            message: "Not frequent",
            status: "new",
            isNew: true,
            is_new: true,
            is_new_patient: "true",
            isNewPatient: true,
            is_new_patient_bool: true,
            is_returning: false,
            isReturning: false,
            existingPatient: false,
            existing_patient: false,
            is_frequent: false,
            isFrequent: false,
            data: {
                success: false,
                message: "Not frequent",
                status: "new",
                isNew: true,
                is_new: true,
                is_returning: false,
                is_frequent: false,
            },
        });
    }
});
export default msg91BookingRouter;
