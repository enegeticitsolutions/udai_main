import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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
 * Adds default 45 minutes duration if end_time is not provided.
 */
export function calculateEndTime(startTime) {
    if (!startTime)
        return "";
    const parts = String(startTime).trim().split(":");
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1] || "0", 10) + 45;
    if (isNaN(h))
        return startTime;
    if (isNaN(m))
        m = 45;
    if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/**
 * Normalizes time string (24-hour "HH:mm" or "hh:mm AM/PM") into 12-hour "hh:mm A" format (e.g. "10:00 AM", "01:00 PM").
 */
export function formatTime12Hour(timeStr) {
    if (!timeStr)
        return "";
    const trimmed = String(timeStr).trim();
    // If already contains AM or PM e.g. "10:00 AM", "1:00 PM"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
    if (match12) {
        const h = String(parseInt(match12[1], 10)).padStart(2, "0");
        const m = match12[2];
        const ampm = match12[3].toUpperCase();
        return `${h}:${m} ${ampm}`;
    }
    // If in 24h format e.g. "10:00", "12:15", "13:00", "15:45", "9:30"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        let h = parseInt(match24[1], 10);
        const m = match24[2];
        const ampm = h >= 12 ? "PM" : "AM";
        if (h > 12)
            h -= 12;
        if (h === 0)
            h = 12;
        return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
    }
    return trimmed;
}
/**
 * Normalizes therapy / session name to ensure:
 * 1. Therapist names (Dr. Tanu, Dr. Nikki, Mr. Atal, etc.) are stripped completely.
 * 2. Proper session naming (e.g. "Sensory Integration Session", "Speech Therapy Session").
 * 3. Does not duplicate "Session" if already present.
 */
export function cleanSessionName(therapyRaw) {
    let name = String(therapyRaw || "").trim();
    // Strip therapist names with doctor/salutation prefixes (e.g. "Dr. Tanu", "Dr Tanu", "Mr. Atal", "Ms. Nikki", "Mrs. Sharma")
    name = name.replace(/\b(dr\.?|mr\.?|ms\.?|mrs\.?)\s+[A-Za-z]+(\s+[A-Za-z]+)?/gi, "").trim();
    // Strip standalone therapist names from database just in case: Tanu, Nikki, Atal, Shweta, etc.
    name = name.replace(/\b(tanu|nikki|atal|shweta|priyanka|pooja|rohit|neha)\b/gi, "").trim();
    // Strip conjunctions like "with", "by", "under" and parentheses
    name = name.replace(/\b(with|by|under)\b/gi, "").replace(/[()]/g, "").trim();
    // Clean up any stray commas, hyphens, colons, or slashes
    name = name.replace(/^[-:,/|\s]+|[-:,/|\s]+$/g, "").trim();
    // Standardize common department abbreviations / names
    if (!name) {
        name = "Therapy";
    }
    else if (/^ot$/i.test(name)) {
        name = "Occupational Therapy";
    }
    else if (/^st$/i.test(name)) {
        name = "Speech Therapy";
    }
    else if (/^si$/i.test(name)) {
        name = "Sensory Integration";
    }
    // If name doesn't end with "Session" (case-insensitive), append " Session"
    if (!/\bsession\b/i.test(name)) {
        name = `${name} Session`;
    }
    // Capitalize words properly
    name = name
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    return name;
}
/**
 * Formats routine sessions according to the exact target format:
 * • [Day / Date]: [Start Time] - [End Time] - [Session Name]
 *
 * Requirements:
 * 1. Do NOT include therapist names.
 * 2. Only include the Date/Day, Time slot, and the specific Session Name.
 * 3. Sort all sessions chronologically date-wise / day-wise.
 * 4. Separate each entry with a newline so it looks clean on WhatsApp.
 *
 * Example Output:
 * • Monday: 10:00 AM - 10:45 AM - Sensory Integration Session
 * • Wednesday: 12:15 PM - 01:00 PM - Speech Therapy Session
 * • Friday: 10:00 AM - 10:45 AM - Occupational Therapy Session
 */
export function formatRoutineSummary(slots, defaultTherapy = "Therapy") {
    if (!Array.isArray(slots) || slots.length === 0)
        return "";
    const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const DAY_MAP = {
        mon: "Monday",
        monday: "Monday",
        tue: "Tuesday",
        tues: "Tuesday",
        tuesday: "Tuesday",
        wed: "Wednesday",
        wednesday: "Wednesday",
        thu: "Thursday",
        thur: "Thursday",
        thurs: "Thursday",
        thursday: "Thursday",
        fri: "Friday",
        friday: "Friday",
        sat: "Saturday",
        saturday: "Saturday",
        sun: "Sunday",
        sunday: "Sunday",
    };
    // Normalize each slot
    const normalized = slots
        .map((s) => {
        const dayRaw = String(s.day_of_week || s.day || s.dayName || "").trim();
        const dateRaw = String(s.date || s.appointmentDate || "").trim();
        const dayLower = dayRaw.toLowerCase();
        let day = DAY_MAP[dayLower] || (dayRaw ? dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1).toLowerCase() : "");
        if (!day && dateRaw) {
            const d = new Date(dateRaw);
            if (!isNaN(d.getTime())) {
                day = d.toLocaleDateString("en-US", { weekday: "long" });
            }
        }
        const startTime = String(s.start_time || s.time || "").trim();
        const endTime = String(s.end_time || s.endTime || (startTime ? calculateEndTime(startTime) : "")).trim();
        const therapy = String(s.therapy_name || s.therapy_type || s.department || s.therapy || defaultTherapy || "Therapy").trim();
        return {
            day: day || dateRaw,
            date: dateRaw,
            start_time: startTime,
            end_time: endTime,
            therapy_name: therapy,
        };
    })
        .filter((s) => Boolean(s && (s.day || s.date) && s.start_time));
    if (normalized.length === 0)
        return "";
    // Sort chronologically date-wise / day-wise, then by start_time
    normalized.sort((a, b) => {
        // If specific dates are present and differ
        if (a.date && b.date && a.date !== b.date) {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
                return timeA - timeB;
            }
        }
        // Sort by day of week
        const idxA = DAY_ORDER.indexOf(a.day);
        const idxB = DAY_ORDER.indexOf(b.day);
        if (idxA !== idxB) {
            if (idxA !== -1 && idxB !== -1)
                return idxA - idxB;
            if (idxA !== -1)
                return -1;
            if (idxB !== -1)
                return 1;
        }
        // Chronologically by start_time
        return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
    });
    // Format each session: • [Day / Date]: [Start Time] - [End Time] - [Session Name]
    const entries = normalized.map((s) => {
        const dayLabel = s.day || s.date;
        const startFormatted = formatTime12Hour(s.start_time);
        const endFormatted = formatTime12Hour(s.end_time);
        const sessionFormatted = cleanSessionName(s.therapy_name);
        return `• ${dayLabel}: ${startFormatted} - ${endFormatted} - ${sessionFormatted}`;
    });
    // Separate each entry with a newline
    return entries.join("\n");
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
 * Helper to parse time string (24-hour "HH:mm" or 12-hour "hh:mm AM/PM") into total minutes from midnight.
 */
