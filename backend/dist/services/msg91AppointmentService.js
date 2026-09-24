import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { getAvailableSlots } from "./bookingService.js";
/**
 * EXACT CLINIC ROSTER (Single Source of Truth)
 */
export const CLINIC_ROSTER = {
    "Occupational Therapy": ["Ms Harsimran Kaur", "Ms Nikki"],
    "Physiotherapy": ["Ms. Divya"],
    "Physical Therapy": ["Mr Durgesh"],
    "Special Education": ["Ms Sonia", "Ms Shobha", "Ms Ranjana"],
    "Speech Therapy": ["Ms Sakshi", "Mr Atal"],
    "Academic Support": ["Ms Sonia", "Ms Shobha"],
    "Child and Parental Counselling": ["Ms Tanu Rajput", "Ms Harsimran", "Ms Sonia"]
};
export class NoSlotsAvailableError extends Error {
    constructor(message = "No appointment slots available for the selected date.") {
        super(message);
        this.name = "NoSlotsAvailableError";
    }
}
export function generateSessionSchedule(startDate, startTime, totalSessions = 1) {
    const schedule = [];
    if (!startDate)
        return { schedule: [], scheduleText: "" };
    const timeStr = startTime || "10:00";
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    // Helper to parse date to noon to avoid timezone or DST boundary drift
    let curr;
    const ymdMatch = String(startDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
        curr = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]), 12, 0, 0);
    }
    else {
        const parsed = new Date(startDate);
        if (isNaN(parsed.getTime())) {
            schedule.push({ sessionNumber: 1, date: startDate, time: timeStr, day: "" });
            return { schedule, scheduleText: `Day 1: ${startDate} (${timeStr})` };
        }
        curr = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
    }
    const formatYMD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };
    schedule.push({
        sessionNumber: 1,
        date: formatYMD(curr),
        time: timeStr,
        day: dayNames[curr.getDay()],
    });
    while (schedule.length < totalSessions) {
        curr.setDate(curr.getDate() + 2);
        if (curr.getDay() === 0) {
            curr.setDate(curr.getDate() + 1); // Skip Sunday, move to Monday
        }
        schedule.push({
            sessionNumber: schedule.length + 1,
            date: formatYMD(curr),
            time: timeStr,
            day: dayNames[curr.getDay()],
        });
    }
    const scheduleText = schedule
        .map((s) => `Day ${s.sessionNumber}: ${s.date}${s.day ? ` (${s.day})` : ""} at ${s.time}`)
        .join(" | ");
    return { schedule, scheduleText };
}
// ── Pricing constants ────────────────────────────────────────────────────────
const FEE_ONLINE = 600; // ₹600 – online consultation (new or returning, non-counselling)
const FEE_OFFLINE = 800; // ₹800 – pay at clinic (new or returning, non-counselling)
const FEE_COUNSELLING_SINGLE = 1500; // ₹1500 – returning, counselling single session (1 day)
const FEE_COUNSELLING_2DAYS = 3000; // ₹3000 – returning, counselling 2-day package (2 days / week)
const FEE_COUNSELLING_3DAYS = 4500; // ₹4500 – returning, counselling 3-day package (3 days / week)
/**
 * Pure function that returns the appointment fee, totalSessions, and feeCharged
 * based on patient type, appointment mode, department, and session frequency.
 *
 * Pricing rules:
 *  - New patient  → Online: ₹600 | Offline: ₹800
 *  - Returning + Child and Parental Counselling (or legacy Counselling):
 *      "3 Days" / "4500"  → ₹4500, 3 sessions
 *      "2 Days" / "3000"  → ₹3000, 2 sessions
 *      Single / anything else → ₹1500, 1 session
 *  - Returning + any other service → Online: ₹600 | Offline: ₹800
 */
