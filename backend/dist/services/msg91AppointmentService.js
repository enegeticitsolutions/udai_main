import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { assignTherapist, getAvailableSlots, normalizeDepartment } from "./bookingService.js";
export class NoSlotsAvailableError extends Error {
    constructor(message = "No appointment slots available for the selected date.") {
        super(message);
        this.name = "NoSlotsAvailableError";
    }
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
    // Department / Service: Exhaustive key check and strict normalization
    const rawDepartment = pick(data, "department", "service", "selected_service", "concern_of_child", "service_concern", "service_name", "therapist_name", "therapistName", "doctor", "doctor_name", "mainConcern", "main_concern", "concern") ||
        pick(root, "department", "service", "selected_service", "concern_of_child", "service_concern", "service_name", "therapistName", "doctor", "mainConcern", "concern") ||
        "";
    const resolvedDept = normalizeDepartment(rawDepartment);
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
        department: resolvedDept,
        therapistId: pick(data, "therapist_id", "therapistId", "doctor_id", "doctorId") || null,
        therapistName: resolvedDept,
        appointmentDate: normalizeAppointmentDate(rawDate),
        appointmentTime: normalizeAppointmentTime(rawTime),
        appointmentType: normalizeAppointmentType(pick(data, "appointment_type", "appointmentType", "visit_type") || "in-person"),
        mainConcern: rawConcern,
        concernDescription: pick(data, "concern_description", "concernDescription", "description") || "",
        additionalNotes: pick(data, "additional_notes", "additionalNotes", "notes") || "",
        paymentStatus: normalizeStatus(rawPaymentStatus),
        bookingStatus: normalizeStatus(rawBookingStatus) || "confirmed",
    };
    return { input, hasDate };
}
function generatedBookingId(input) {
    return `MSG91-${createHash("sha256")
        .update(`${input.phoneNumber}|${input.appointmentDate}|${input.appointmentTime}|${input.therapistId ?? input.therapistName}`)
        .digest("hex")
        .slice(0, 20)}`;
}
function normalizeMongoAppointment(document) {
    const { _id, ...appointment } = document;
    return {
        ...appointment,
        id: _id ? String(_id) : String(appointment.id ?? ""),
    };
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
    // ── First Session Service Guard ─────────────────────────────────
    let targetDepartment = input.department || normalizeDepartment(input.therapistName || "OT");
    let isFirstSession = true;
    if (db && input.phoneNumber) {
        const cleanPhone = normalizePhone(input.phoneNumber);
        const phoneQueries = [input.phoneNumber, cleanPhone];
        if (cleanPhone.length === 10) {
            phoneQueries.push(`91${cleanPhone}`, `+91${cleanPhone}`);
        }
        else if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
            phoneQueries.push(cleanPhone.slice(2), `+${cleanPhone}`);
        }
        try {
            const existingCount = await db.collection(appointmentCollection).countDocuments({
                phoneNumber: { $in: phoneQueries },
            });
            if (existingCount === 0) {
                // New patient: Force department to Counselling and set isFirstSession = true
                isFirstSession = true;
                targetDepartment = "Counselling";
                input.department = "Counselling";
                input.firstSession = "true";
                input.isFirstSession = true;
                input.additionalNotes = input.additionalNotes
                    ? `${input.additionalNotes} | First session auto-assigned to Counselling`
                    : "First session auto-assigned to Counselling";
                console.log(`[First Session Guard] New patient (${cleanPhone}) -> Force department: Counselling, isFirstSession: true`);
            }
            else {
                // Returning patient: Keep chosen service as-is and set isFirstSession = false
                isFirstSession = false;
                input.department = targetDepartment;
                input.firstSession = "false";
                input.isFirstSession = false;
                console.log(`[First Session Guard] Returning patient (${cleanPhone}) with ${existingCount} prior booking(s) -> Retained department: ${targetDepartment}, isFirstSession: false`);
            }
        }
        catch (countErr) {
            console.warn("[First Session Guard] Error checking existingCount:", countErr.message);
            input.isFirstSession = input.firstSession === "true" || input.firstSession === "yes" || input.firstSession === "1";
        }
    }
    else {
        input.isFirstSession = input.firstSession === "true" || input.firstSession === "yes" || input.firstSession === "1";
    }
    // Check availability on date
    const availableSlots = await getAvailableSlots(targetDepartment, input.appointmentDate);
    if (!availableSlots || availableSlots.length === 0) {
        console.warn(`[saveMsg91Appointment] No therapists/slots available for ${targetDepartment} on ${input.appointmentDate}`);
        throw new NoSlotsAvailableError(`All therapists for ${targetDepartment} are marked as unavailable on ${input.appointmentDate}. Please choose another date.`);
    }
    // If appointmentTime is missing or empty, pick first available slot
    if (!input.appointmentTime || input.appointmentTime.trim() === "") {
        input.appointmentTime = availableSlots[0]?.time || "10:00";
    }
    // Assign a free therapist using balanced alternating logic across eligible doctors
    const assigned = await assignTherapist(targetDepartment, input.appointmentDate, input.appointmentTime);
    if (!assigned) {
        console.warn(`[saveMsg91Appointment] Collision detected: No therapist available for ${targetDepartment} on ${input.appointmentDate} at ${input.appointmentTime}`);
        throw new NoSlotsAvailableError(`Slot ${input.appointmentTime} on ${input.appointmentDate} is already booked. Please choose another available slot.`);
    }
    input.department = targetDepartment;
    input.therapistId = assigned.id;
    input.therapistName = assigned.name;
    input.bookingStatus = "confirmed";
    const bookingId = input.bookingId || generatedBookingId(input);
    const now = new Date().toISOString();
    const document = {
        ...input,
        bookingId,
        rawPayload: payload,
        createdAt: now,
        updatedAt: now,
    };
    if (db) {
        const collection = db.collection(appointmentCollection);
        // Check if an appointment with this bookingId or phone + slot exists
        const filter = {
            $or: [
                { bookingId },
                {
                    phoneNumber: input.phoneNumber,
                    appointmentDate: input.appointmentDate,
                    appointmentTime: input.appointmentTime,
                },
            ],
        };
        const existing = await collection.findOne(filter);
        if (existing) {
            // Update existing record
            await collection.updateOne({ _id: existing._id }, {
                $set: {
                    ...document,
                    updatedAt: now,
                },
            });
            console.log(`[saveMsg91Appointment] Updated existing appointment record: ${bookingId}`);
            return { appointment: normalizeMongoAppointment({ ...existing, ...document }), duplicate: true, isPreliminary: false };
        }
        const result = await collection.insertOne(document);
        console.log(`[saveMsg91Appointment] Inserted new appointment in MongoDB: ${result.insertedId}`);
        return { appointment: { id: result.insertedId.toString(), ...document }, duplicate: false, isPreliminary: false };
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