function parseTimeToMinutes(timeStr) {
    if (!timeStr)
        return -1;
    const str = String(timeStr).trim();
    const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let h = parseInt(match12[1], 10);
        const m = parseInt(match12[2], 10);
        const ampm = match12[3].toUpperCase();
        if (ampm === "PM" && h < 12)
            h += 12;
        if (ampm === "AM" && h === 12)
            h = 0;
        return h * 60 + m;
    }
    const match24 = str.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        return h * 60 + m;
    }
    return -1;
}
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
        // Same-day past slots filter (IST):
        // If requested date is today in IST, drop slots before current time
        const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        const isToday = date === todayIST;
        let availableSlotsList = slots.filter((s) => s.isAvailable !== false);
        if (isToday) {
            const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const currentTotalMins = nowIST.getHours() * 60 + nowIST.getMinutes();
            availableSlotsList = availableSlotsList.filter((s) => {
                const slotTimeStr = String(s.time || s.label || "").trim();
                const slotMins = parseTimeToMinutes(slotTimeStr);
                return slotMins === -1 || slotMins > currentTotalMins;
            });
        }
        const formattedSlots = availableSlotsList
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
 * Robust lookup helper for PMS recurring slots / child schedules.
 * Queries live MongoDB childSchedules (active and all statuses) and fallback storage files.
 * Extracts the exact child name entered in the PMS Admin Panel.
 */