export function calculateAppointmentFee(params) {
    const { isNew, appointmentType, department, session_frequency = "" } = params;
    const isOnline = ["online", "video", "virtual"].includes(appointmentType.toLowerCase().trim());
    const deptLower = department.toLowerCase().replace(/[_ ]+/g, "-");
    const isCounselling = deptLower.includes("counsel") ||
        deptLower.includes("parental") ||
        department === "Child and Parental Counselling" ||
        department === "Counselling";
    // New patient — fee depends only on consultation mode
    if (isNew) {
        const amount = isOnline ? FEE_ONLINE : FEE_OFFLINE;
        return { amount, totalSessions: 1, feeCharged: amount };
    }
    // Returning patient + Child and Parental Counselling — tiered by session frequency
    if (isCounselling) {
        const sf = session_frequency.toLowerCase().trim();
        if (sf.includes("3 day") || sf.includes("3day") || sf.includes("4500") || sf.includes("3 session") || sf.includes("2400")) {
            return { amount: FEE_COUNSELLING_3DAYS, totalSessions: 3, feeCharged: FEE_COUNSELLING_3DAYS };
        }
        if (sf.includes("2 day") || sf.includes("2day") || sf.includes("3000") || sf.includes("2 session") || sf.includes("1600")) {
            return { amount: FEE_COUNSELLING_2DAYS, totalSessions: 2, feeCharged: FEE_COUNSELLING_2DAYS };
        }
        // Single session (default)
        return { amount: FEE_COUNSELLING_SINGLE, totalSessions: 1, feeCharged: FEE_COUNSELLING_SINGLE };
    }
    // Returning patient + other services — same online/offline tiers
    const amount = isOnline ? FEE_ONLINE : FEE_OFFLINE;
    return { amount, totalSessions: 1, feeCharged: amount };
}
const appointmentCollection = "appointments";
function storedAppointmentsPath() {
    return path.join(config.storageDir, "appointments.json");
}
function pick(body, ...keys) {
    if (!body || typeof body !== "object")
        return "";
    for (const key of keys) {
        const value = body[key];
        if (value !== undefined && value !== null) {
            if (typeof value === "string" && value.trim() !== "")
                return value.trim();
            if (typeof value === "number" || typeof value === "boolean")
                return String(value);
            if (typeof value === "object") {
                const obj = value;
                const inner = String(obj.value ?? obj.name ?? obj.label ?? obj.title ?? obj.id ?? "").trim();
                if (inner)
                    return inner;
            }
        }
    }
    return "";
}
function normalizePhone(value) {
    return String(value ?? "").replace(/[^\d]/g, "");
}
function normalizeAppointmentType(value) {
    const normalized = String(value ?? "").trim().toLowerCase().replace(/[_ ]+/g, "-");
    if (["inperson", "in-person", "offline", "clinic"].includes(normalized))
        return "in-person";
    if (["online", "video", "virtual"].includes(normalized))
        return "online";
    return normalized || "in-person";
}
function normalizeStatus(value) {
    const s = String(value ?? "").trim().toLowerCase().replace(/[_ ]+/g, "-");
    return s || "pending";
}
function payloadData(payload) {
    const body = (payload ?? {});
    return (body.data ?? body.payload ?? body.variables ?? body.body ?? body);
}
export function normalizeAppointmentDate(dateInput) {
    const str = String(dateInput ?? "").trim();
    if (!str)
        return new Date().toISOString().slice(0, 10);
    // 1. If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    // 2. If YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
        return str.replace(/\//g, "-");
    }
    // 3. If DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
        const day = String(dmyMatch[1]).padStart(2, "0");
        const month = String(dmyMatch[2]).padStart(2, "0");
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
    }
    // 4. Try extract YYYY-MM-DD inside text (e.g. "Sat, 1 Aug 2026-08-01")
    const ymdMatch = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
        const year = ymdMatch[1];
        const month = String(ymdMatch[2]).padStart(2, "0");
        const day = String(ymdMatch[3]).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    // 5. Try text match like "26 Aug", "Wed, 26 Aug", "26 August", "26-Aug"
    const textMatch = str.match(/(\d{1,2})[\s\-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i);
    if (textMatch) {
        const dayNumber = Number(textMatch[1]);
        const monthStr = textMatch[2].slice(0, 3).toLowerCase();
        const monthMap = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
        };
        const monthNumber = monthMap[monthStr];
        if (monthNumber) {
            const currentYear = new Date().getFullYear();
            const monthPart = String(monthNumber).padStart(2, "0");
            const dayPart = String(dayNumber).padStart(2, "0");
            return `${currentYear}-${monthPart}-${dayPart}`;
        }
    }
    // 6. Native Date fallback
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    return new Date().toISOString().slice(0, 10);
}
export function normalizeAppointmentTime(timeInput) {
    const str = String(timeInput ?? "").trim().toUpperCase();
    if (!str)
        return "10:00";
    // 1. Check for 12-hour format like "10:30 AM", "2:15 PM", "9:00AM", "12:00 PM"
    const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        const minutes = match12[2];
        const period = match12[3].toUpperCase();
        if (period === "PM" && hours < 12)
            hours += 12;
        if (period === "AM" && hours === 12)
            hours = 0;
        return `${String(hours).padStart(2, "0")}:${minutes}`;
    }
    // 2. Check for 24-hour format "14:30", "09:00", "9:00"
    const match24 = str.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        const hours = parseInt(match24[1], 10);
        const minutes = match24[2];
        if (hours >= 0 && hours <= 23 && parseInt(minutes, 10) >= 0 && parseInt(minutes, 10) <= 59) {
            return `${String(hours).padStart(2, "0")}:${minutes}`;
        }
    }
    return str || "10:00";
}
export function parseMsg91AppointmentPayload(payload) {
    const data = payloadData(payload);
    const root = (payload ?? {});
    // Phone: Extract from all possible locations
    const rawPhone = pick(data, "phoneNumber", "phone_number", "phone", "sender", "from", "mobile", "mobileNumber", "mobile_number", "customerNumber", "customer_number", "customer_mobile", "wa_id", "wa_number", "whatsapp_number", "caller", "msisdn", "number", "user_phone", "user_id", "receiver") ||
        pick(root, "phoneNumber", "phone_number", "phone", "customerNumber", "customer_mobile", "from", "mobile", "wa_id");
    const cleanPhone = normalizePhone(rawPhone);
    // Child / Patient Name: Extract with flexible fallback
    const rawChildName = pick(data, "patientName", "patient_name", "childName", "child_name", "name_of_child", "nameOfChild", "child", "name", "full_name", "customerName", "userName", "user_name") ||
        pick(root, "patientName", "childName", "name", "customerName") ||
        "Not specified";
    // Parent Name:
    const rawParentName = pick(data, "parentName", "parent_name", "parent", "guardianName", "guardian_name") ||
        pick(root, "parentName", "parent", "guardianName") ||
        "";
    // Age:
    const rawAge = pick(data, "age", "child_age", "childAge", "age_of_child", "ageOfChild", "patient_age", "patientAge") ||
        pick(root, "age", "child_age", "patientAge");
    let parsedAge = 0;
    if (rawAge !== undefined && rawAge !== null && rawAge !== "") {
        const digitsOnly = String(rawAge).replace(/[^\d]/g, "");
        if (digitsOnly) {
            parsedAge = parseInt(digitsOnly, 10);
        }
    }
    // First Session:
    const rawFirstSession = pick(data, "firstSession", "first_session", "is_first_session", "isFirstSession", "first_session_attended", "firstSessionAttended") ||
        pick(root, "firstSession", "isFirstSession") ||
        "";
    // Appointment Date:
    const rawDate = pick(data, "appointmentDate", "appointment_date", "date", "selected_date", "date_of_appointment", "schedule") ||
        pick(root, "appointmentDate", "appointment_date", "date", "selected_date");
    const hasDate = Boolean(rawDate && String(rawDate).trim());
    // Appointment Time:
    const rawTime = pick(data, "appointment_time", "appointmentTime", "time", "selected_time", "slot", "appointment_slot", "slot_time") ||
        pick(root, "appointmentTime", "appointment_time", "time", "slot");
    // Department / Service: Extract strictly from service/department keys or interactive list reply (NEVER from concern!)
    const rawDepartment = pick(data, "service", "department", "rawDepartment", "selectedService", "selected_service", "service_name", "selected_department", "therapy", "therapy_type", "dept", "specialization") ||
        pick(root, "service", "department", "rawDepartment", "selectedService", "selected_service", "service_name", "selected_department", "therapy", "therapy_type", "dept") ||
        data?.interactive?.list_reply?.title ||
        data?.list_reply?.title ||
        root?.interactive?.list_reply?.title ||
        root?.list_reply?.title ||
        "";
    const exactDept = rawDepartment.trim();
    // Therapist Name:
    const rawTherapistName = pick(data, "therapistName", "therapist_name", "therapist", "doctor", "doctor_name", "assignedTherapist") ||
        pick(root, "therapistName", "therapist_name", "therapist", "doctor", "assignedTherapist") ||
        "";
    // Concern:
    const rawConcern = pick(data, "mainConcern", "main_concern", "concern", "concern_of_child", "concernOfChild", "child_concern", "problem", "message") ||
        pick(root, "mainConcern", "concern", "problem", "message") ||
        "";
    const rawGender = pick(data, "gender") || pick(root, "gender") || "";
    const rawCity = pick(data, "city") || pick(root, "city") || "";
    const rawLang = pick(data, "preferred_language", "preferredLanguage", "language") || pick(root, "preferredLanguage") || "English";
    const rawBookingId = pick(data, "booking_id", "bookingId", "id", "requestId", "uuid") || pick(root, "bookingId", "booking_id", "requestId", "uuid");
    const rawPaymentStatus = pick(data, "payment_status", "paymentStatus") || pick(root, "paymentStatus", "payment_status") || "pending";
    const rawBookingStatus = pick(data, "booking_status", "bookingStatus", "status") || pick(root, "bookingStatus", "status") || "confirmed";
    const rawSessionFrequency = pick(data, "session_frequency", "sessionFrequency", "session_type", "sessionType", "frequency") ||
        pick(root, "session_frequency", "sessionFrequency", "frequency") ||
        "";
    const input = {
        bookingId: rawBookingId || undefined,
        patientName: rawChildName,
        parentName: rawParentName,
        phoneNumber: cleanPhone || rawPhone,
        age: parsedAge,
        firstSession: rawFirstSession,
        gender: rawGender || undefined,
        city: rawCity || undefined,
        preferredLanguage: rawLang || "English",
        department: exactDept || "Child and Parental Counselling",
        rawDepartment: exactDept || undefined,
        therapistId: pick(data, "therapist_id", "therapistId", "doctor_id", "doctorId") || null,
        therapistName: rawTherapistName || exactDept || "Ms. Tanu Rajput",
        appointmentDate: normalizeAppointmentDate(rawDate),
        appointmentTime: normalizeAppointmentTime(rawTime),
        appointmentType: normalizeAppointmentType(pick(data, "appointment_type", "appointmentType", "visit_type") || "in-person"),
        mainConcern: rawConcern,
        concernDescription: pick(data, "concern_description", "concernDescription", "description") || "",
        additionalNotes: pick(data, "additional_notes", "additionalNotes", "notes") || "",
        paymentStatus: normalizeStatus(rawPaymentStatus),
        bookingStatus: normalizeStatus(rawBookingStatus) || "confirmed",
        session_frequency: rawSessionFrequency || undefined,
    };
    return { input, hasDate };
}
function generatedBookingId(input) {
    return `MSG91-${Date.now()}-${randomUUID().slice(0, 8)}`;
}
function normalizeMongoAppointment(document) {
    const { _id, ...appointment } = document;
    return {
        ...appointment,
        id: _id ? String(_id) : String(appointment.id ?? ""),
    };
}
/**
 * Match WhatsApp interactive clicked title (list_reply.title or button_reply.title) or message
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
 * Auto-detect chosen department from recent WhatsApp messages in db.collection("webhookmessages")
 * within the last 15 minutes.
 */
export async function detectDepartmentFromRecentMessages(cleanPhone, incomingDept) {
    const dept = String(incomingDept || "").trim();
    const isInvalid = !dept || dept.startsWith("@") || dept.startsWith("{{") || dept.includes("@") || dept.includes("{{");
    if (!isInvalid) {
        const directMatch = matchDepartmentFromTitle(dept);
        if (directMatch) {
            return directMatch;
        }
    }
    try {
        await connectMongoDb().catch(() => { });
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (db && cleanPhone) {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            // Query the latest incoming user message in db.collection("webhookmessages") for this user's phone
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
            // First pass: messages within the last 2 minutes
            for (const msg of recentMsgs) {
                const ts = msg.receivedAt || msg.createdAt;
                if (ts) {
                    const d = new Date(ts);
                    if (!isNaN(d.getTime()) && d < twoMinutesAgo)
                        continue;
                }
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
                        console.log(`[Real-Time WhatsApp Detection] Matched department "${match}" from "${candidate}" within 2 mins for phone ${cleanPhone}`);
                        return match;
                    }
                }
            }
            // Second pass: fallback up to 15 minutes
            for (const msg of recentMsgs) {
                const ts = msg.receivedAt || msg.createdAt;
                if (ts) {
                    const d = new Date(ts);
                    if (!isNaN(d.getTime()) && d < fifteenMinutesAgo)
                        continue;
                }
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
                        console.log(`[Real-Time WhatsApp Detection] Matched department "${match}" from "${candidate}" (fallback) for phone ${cleanPhone}`);
                        return match;
                    }
                }
            }
        }
    }
    catch (err) {
        console.warn("[detectDepartmentFromRecentMessages] Error:", err.message || err);
    }
    return null;
}
/**
 * Cross-service therapist conflict check (Global busy check):
 * Even if a therapist is booked for service A at slot X, they are globally busy across all services at slot X.
 */