export async function lookupPmsChildSchedule(db, rawPhoneInput) {
    const digits = String(rawPhoneInput || "").replace(/\D/g, "");
    let local = digits;
    if (digits.startsWith("91") && digits.length >= 11) {
        local = digits.slice(2);
    }
    else if (digits.startsWith("0") && digits.length >= 10) {
        local = digits.slice(1);
    }
    else if (digits.length > 10) {
        local = digits.slice(-10);
    }
    const clean10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const phoneVariants = Array.from(new Set([
        local,
        clean10,
        digits,
        `+91${local}`,
        `91${local}`,
        `0${local}`,
        `+91${clean10}`,
        `91${clean10}`,
        `0${clean10}`,
    ])).filter(Boolean);
    if (!isNaN(Number(local)) && local !== "")
        phoneVariants.push(Number(local));
    if (!isNaN(Number(clean10)) && clean10 !== "")
        phoneVariants.push(Number(clean10));
    if (!isNaN(Number(digits)) && digits !== "")
        phoneVariants.push(Number(digits));
    const phoneRegexLocal = new RegExp(`${local}$`);
    const phoneRegexClean10 = new RegExp(`${clean10}$`);
    const phoneRegexDigits = new RegExp(`${digits}$`);
    function doesPhoneMatch(storedPhone) {
        if (!storedPhone)
            return false;
        const p = String(storedPhone).replace(/\D/g, "");
        if (!p)
            return false;
        if (p === digits || p === local || p === clean10)
            return true;
        const pLocal = (p.startsWith("91") && p.length >= 11) ? p.slice(2) : ((p.startsWith("0") && p.length >= 10) ? p.slice(1) : p);
        if (pLocal === local || pLocal === clean10)
            return true;
        if (p.length >= 10 && digits.length >= 10 && p.slice(-10) === digits.slice(-10))
            return true;
        if (pLocal.length >= 7 && local.length >= 7) {
            if (pLocal.endsWith(local) || local.endsWith(pLocal))
                return true;
            if (p.endsWith(digits) || digits.endsWith(p))
                return true;
        }
        return false;
    }
    let matchedSchedules = [];
    // 1. Query MongoDB childSchedules
    if (db) {
        try {
            const scheduleOrQueries = [];
            for (const field of ["parent_phone", "parentPhone", "phone", "phoneNumber", "mobile", "parent_mobile", "whatsapp", "wa_id"]) {
                for (const variant of phoneVariants) {
                    scheduleOrQueries.push({ [field]: variant });
                }
                scheduleOrQueries.push({ [field]: phoneRegexLocal });
                scheduleOrQueries.push({ [field]: phoneRegexClean10 });
                scheduleOrQueries.push({ [field]: phoneRegexDigits });
            }
            // First try active schedules
            matchedSchedules = await db.collection("childSchedules").find({
                status: { $regex: /^active$/i },
                $or: scheduleOrQueries,
            }).toArray().catch(() => []);
            // If no active matched, search without status restriction
            if (matchedSchedules.length === 0) {
                matchedSchedules = await db.collection("childSchedules").find({
                    $or: scheduleOrQueries,
                }).toArray().catch(() => []);
            }
            // In-memory Mongo scan fallback across all childSchedules docs
            if (matchedSchedules.length === 0) {
                const allChildDocs = await db.collection("childSchedules").find({}).toArray().catch(() => []);
                for (const doc of allChildDocs) {
                    const p = doc.parent_phone || doc.parentPhone || doc.phone || doc.phoneNumber || doc.mobile || doc.parent_mobile;
                    if (doesPhoneMatch(p)) {
                        matchedSchedules.push(doc);
                        console.log(`[lookupPmsChildSchedule] In-memory Mongo match for "${doc.child_name || doc.childName || doc.patientName}" (phone: ${p})`);
                    }
                }
            }
        }
        catch (err) {
            console.warn("[lookupPmsChildSchedule] Mongo childSchedules lookup error:", err?.message || err);
        }
    }
    // 2. Query PMS Admin Endpoints (local and production) to ensure live sync with Admin Panel
    const pmsApiUrls = [
        "http://127.0.0.1:5003/api/schedules",
        "http://localhost:5003/api/schedules",
        "https://pms.datamoshtechnologies.com/api/schedules",
    ];
    for (const apiUrl of pmsApiUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const json = await res.json();
                const list = Array.isArray(json) ? json : json.data || [];
                for (const doc of list) {
                    const p = doc.parent_phone || doc.parentPhone || doc.phone || doc.phoneNumber || doc.mobile;
                    if (doesPhoneMatch(p)) {
                        matchedSchedules.push(doc);
                        console.log(`[lookupPmsChildSchedule] Live PMS API match for "${doc.child_name || doc.childName || doc.patientName}" (phone: ${p}) from ${apiUrl}`);
                    }
                }
                if (matchedSchedules.length > 0)
                    break;
            }
        }
        catch { }
    }
    // 3. Check fallback JSON file store
    if (matchedSchedules.length === 0) {
        const candidateFilePaths = [
            path.resolve(process.cwd(), "../admin-main/backend-storage/child-schedules.json"),
            path.resolve(process.cwd(), "backend-storage/child-schedules.json"),
            path.resolve(process.cwd(), "storage/child-schedules.json"),
            "/Users/shubhamtripathi/Downloads/UDAI_webApp_Main/admin-main/backend-storage/child-schedules.json",
        ];
        for (const fp of candidateFilePaths) {
            try {
                if (fs.existsSync(fp)) {
                    const content = fs.readFileSync(fp, "utf-8");
                    const list = JSON.parse(content);
                    if (Array.isArray(list)) {
                        for (const doc of list) {
                            const p = doc.parent_phone || doc.parentPhone || doc.phone || doc.phoneNumber || doc.mobile;
                            if (doesPhoneMatch(p)) {
                                matchedSchedules.push(doc);
                                console.log(`[lookupPmsChildSchedule] Fallback file match for "${doc.child_name || doc.childName || doc.patientName}" (phone: ${p}) from ${fp}`);
                            }
                        }
                        if (matchedSchedules.length > 0)
                            break;
                    }
                }
            }
            catch { }
        }
    }
    // Sort matchedSchedules so newest updated or most slots takes top priority
    if (matchedSchedules.length > 1) {
        matchedSchedules.sort((a, b) => {
            const slotsA = (a.recurring_slots || a.sessions || a.slots || []).length;
            const slotsB = (b.recurring_slots || b.sessions || b.slots || []).length;
            if (slotsA !== slotsB)
                return slotsB - slotsA;
            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA;
        });
    }
    // 4. Extract primary doc and exact name directly from the admin record
    const primaryDoc = matchedSchedules.length > 0 ? matchedSchedules[0] : null;
    let exactName = "";
    let parentName = "";
    if (primaryDoc) {
        exactName = String(primaryDoc.child_name ||
            primaryDoc.childName ||
            primaryDoc.patientName ||
            primaryDoc.name ||
            "").trim();
        parentName = String(primaryDoc.parent_name ||
            primaryDoc.parentName ||
            primaryDoc.parent ||
            "").trim();
    }
    // 5. If no schedule matched, try patients collection
    if (!exactName && db) {
        try {
            const patientOrQueries = [];
            for (const field of ["phone", "phoneNumber", "mobile", "parent_phone", "parentPhone"]) {
                for (const variant of phoneVariants) {
                    patientOrQueries.push({ [field]: variant });
                }
                patientOrQueries.push({ [field]: phoneRegexLocal });
                patientOrQueries.push({ [field]: phoneRegexClean10 });
            }
            const patientDoc = await db.collection("patients").findOne({ $or: patientOrQueries }).catch(() => null);
            if (patientDoc) {
                exactName = String(patientDoc.child_name ||
                    patientDoc.childName ||
                    patientDoc.patientName ||
                    patientDoc.name ||
                    "").trim();
                if (!parentName) {
                    parentName = String(patientDoc.parentName || patientDoc.parent_name || "").trim();
                }
            }
        }
        catch { }
    }
    // 6. Gather ALL slots dynamically (NO hardcoded limits)
    const allSlots = [];
    const therapiesSet = new Set();
    // If primaryDoc has slots, use primaryDoc's slot array to avoid duplicating across fallbacks
    const sourceDocs = primaryDoc ? [primaryDoc] : matchedSchedules;
    for (const sched of sourceDocs) {
        const schedTherapy = sched.therapy_type || sched.therapy_name || "Therapy";
        if (schedTherapy)
            therapiesSet.add(schedTherapy);
        const slots = Array.isArray(sched.recurring_slots) && sched.recurring_slots.length > 0
            ? sched.recurring_slots
            : (Array.isArray(sched.sessions) && sched.sessions.length > 0
                ? sched.sessions
                : (Array.isArray(sched.slots) ? sched.slots : []));
        for (const s of slots) {
            const slotTherapy = s.therapy_name || s.session_name || s.sessionName || s.serviceId || s.service || s.therapy_type || s.department || schedTherapy || "Therapy";
            if (slotTherapy)
                therapiesSet.add(slotTherapy);
            allSlots.push({
                day_of_week: s.day_of_week || s.day || s.dayOfWeek,
                day: s.day_of_week || s.day || s.dayOfWeek,
                start_time: s.start_time || s.startTime || s.time,
                startTime: s.start_time || s.startTime || s.time,
                time: s.start_time || s.startTime || s.time,
                end_time: s.end_time || s.endTime || (s.start_time || s.startTime || s.time ? calculateEndTime(s.start_time || s.startTime || s.time) : ""),
                endTime: s.end_time || s.endTime || (s.start_time || s.startTime || s.time ? calculateEndTime(s.start_time || s.startTime || s.time) : ""),
                therapy_name: slotTherapy,
                session_name: slotTherapy,
                sessionName: slotTherapy,
                service: slotTherapy,
                therapist_id: s.therapist_id || s.therapistId || s.therapist_name || sched.therapist_id,
            });
        }
    }
    return {
        matchedSchedules,
        primaryDoc,
        exactName,
        parentName,
        allSlots,
        therapies: Array.from(therapiesSet),
    };
}
/**
 * ALL /api/msg91/check-patient-status and /msg91/check-patient-status
 * Handles both GET and POST requests.
 * Checks whether incoming phone number is a frequent/routine patient with a schedule.
 * Returns HTTP 200 with live PMS patient name, child_name, and routine schedule summary.
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
                if (d.length >= 7) {
                    rawPhone = String(c).trim();
                    break;
                }
            }
        }
        // Fallback: check query or body values if no candidate was found
        if (!rawPhone) {
            const searchPool = [...Object.values(query), ...Object.values(body), ...Object.values(nestedVars), ...Object.values(nestedData), ...Object.values(nestedPayload)];
            for (const val of searchPool) {
                if (typeof val === "string" || typeof val === "number") {
                    const d = String(val).replace(/\D/g, "");
                    if (d.length >= 7 && d.length <= 15) {
                        rawPhone = String(val);
                        break;
                    }
                }
            }
        }
        // Fallback if raw body is string containing phone digits
        if (!rawPhone && typeof req.body === "string") {
            const match = req.body.match(/\d{7,15}/);
            if (match)
                rawPhone = match[0];
        }
        // 2. Sanitize and normalize phone digits
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        const digitsOnly = String(rawPhone || "").replace(/\D/g, "");
        let cleanPhone = digitsOnly;
        if (digitsOnly.startsWith("91") && digitsOnly.length >= 11) {
            cleanPhone = digitsOnly.slice(2);
        }
        else if (digitsOnly.startsWith("0") && digitsOnly.length >= 10) {
            cleanPhone = digitsOnly.slice(1);
        }
        else if (digitsOnly.length > 10) {
            cleanPhone = digitsOnly.slice(-10);
        }
        console.log("--> MSG91 HIT: check-patient-status", {
            method: req.method,
            query: req.query,
            body: req.body,
            receivedPhone: rawPhone,
            cleanPhone: cleanPhone,
        });
        // If phone is missing or less than 7 digits, do NOT query DB. Return HTTP 404 Not frequent
        if (!cleanPhone || cleanPhone.length < 7) {
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
                child_name: "",
                childName: "",
                patientName: "",
                parent_name: "",
                parentName: "",
                data: {
                    success: false,
                    message: "Not frequent",
                    status: "new",
                    isNew: true,
                    is_new: true,
                    is_returning: false,
                    is_frequent: false,
                    child_name: "",
                    childName: "",
                    patientName: "",
                    parent_name: "",
                    parentName: "",
                },
            });
        }
        // 3. Primary Lookup: Query live PMS child schedules / recurring slots database
        const pmsLookup = await lookupPmsChildSchedule(db, rawPhone || cleanPhone);
        let recurringChild = pmsLookup.primaryDoc;
        let patientName = pmsLookup.exactName;
        let parentName = pmsLookup.parentName;
        let allCombinedSlots = [...pmsLookup.allSlots];
        const therapiesSet = new Set(pmsLookup.therapies);
        // 4. Query DB for existing appointments/messages count
        let count = 0;
        let routineSummary = "";
        let therapyName = "";
        let totalPrescribed = 0;
        if (db) {
            const phoneRegex = new RegExp(`${cleanPhone}$`);
            const phoneVariants = [
                cleanPhone,
                digitsOnly,
                `+91${cleanPhone}`,
                `91${cleanPhone}`,
                `0${cleanPhone}`,
                Number(cleanPhone),
            ].filter((v) => v !== undefined && v !== null && !isNaN(Number(v)));
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
            // Fallback to routineBookings if no slots were found in childSchedules
            if (allCombinedSlots.length === 0) {
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
                        const bookingTherapy = routineBooking.therapy_type || routineBooking.department || "Therapy";
                        therapiesSet.add(bookingTherapy);
                        if (!recurringChild) {
                            recurringChild = {
                                child_name: routineBooking.child_name || routineBooking.patientName || routineBooking.childName,
                                parent_name: routineBooking.parent_name || routineBooking.parentName,
                                therapy_type: bookingTherapy,
                                recurring_slots: routineBooking.sessionSchedule || [],
                                status: routineBooking.status,
                            };
                        }
                        if (!patientName) {
                            patientName = String(routineBooking.child_name || routineBooking.patientName || routineBooking.childName || "").trim();
                        }
                        if (!parentName) {
                            parentName = String(routineBooking.parent_name || routineBooking.parentName || "").trim();
                        }
                        const slots = Array.isArray(routineBooking.sessionSchedule) ? routineBooking.sessionSchedule : [];
                        for (const s of slots) {
                            allCombinedSlots.push({
                                day_of_week: s.day_of_week || s.day,
                                start_time: s.start_time || s.time,
                                end_time: s.end_time || s.endTime || calculateEndTime(s.start_time || s.time),
                                therapy_name: s.therapy_name || s.therapy_type || s.department || bookingTherapy,
                            });
                        }
                    }
                }
                catch (rbErr) {
                    // ignore
                }
            }
            count = (apptCount || 0) + (webhookCount || 0) + (allCombinedSlots.length > 0 || recurringChild ? 1 : 0);
            // Only fall back to old appointments/webhooks if the PMS Recurring Slots / Patient DB returned nothing
            if (!patientName) {
                patientName = String(latestAppt?.patientName ||
                    latestWebhook?.childName ||
                    latestWebhook?.patientName ||
                    "").trim();
            }
            if (!parentName) {
                parentName = String(recurringChild?.parent_name ||
                    recurringChild?.parentName ||
                    latestAppt?.parentName ||
                    latestAppt?.parent_name ||
                    latestWebhook?.parentName ||
                    latestWebhook?.parent_name ||
                    "").trim();
            }
            if (!patientName && parentName) {
                patientName = parentName;
            }
            therapyName = Array.from(therapiesSet).join(", ") || recurringChild?.therapy_type || recurringChild?.therapy_name || "";
            totalPrescribed = allCombinedSlots.length;
            routineSummary = formatRoutineSummary(allCombinedSlots, therapyName);
        }
        // Extract exact child name strictly from database row
        const exactDbName = String(pmsLookup.exactName ||
            (recurringChild ? (recurringChild.child_name || recurringChild.childName || recurringChild.patientName || recurringChild.name) : "") ||
            patientName ||
            "").trim();
        const isFrequent = Boolean(recurringChild) || allCombinedSlots.length > 0;
        const existingPatient = count > 0 || Boolean(recurringChild) || Boolean(exactDbName);
        const isNew = !existingPatient;
        console.log(`[check-patient-status] phone=${cleanPhone} exactDbName="${exactDbName}" existingPatient=${existingPatient} isFrequent=${isFrequent} totalCount=${count} => isNew=${isNew}`);
        if (isFrequent) {
            const upcomingDates = allCombinedSlots.length > 0
                ? calculateNextDates(allCombinedSlots)
                : "";
            console.log(`--> MSG91 HIT: Status Code sent: 200 OK for phone=${cleanPhone} (Frequent/routine patient: "${exactDbName}", Therapy: "${therapyName}", Upcoming: "${upcomingDates}")`);
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
                child_name: exactDbName,
                childName: exactDbName,
                patientName: exactDbName,
                parent_name: parentName,
                parentName: parentName,
                therapy_name: therapyName,
                therapy_type: therapyName,
                routine_summary: routineSummary,
                slots_summary: routineSummary,
                total_prescribed: totalPrescribed,
                totalPrescribed: totalPrescribed,
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
                    child_name: exactDbName,
                    childName: exactDbName,
                    patientName: exactDbName,
                    parent_name: parentName,
                    parentName: parentName,
                    therapy_name: therapyName,
                    therapy_type: therapyName,
                    routine_summary: routineSummary,
                    slots_summary: routineSummary,
                    total_prescribed: totalPrescribed,
                    totalPrescribed: totalPrescribed,
                    upcoming_dates: upcomingDates,
                    status: "returning",
                    phone: cleanPhone,
                    count,
                },
            });
        }
        const patientStatus = isNew ? "new" : "returning";
        console.log(`--> MSG91 HIT: Status Code sent: 404 Not frequent for phone=${cleanPhone} (status="${patientStatus}", isNew=${isNew}, exactDbName="${exactDbName}")`);
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
            child_name: exactDbName,
            childName: exactDbName,
            patientName: exactDbName,
            parent_name: parentName,
            parentName: parentName,
            routine_summary: "",
            slots_summary: "",
            total_prescribed: 0,
            totalPrescribed: 0,
            therapy_name: "",
            therapy_type: "",
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
                child_name: exactDbName,
                childName: exactDbName,
                patientName: exactDbName,
                parent_name: parentName,
                parentName: parentName,
                routine_summary: "",
                slots_summary: "",
                total_prescribed: 0,
                totalPrescribed: 0,
                therapy_name: "",
                therapy_type: "",
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
            child_name: "",
            childName: "",
            patientName: "",
            parent_name: "",
            parentName: "",
            routine_summary: "",
            total_prescribed: 0,
            totalPrescribed: 0,
            therapy_name: "",
            therapy_type: "",
            data: {
                success: false,
                message: "Not frequent",
                status: "new",
                isNew: true,
                is_new: true,
                is_returning: false,
                is_frequent: false,
                child_name: "",
                childName: "",
                patientName: "",
                parent_name: "",
                parentName: "",
                routine_summary: "",
                total_prescribed: 0,
                totalPrescribed: 0,
                therapy_name: "",
                therapy_type: "",
            },
        });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// Custom Slots Booking Handler (/custom-slots-handler)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Normalizes input slot lists from array, JSON string, or comma-separated string.
 */
function parseSlotInputList(raw) {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw.filter((item) => item !== null && item !== undefined && item !== "");
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed)
            return [];
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed))
                    return parsed.filter((item) => item !== null && item !== undefined && item !== "");
            }
            catch {
                // fallback to delimiter split
            }
        }
        return trimmed.split(/[,&]+/).map((s) => s.trim()).filter(Boolean);
    }
    if (typeof raw === "number") {
        return [raw];
    }
    return [];
}
/**
 * Checks if a slot matches an item from user input (by id, index, label, day/time, etc.).
 */
function isSlotMatch(slot, item) {
    if (item === null || item === undefined)
        return false;
    if (typeof item === "object") {
        if (item.id && String(item.id).trim() === String(slot.id).trim())
            return true;
        if (item.index !== undefined && Number(item.index) === Number(slot.index))
            return true;
        if (item.label && String(item.label).trim().toLowerCase() === String(slot.label).trim().toLowerCase())
            return true;
        if (item.day_of_week && item.start_time) {
            return (String(item.day_of_week).trim().toLowerCase() === String(slot.day_of_week).trim().toLowerCase() &&
                String(item.start_time).trim() === String(slot.start_time).trim());
        }
    }
    const str = String(item).trim();
    if (str === String(slot.id) || str === String(slot.index))
        return true;
    const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLabel = String(slot.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanDisplay = String(slot.display || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanStr && (cleanStr === cleanLabel || cleanStr === cleanDisplay))
        return true;
    if (cleanStr.length >= 3 && (cleanLabel.includes(cleanStr) || cleanDisplay.includes(cleanStr)))
        return true;
    return false;
}
/**
 * Filters allSlots matching user selected items.
 */
function matchSelectedSlots(allSlots, selectedItems) {
    const result = [];
    const used = new Set();
    for (const item of selectedItems) {
        const idx = allSlots.findIndex((s, i) => !used.has(i) && isSlotMatch(s, item));
        if (idx !== -1) {
            used.add(idx);
            result.push(allSlots[idx]);
        }
    }
    return result;
}
/**
 * Drops items from allSlots, returning remaining slots.
 */
function dropSpecifiedSlots(allSlots, droppedItems) {
    const droppedIndices = new Set();
    for (const item of droppedItems) {
        const idx = allSlots.findIndex((s, i) => !droppedIndices.has(i) && isSlotMatch(s, item));
        if (idx !== -1) {
            droppedIndices.add(idx);
        }
    }
    return allSlots.filter((_, i) => !droppedIndices.has(i));
}
/**
 * Helper to get upcoming date (YYYY-MM-DD) for a specific day of the week.
 */
function getNextDateForDay(dayName) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetIdx = days.indexOf(dayName.trim().toLowerCase());
    const now = new Date();
    if (targetIdx === -1) {
        return now.toISOString().slice(0, 10);
    }
    const currentIdx = now.getDay();
    let diff = targetIdx - currentIdx;
    if (diff <= 0)
        diff += 7;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const d = String(targetDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
/**
 * POST /api/msg91/custom-slots-handler & /msg91/custom-slots-handler
 *
 * Input body: { phone, requested_count, dropped_slots = [], selected_slots = [] }
 *
 * Flow:
 * a. Patient/child ka prescribed recurring routine database se fetch karo using phone number.
 * b. Total prescribed slots count nikalo (e.g., 15 slots).
 * c. If requested_count == totalPrescribed: Directly all slots consider karo.
 * d. If requested_count < totalPrescribed:
 *    - Smart Threshold logic:
 *      * Agar requested_count <= Math.floor(totalPrescribed / 2):
 *        Return { mode: 'SELECT', required_picks: requested_count, available_options: allSlots }
 *        (or finalize if selected_slots provided)
 *      * Agar requested_count > Math.floor(totalPrescribed / 2):
 *        Calculate toDrop = totalPrescribed - requested_count
 *        Return { mode: 'SKIP', required_drops: toDrop, available_options: allSlots }
 *        (or finalize if dropped_slots provided)
 * e. Finalized slots hone par dynamic pricing calculate karo:
 *    - totalPayable = requested_count * 1500.
 *    - Razorpay payment link generate karo for totalPayable.
 *    - Save booking record in routineBookings and appointments collections.
 *    - Return JSON:
 *      {
 *        success: true,
 *        ready_for_payment: true,
 *        child_name,
 *        department,
 *        total_sessions: requested_count,
 *        total_amount: totalPayable,
 *        routine_summary,
 *        payment_url
 *      }
 */
async function handleCustomSlots(req, res) {
    try {
        await connectMongoDb().catch(() => { });
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        const body = (req.body && typeof req.body === "object" ? req.body : {});
        const query = (req.query && typeof req.query === "object" ? req.query : {});
        const nestedVars = (body.variables && typeof body.variables === "object" ? body.variables : {});
        const nestedData = (body.data && typeof body.data === "object" ? body.data : {});
        const nestedPayload = (body.payload && typeof body.payload === "object" ? body.payload : {});
        // 1. Extract and sanitize phone number
        const rawPhone = body.phone ||
            body.phoneNumber ||
            body.customerNumber ||
            body.mobile ||
            body.sender ||
            body.from ||
            body.wa_id ||
            query.phone ||
            query.phoneNumber ||
            query.customerNumber ||
            query.mobile ||
            query.sender ||
            nestedVars.phone ||
            nestedVars.phoneNumber ||
            nestedVars.customerNumber ||
            nestedVars.sender ||
            nestedData.phone ||
            nestedData.phoneNumber ||
            nestedData.customerNumber ||
            nestedPayload.phone ||
            nestedPayload.phoneNumber ||
            "";
        const digitsOnly = String(rawPhone).replace(/\D/g, "");
        const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
        console.log(`--> MSG91 [custom-slots-handler] hit: method=${req.method} cleanPhone=${cleanPhone}`);
        if (!cleanPhone || cleanPhone.length < 10) {
            return res.status(400).json({
                success: false,
                message: "A valid 10-digit phone number is required",
                phone: cleanPhone || "",
            });
        }
        if (!db) {
            return res.status(500).json({
                success: false,
                message: "Database connection unavailable",
            });
        }
        // 2. Fetch patient/child's prescribed recurring routine from database
        const pmsLookup = await lookupPmsChildSchedule(db, rawPhone || cleanPhone);
        let matchedSchedules = pmsLookup.matchedSchedules;
        let scheduleDoc = pmsLookup.primaryDoc;
        let allCombinedSlots = [...pmsLookup.allSlots];
        const therapiesSet = new Set(pmsLookup.therapies);
        if (allCombinedSlots.length === 0) {
            try {
                const phoneRegex = new RegExp(`${cleanPhone}$`);
                const phoneVariants = [
                    cleanPhone,
                    `+91${cleanPhone}`,
                    `91${cleanPhone}`,
                    `0${cleanPhone}`,
                ];
                const routineBooking = await db.collection("routineBookings").findOne({
                    $or: [
                        ...phoneVariants.flatMap((v) => [{ parent_phone: v }, { phoneNumber: v }, { phone: v }]),
                        { parent_phone: phoneRegex },
                        { phoneNumber: phoneRegex },
                        { phone: phoneRegex },
                    ],
                });
                if (routineBooking) {
                    const bookingTherapy = routineBooking.therapy_type || routineBooking.department || "Therapy";
                    therapiesSet.add(bookingTherapy);
                    scheduleDoc = {
                        child_name: routineBooking.child_name || routineBooking.patientName || routineBooking.childName,
                        parent_name: routineBooking.parent_name || routineBooking.parentName,
                        therapy_type: bookingTherapy,
                        therapist_id: routineBooking.therapistId,
                        therapist_name: routineBooking.therapistName,
                        recurring_slots: routineBooking.sessionSchedule || [],
                        status: routineBooking.status,
                    };
                    const slots = Array.isArray(routineBooking.sessionSchedule) ? routineBooking.sessionSchedule : [];
                    for (const s of slots) {
                        allCombinedSlots.push({
                            day_of_week: s.day_of_week || s.day,
                            start_time: s.start_time || s.time,
                            end_time: s.end_time || s.endTime || calculateEndTime(s.start_time || s.time),
                            therapy_name: s.therapy_name || s.therapy_type || s.department || bookingTherapy,
                        });
                    }
                }
            }
            catch (rbErr) {
                // ignore
            }
        }
        if (!scheduleDoc || allCombinedSlots.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No prescribed recurring routine schedule found for this phone number",
                phone: cleanPhone,
            });
        }
        // Sort slots by calendar day sequence, and chronologically by start_time within each day
        const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        allCombinedSlots.sort((a, b) => {
            const dayA = a.day_of_week ? a.day_of_week.charAt(0).toUpperCase() + a.day_of_week.slice(1).toLowerCase() : "";
            const dayB = b.day_of_week ? b.day_of_week.charAt(0).toUpperCase() + b.day_of_week.slice(1).toLowerCase() : "";
            const idxA = DAY_ORDER.indexOf(dayA);
            const idxB = DAY_ORDER.indexOf(dayB);
            if (idxA !== idxB) {
                if (idxA !== -1 && idxB !== -1)
                    return idxA - idxB;
                if (idxA !== -1)
                    return -1;
                if (idxB !== -1)
                    return 1;
            }
            return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
        });
        const department = Array.from(therapiesSet).join(", ") || scheduleDoc.therapy_type || scheduleDoc.therapy_name || "Occupational Therapy";
        // 3. Extract all prescribed slots
        const allSlots = allCombinedSlots.map((s, idx) => {
            const dayRaw = String(s.day_of_week || s.day || "").trim();
            const day = dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1).toLowerCase();
            const startTime = String(s.start_time || s.time || "").trim();
            const endTime = String(s.end_time || s.endTime || calculateEndTime(startTime)).trim();
            const slotTherapy = String(s.therapy_name || s.therapy_type || s.department || department || "Therapy").trim();
            const label = `${day} ${startTime}-${endTime}: ${slotTherapy}`;
            const display = `${day} • ${startTime}-${endTime}: ${slotTherapy}`;
            return {
                id: String(idx + 1),
                index: idx + 1,
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                therapy_name: slotTherapy,
                therapy_type: slotTherapy,
                label,
                display,
            };
        });
        const totalPrescribed = allSlots.length;
        if (totalPrescribed === 0) {
            return res.status(400).json({
                success: false,
                message: "No prescribed slots configured in the schedule for this child",
                phone: cleanPhone,
            });
        }
        // Fetch prior appointment details for fallback patient/parent metadata
        let priorAppt = null;
        const phoneRegex = new RegExp(`${cleanPhone}$`);
        try {
            priorAppt = await db.collection("appointments").findOne({
                $or: [
                    { phoneNumber: phoneRegex },
                    { phone: phoneRegex },
                    { "rawPayload.customerNumber": phoneRegex },
                ],
            }, { sort: { createdAt: -1, _id: -1 } });
        }
        catch {
            // ignore
        }
        const childName = pmsLookup.exactName || scheduleDoc.child_name || scheduleDoc.childName || scheduleDoc.patientName || priorAppt?.patientName || priorAppt?.childName || `Child (${cleanPhone})`;
        const parentName = pmsLookup.parentName || scheduleDoc.parent_name || scheduleDoc.parentName || priorAppt?.parentName || priorAppt?.parent_name || "";
        const therapistId = scheduleDoc.therapist_id || priorAppt?.therapistId || "roster-ot-1";
        const therapistName = scheduleDoc.therapist_name || priorAppt?.therapistName || priorAppt?.assignedTherapist || "Assigned Therapist";
        // 4. Extract requested_count, dropped_slots, selected_slots
        const rawCount = body.requested_count ??
            body.requestedCount ??
            body.total_sessions ??
            body.totalSessions ??
            body.sessions ??
            body.count ??
            query.requested_count ??
            query.requestedCount ??
            query.sessions ??
            query.count ??
            nestedVars.requested_count ??
            nestedVars.requestedCount ??
            nestedVars.sessions ??
            nestedVars.count ??
            nestedData.requested_count ??
            nestedData.requestedCount ??
            nestedData.count;
        const rawDroppedSlots = body.dropped_slots ??
            body.droppedSlots ??
            body.dropped ??
            query.dropped_slots ??
            query.droppedSlots ??
            nestedVars.dropped_slots ??
            nestedVars.droppedSlots ??
            nestedData.dropped_slots;
        const rawSelectedSlots = body.selected_slots ??
            body.selectedSlots ??
            body.selected ??
            query.selected_slots ??
            query.selectedSlots ??
            nestedVars.selected_slots ??
            nestedVars.selectedSlots ??
            nestedData.selected_slots;
        const parsedDropped = parseSlotInputList(rawDroppedSlots);
        const parsedSelected = parseSlotInputList(rawSelectedSlots);
        if (rawCount === undefined || rawCount === null || rawCount === "") {
            return res.status(400).json({
                success: false,
                message: "requested_count is required",
                total_prescribed: totalPrescribed,
                available_options: allSlots,
            });
        }
        const requestedCount = parseInt(String(rawCount).trim(), 10);
        if (isNaN(requestedCount) || requestedCount <= 0) {
            return res.status(400).json({
                success: false,
                message: "requested_count must be a positive integer greater than 0",
                total_prescribed: totalPrescribed,
                available_options: allSlots,
            });
        }
        if (requestedCount > totalPrescribed) {
            return res.status(400).json({
                success: false,
                message: `requested_count (${requestedCount}) cannot exceed total prescribed slots (${totalPrescribed})`,
                total_prescribed: totalPrescribed,
                available_options: allSlots,
            });
        }
        // 5. Smart Threshold & Slot Resolution Logic
        let finalizedSlots = [];
        const threshold = Math.floor(totalPrescribed / 2);
        const toDrop = totalPrescribed - requestedCount;
        if (requestedCount === totalPrescribed) {
            // c. If requested_count == totalPrescribed: directly consider all slots
            finalizedSlots = allSlots;
        }
        else {
            // d. If requested_count < totalPrescribed: Smart Threshold logic
            if (requestedCount <= threshold) {
                // SELECT mode (e.g. 2 or 3 out of 15)
                if (parsedSelected.length >= requestedCount) {
                    finalizedSlots = matchSelectedSlots(allSlots, parsedSelected).slice(0, requestedCount);
                }
                else if (parsedDropped.length === toDrop) {
                    finalizedSlots = dropSpecifiedSlots(allSlots, parsedDropped);
                }
                if (finalizedSlots.length !== requestedCount) {
                    return res.status(200).json({
                        success: true,
                        ready_for_payment: false,
                        mode: "SELECT",
                        required_picks: requestedCount,
                        total_prescribed: totalPrescribed,
                        child_name: childName,
                        department: department,
                        available_options: allSlots,
                    });
                }
            }
            else {
                // SKIP mode (e.g. 13 or 14 out of 15)
                if (parsedDropped.length >= toDrop) {
                    finalizedSlots = dropSpecifiedSlots(allSlots, parsedDropped);
                }
                else if (parsedSelected.length === requestedCount) {
                    finalizedSlots = matchSelectedSlots(allSlots, parsedSelected);
                }
                if (finalizedSlots.length !== requestedCount) {
                    return res.status(200).json({
                        success: true,
                        ready_for_payment: false,
                        mode: "SKIP",
                        required_drops: toDrop,
                        total_prescribed: totalPrescribed,
                        child_name: childName,
                        department: department,
                        available_options: allSlots,
                    });
                }
            }
        }
        // 6. Dynamic Pricing Calculation: totalPayable = requested_count * 1500
        const totalPayable = requestedCount * 1500;
        const routineSummary = formatRoutineSummary(finalizedSlots, department);
        const uniqueBookingId = `ROUTINE-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
        // 7. Generate Razorpay payment link for totalPayable
        let paymentUrl = "";
        let paymentLinkId = "";
        const keyId = process.env.RAZORPAY_KEY_ID || config.razorpayKeyId;
        const keySecret = process.env.RAZORPAY_KEY_SECRET || config.razorpayKeySecret;
        if (keyId && keySecret) {
            try {
                const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
                const customerContact = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone.slice(-10)}`;
                const customerName = parentName || childName || "Parent";
                const paymentLinkPayload = {
                    amount: Math.round(Number(totalPayable) * 100),
                    currency: "INR",
                    accept_partial: false,
                    description: `Routine Sessions (${requestedCount} sessions) for ${childName} (${uniqueBookingId})`,
                    customer: {
                        name: customerName,
                        contact: customerContact,
                        ...(body.email || nestedData.email ? { email: body.email || nestedData.email } : {}),
                    },
                    notify: {
                        sms: false,
                        email: false,
                    },
                    reminder_enable: false,
                    notes: {
                        bookingId: uniqueBookingId,
                        childName: childName,
                        parentName: parentName,
                        department: department,
                        phone: cleanPhone,
                        totalSessions: String(requestedCount),
                        totalPayable: String(totalPayable),
                        source: "msg91_custom_slots_handler",
                    },
                };
                const paymentLink = await razorpay.paymentLink.create(paymentLinkPayload);
                paymentUrl = paymentLink?.short_url || paymentLink?.url || "";
                paymentLinkId = paymentLink?.id || "";
                console.log(`✅ [custom-slots-handler] Razorpay payment link created: ${paymentLinkId} -> ${paymentUrl}`);
            }
            catch (rzpErr) {
                console.error("❌ [custom-slots-handler] Razorpay payment link creation error:", rzpErr?.message || rzpErr);
            }
        }
        else {
            console.warn("⚠️ [custom-slots-handler] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured");
        }
        // 8. Persist Booking Record to routineBookings and appointments collections
        const todayStr = new Date().toISOString().slice(0, 10);
        const sessionSchedule = finalizedSlots.map((s, idx) => ({
            sessionNumber: idx + 1,
            day: s.day_of_week,
            time: s.start_time,
            endTime: s.end_time || "",
            date: getNextDateForDay(s.day_of_week),
        }));
        const bookingRecord = {
            bookingId: uniqueBookingId,
            phoneNumber: cleanPhone,
            parent_phone: cleanPhone,
            patientName: childName,
            child_name: childName,
            childName: childName,
            parentName: parentName,
            parent_name: parentName,
            selectedPackage: `${requestedCount} Sessions Booking`,
            package: `${requestedCount} Sessions Booking`,
            selectedDays: routineSummary,
            selected_days: routineSummary,
            booking_date: todayStr,
            appointmentDate: sessionSchedule[0]?.date || todayStr,
            appointmentTime: finalizedSlots[0]?.start_time || "10:00",
            department: department,
            therapy_type: department,
            therapistName: therapistName,
            therapistId: therapistId,
            status: "CONFIRMED",
            bookingStatus: "confirmed",
            paymentStatus: "pending",
            totalSessions: requestedCount,
            sessionSchedule: sessionSchedule,
            sessionScheduleText: routineSummary,
            feeCharged: totalPayable,
            amount: totalPayable,
            paymentUrl: paymentUrl,
            paymentLinkId: paymentLinkId,
            bookingSource: "msg91_custom_slots_handler",
            bookingType: "routine_custom",
            isRoutineBooking: true,
            childScheduleId: scheduleDoc._id || null,
            rawPayload: req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        try {
            await db.collection("routineBookings").insertOne({
                ...bookingRecord,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        catch (saveErr) {
            console.warn("[custom-slots-handler] Warning saving routineBookings:", saveErr.message);
        }
        try {
            await db.collection("appointments").insertOne({
                ...bookingRecord,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
        catch (saveErr) {
            console.warn("[custom-slots-handler] Warning saving appointments:", saveErr.message);
        }
        // 9. Return JSON matching user specifications
        return res.status(200).json({
            success: true,
            ready_for_payment: true,
            child_name: childName,
            department: department,
            total_sessions: requestedCount,
            total_amount: totalPayable,
            routine_summary: routineSummary,
            payment_url: paymentUrl,
            payment_link_id: paymentLinkId,
            booking_id: uniqueBookingId,
            finalized_slots: finalizedSlots,
            data: {
                success: true,
                ready_for_payment: true,
                child_name: childName,
                department: department,
                total_sessions: requestedCount,
                total_amount: totalPayable,
                routine_summary: routineSummary,
                payment_url: paymentUrl,
                payment_link_id: paymentLinkId,
                booking_id: uniqueBookingId,
                finalized_slots: finalizedSlots,
            },
        });
    }
    catch (err) {
        console.error("❌ [custom-slots-handler] Error:", err?.message || err);
        return res.status(500).json({
            success: false,
            message: err?.message || "Internal server error processing custom slots",
        });
    }
}
msg91BookingRouter.post(["/custom-slots-handler", "/api/msg91/custom-slots-handler", "/msg91/custom-slots-handler"], handleCustomSlots);
msg91BookingRouter.get(["/custom-slots-handler", "/api/msg91/custom-slots-handler", "/msg91/custom-slots-handler"], handleCustomSlots);
export default msg91BookingRouter;