export async function allocateTherapistForBooking(department, date, time) {
    let deptKey = department;
    for (const k of Object.keys(CLINIC_ROSTER)) {
        if (k.toLowerCase() === department.toLowerCase()) {
            deptKey = k;
            break;
        }
    }
    const candidateTherapists = CLINIC_ROSTER[deptKey] || CLINIC_ROSTER["Child and Parental Counselling"];
    const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
    if (!db) {
        const fallbackName = candidateTherapists[0] || "Ms Tanu Rajput";
        return {
            name: fallbackName,
            id: `roster-${deptKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-1`,
        };
    }
    // Find all therapists already booked at this exact date & time across ALL appointments
    const busyTherapists = await db.collection("appointments").distinct("therapistName", {
        appointmentDate: date,
        appointmentTime: time,
        status: { $ne: "cancelled" },
        bookingStatus: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
    });
    const busyAssigned = await db.collection("appointments").distinct("assignedTherapist", {
        appointmentDate: date,
        appointmentTime: time,
        status: { $ne: "cancelled" },
        bookingStatus: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
    });
    const allBusy = Array.from(new Set([...busyTherapists, ...busyAssigned].filter(Boolean)));
    const isTherapistBusy = (candidate) => {
        if (allBusy.includes(candidate))
            return true;
        const cleanCand = candidate.toLowerCase().replace(/[^a-z]/g, "");
        return allBusy.some((b) => {
            const cleanB = String(b).toLowerCase().replace(/[^a-z]/g, "");
            return cleanCand === cleanB || cleanCand.includes(cleanB) || cleanB.includes(cleanCand);
        });
    };
    // From CLINIC_ROSTER[resolvedDepartment], pick the first therapist NOT in busyTherapists
    const availableTherapists = candidateTherapists.filter((t) => !isTherapistBusy(t));
    const assignedName = availableTherapists.length > 0 ? availableTherapists[0] : candidateTherapists[0];
    console.log(`[Therapist Allocation] Resolved Dept: "${deptKey}", Date: "${date}", Time: "${time}" -> Assigned: "${assignedName}" (Candidates: [${candidateTherapists.join(", ")}], Busy: [${allBusy.join(", ")}])`);
    const assignedId = `roster-${deptKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${assignedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return { name: assignedName, id: assignedId };
}
export async function saveMsg91Appointment(payload) {
    const { input } = parseMsg91AppointmentPayload(payload);
    // Connect to MongoDB targeting explicit database
    try {
        await connectMongoDb();
    }
    catch (connErr) {
        console.warn("[saveMsg91Appointment] connectMongoDb error:", connErr.message);
    }
    const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
    // ── First Session Service Guard & Strict Department Enforcement ──────────
    let targetDepartment = "Child and Parental Counselling";
    let isFirstSession = true;
    const rawFirstSession = String(input.firstSession || "").toLowerCase().trim();
    const isExplicitFirst = rawFirstSession === "true" ||
        rawFirstSession === "yes" ||
        rawFirstSession === "1" ||
        input.isFirstSession === true;
    const isExplicitReturning = rawFirstSession === "false" ||
        rawFirstSession === "no" ||
        rawFirstSession === "0" ||
        input.isFirstSession === false;
    const digitsOnly = String(input.phoneNumber || "").replace(/\D/g, "");
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
    let priorBookings = 0;
    if (db && cleanPhone) {
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
        try {
            const [existingAppts, existingWebhooks] = await Promise.all([
                db.collection(appointmentCollection).countDocuments(apptFilter).catch(() => 0),
                db.collection("webhookmessages").countDocuments(webhookFilter).catch(() => 0),
            ]);
            priorBookings = (existingAppts || 0) + (existingWebhooks || 0);
        }
        catch (countErr) {
            console.warn("[First Session Guard] Error checking prior bookings:", countErr.message);
        }
    }
    // 1. Returning vs New Patient Determination:
    // If ANY existing record exists (priorBookings > 0), isFirstSession MUST BE false and patient tag MUST BE Returning!
    const isReturningPatient = priorBookings > 0 || isExplicitReturning;
    const isStrictNewPatient = !isReturningPatient && (priorBookings === 0 || isExplicitFirst);
    const rawPayloadData = payloadData(payload);
    let rawDept = String(input.rawDepartment ||
        input.department ||
        pick(rawPayloadData, "service", "department", "selectedService", "selected_service", "service_name", "selected_department", "therapy", "therapy_type", "dept", "specialization") ||
        pick((payload ?? {}), "service", "department", "selectedService", "selected_service", "service_name", "selected_department", "therapy", "therapy_type", "dept") ||
        rawPayloadData?.interactive?.list_reply?.title ||
        rawPayloadData?.list_reply?.title ||
        (payload ?? {})?.interactive?.list_reply?.title ||
        (payload ?? {})?.list_reply?.title ||
        "").trim();
    // 2. REAL-TIME WHATSAPP SERVICE DETECTION:
    // If req.body.department is empty (""), undefined, starts with "@", or starts with "{{":
    // Look up latest incoming user message in db.collection("webhookmessages") for this user's phone within the last 15 mins.
    const isInvalidDept = !rawDept || rawDept.startsWith("@") || rawDept.startsWith("{{") || rawDept.includes("@") || rawDept.includes("{{");
    if (isInvalidDept || (rawDept.toLowerCase() === "child and parental counselling" && isReturningPatient)) {
        const detected = await detectDepartmentFromRecentMessages(cleanPhone, rawDept);
        if (detected) {
            rawDept = detected;
            console.log(`[Department Detection] Detected real-time WhatsApp department: "${detected}" (${cleanPhone})`);
        }
    }
    else {
        const matched = matchDepartmentFromTitle(rawDept);
        if (matched) {
            rawDept = matched;
        }
    }
    // Final department resolution:
    // A returning patient booking a new appointment MUST NEVER inherit the previous child's or previous session's service.
    if (rawDept && !rawDept.startsWith("@") && !rawDept.startsWith("{{") && !rawDept.includes("@") && !rawDept.includes("{{")) {
        targetDepartment = matchDepartmentFromTitle(rawDept) || rawDept.trim();
    }
    else {
        // Default to Child and Parental Counselling without inheriting from prior bookings
        targetDepartment = "Child and Parental Counselling";
    }
    isFirstSession = isStrictNewPatient;
    input.firstSession = isFirstSession ? "true" : "false";
    input.isFirstSession = isFirstSession;
    input.department = targetDepartment;
    input.rawDepartment = targetDepartment;
    console.log(`[Department Resolution] Final department: "${targetDepartment}", isReturningPatient=${isReturningPatient}, isFirstSession=${isFirstSession} (${cleanPhone})`);
    // 3. Safe Therapist Lookup:
    // If matched therapists list is empty or unavailable, fallback to an active therapist
    // assigned to "Child and Parental Counselling" (e.g., "Ms. Tanu Rajput") so the appointment is NEVER dropped or rejected.
    let availableSlots = [];
    try {
        availableSlots = await getAvailableSlots(targetDepartment, input.appointmentDate);
    }
    catch (slotsErr) {
        console.warn(`[saveMsg91Appointment] Error getting slots for ${targetDepartment}:`, slotsErr.message);
    }
    if (!availableSlots || availableSlots.length === 0) {
        if (targetDepartment !== "Child and Parental Counselling") {
            try {
                availableSlots = await getAvailableSlots("Child and Parental Counselling", input.appointmentDate);
            }
            catch (counselSlotsErr) {
                console.warn("[saveMsg91Appointment] Error getting Counselling slots:", counselSlotsErr.message);
            }
        }
    }
    // If appointmentTime is missing or empty, pick first available slot or default to 10:00
    if (!input.appointmentTime || input.appointmentTime.trim() === "") {
        input.appointmentTime = availableSlots?.[0]?.time || "10:00";
    }
    // Cross-Service Therapist Conflict Check (Global Busy Check)
    let assigned = null;
    try {
        assigned = await allocateTherapistForBooking(targetDepartment, input.appointmentDate, input.appointmentTime);
    }
    catch (assignErr) {
        console.warn(`[saveMsg91Appointment] Error in allocateTherapistForBooking for ${targetDepartment}:`, assignErr.message);
    }
    if (!assigned) {
        assigned = { id: "roster-counselling-1", name: "Ms Tanu Rajput" };
    }
    input.department = targetDepartment;
    input.rawDepartment = targetDepartment;
    input.therapistId = assigned.id;
    input.therapistName = assigned.name;
    // ── Fee Calculation ──────────────────────────────────────────────────────
    const { amount, totalSessions, feeCharged } = calculateAppointmentFee({
        isNew: isFirstSession,
        appointmentType: input.appointmentType || "in-person",
        department: targetDepartment,
        session_frequency: input.session_frequency,
    });
    input.feeCharged = feeCharged;
    input.totalSessions = totalSessions;
    console.log(`[Fee Calculation] isNew=${isFirstSession} dept=${targetDepartment} type=${input.appointmentType} freq=${input.session_frequency} => ₹${amount} (${totalSessions} session(s))`);
    input.bookingStatus = "confirmed";
    const bookingId = input.bookingId || generatedBookingId(input);
    const now = new Date().toISOString();
    // ── Session Schedule Generation (for 1, 2, 3 days bookings) ───────────────
    const { schedule: sessionSchedule, scheduleText: sessionScheduleText } = generateSessionSchedule(input.appointmentDate, input.appointmentTime, totalSessions);
    input.sessionSchedule = sessionSchedule;
    input.sessionScheduleText = sessionScheduleText;
    const document = {
        ...input,
        bookingId,
        bookingStatus: "confirmed",
        amount,
        totalSessions,
        feeCharged,
        session_frequency: input.session_frequency || "",
        sessionSchedule,
        sessionScheduleText,
        rawPayload: payload,
        createdAt: now,
        updatedAt: now,
    };
    if (db) {
        const collection = db.collection(appointmentCollection);
        // Only update if an explicit bookingId was provided and already exists in MongoDB
        let existing = null;
        if (input.bookingId) {
            existing = await collection.findOne({ bookingId: input.bookingId });
        }
        let insertedId = null;
        if (existing) {
            await collection.updateOne({ _id: existing._id }, {
                $set: {
                    ...document,
                    bookingStatus: "confirmed",
                    updatedAt: now,
                },
            });
            console.log(`[saveMsg91Appointment] Updated existing appointment record: ${bookingId}`);
        }
        else {
            // Insert ONLY this single appointment record into db.collection("appointments") with its own unique _id
            const result = await collection.insertOne(document);
            insertedId = result.insertedId;
            console.log(`[saveMsg91Appointment] Inserted new isolated appointment in MongoDB: ${result.insertedId} (${bookingId})`);
        }
        if (existing) {
            return { appointment: normalizeMongoAppointment({ ...existing, ...document }), duplicate: true, isPreliminary: false };
        }
        return { appointment: { id: insertedId ? String(insertedId) : bookingId, _id: insertedId, ...document }, duplicate: false, isPreliminary: false };
    }
    async function readStoredAppointments() {
        try {
            return await readJsonFile(storedAppointmentsPath());
        }
        catch (error) {
            if (error.code === "ENOENT")
                return [];
            throw error;
        }
    }
    // File store fallback
    await fs.mkdir(config.storageDir, { recursive: true });
    const appointments = await readStoredAppointments();
    const existingIndex = appointments.findIndex((item) => item.bookingId === bookingId ||
        (item.phoneNumber === input.phoneNumber && item.appointmentDate === input.appointmentDate && item.appointmentTime === input.appointmentTime));
    if (existingIndex >= 0) {
        const updated = { ...appointments[existingIndex], ...document, updatedAt: now };
        appointments[existingIndex] = updated;
        await writeJsonFile(storedAppointmentsPath(), appointments);
        return { appointment: updated, duplicate: true, isPreliminary: false };
    }
    const appointment = { id: randomUUID(), ...document };
    await writeJsonFile(storedAppointmentsPath(), [appointment, ...appointments]);
    return { appointment, duplicate: false, isPreliminary: false };
}
export function appointmentMongoIdFilter(id) {
    return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}
