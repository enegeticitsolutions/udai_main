import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { z } from "zod";
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
const appointmentTypeSchema = z.enum(["online", "in-person"]);
const paymentStatusSchema = z.enum(["pending", "paid", "failed", "not-required"]);
const bookingStatusSchema = z.enum(["pending", "confirmed", "completed", "cancelled"]);
const msg91AppointmentSchema = z.object({
    bookingId: z.string().trim().min(2).max(180).optional(),
    patientName: z.string().trim().min(1).max(160),
    parentName: z.string().trim().max(160).optional().default("Not specified"),
    phoneNumber: z.string().trim().regex(/^\+?\d{10,15}$/, "Phone number must contain 10 to 15 digits"),
    age: z.coerce.number().int().min(0).max(120),
    gender: z.string().trim().optional().default("Not specified"),
    city: z.string().trim().optional().default("Not specified"),
    preferredLanguage: z.string().trim().optional().default("English"),
    therapistId: z.string().trim().max(160).optional().nullable(),
    therapistName: z.string().trim().min(1).max(160),
    appointmentDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Appointment date must use YYYY-MM-DD"),
    appointmentTime: z.string().trim().optional().default(""),
    appointmentType: appointmentTypeSchema.optional().default("in-person"),
    mainConcern: z.string().trim().max(500).optional().default("General Consultation"),
    concernDescription: z.string().trim().max(3000).optional().default(""),
    additionalNotes: z.string().trim().max(3000).optional().default(""),
    paymentStatus: paymentStatusSchema.optional().default("pending"),
    bookingStatus: bookingStatusSchema.optional().default("pending"),
});
const appointmentCollection = "appointments";
function storedAppointmentsPath() {
    return path.join(config.storageDir, "appointments.json");
}
function pick(body, ...keys) {
    for (const key of keys) {
        const value = body[key];
        if (value !== undefined && value !== null) {
            if (typeof value === "string" && value.trim() !== "")
                return value;
            if (typeof value === "number" || typeof value === "boolean")
                return String(value);
            if (typeof value === "object") {
                const obj = value;
                const inner = String(obj.value ?? obj.name ?? obj.label ?? obj.title ?? "").trim();
                if (inner)
                    return inner;
            }
        }
    }
    return "";
}
function normalizePhone(value) {
    const digits = String(value ?? "").replace(/[^\d]/g, "");
    if (digits.length >= 10 && digits.length <= 15) {
        return digits;
    }
    if (digits.length > 15) {
        return digits.slice(-10);
    }
    if (digits.length > 0) {
        return digits.padStart(10, "9");
    }
    return "919999999999";
}
function normalizeAppointmentType(value) {
    const normalized = String(value ?? "").trim().toLowerCase().replace(/[_ ]+/g, "-");
    if (["inperson", "in-person", "offline", "clinic"].includes(normalized))
        return "in-person";
    if (["online", "video", "virtual"].includes(normalized))
        return "online";
    return normalized;
}
function normalizeStatus(value) {
    return String(value ?? "").trim().toLowerCase().replace(/[_ ]+/g, "-");
}
function payloadData(payload) {
    const body = (payload ?? {});
    return (body.data ?? body.payload ?? body.variables ?? body);
}
function normalizeAppointmentDate(dateInput) {
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
    // 5. Try text match like "27 Jul" or "Mon, 27 Jul"
    const textMatch = str.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (textMatch) {
        const dayNumber = Number(textMatch[1]);
        const monthStr = textMatch[2].toLowerCase();
        const monthMap = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
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
        return "";
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
    return str;
}
export function parseMsg91AppointmentPayload(payload) {
    const data = payloadData(payload);
    const rawTime = pick(data, "appointment_time", "appointmentTime", "time", "selected_time", "slot", "appointment_slot", "slot_time");
    const rawGender = pick(data, "gender");
    const rawCity = pick(data, "city");
    const rawLang = pick(data, "preferred_language", "preferredLanguage", "language");
    // Child / Patient Name
    const rawPatientName = pick(data, "name_of_child", "nameOfChild", "child_name", "childName", "child", "patient_name", "patientName", "name", "full_name", "customerName", "userName");
    // Parent Name
    const rawParentName = pick(data, "parent_name", "parentName", "parent", "guardian_name", "guardianName");
    // Therapist / Department / Service
    const rawTherapistName = pick(data, "therapist_name", "therapistName", "doctor", "doctor_name", "department", "service", "service_name", "selected_service");
    // Appointment Date
    const rawDate = pick(data, "appointment_date", "appointmentDate", "date", "selected_date", "date_of_appointment");
    const hasDate = Boolean(rawDate && String(rawDate).trim());
    // Phone Number
    const rawPhone = pick(data, "phone_number", "phoneNumber", "mobile", "phone", "wa_id", "customerNumber", "customer_number", "mobileNumber", "mobile_number", "user_phone", "from", "sender", "caller", "msisdn", "number", "whatsapp_number", "wa_number", "user_id", "receiver");
    // Age
    const rawAge = pick(data, "age_of_child", "ageOfChild", "child_age", "childAge", "age", "patient_age", "patientAge");
    // Concern
    const rawConcern = pick(data, "concern_of_child", "concernOfChild", "child_concern", "main_concern", "mainConcern", "concern");
    let parsedAge = 0;
    if (rawAge !== undefined && rawAge !== null && rawAge !== "") {
        const digitsOnly = String(rawAge).replace(/[^\d]/g, "");
        if (digitsOnly) {
            parsedAge = parseInt(digitsOnly, 10);
        }
    }
    const parsedInput = msg91AppointmentSchema.parse({
        bookingId: pick(data, "booking_id", "bookingId", "id") || undefined,
        patientName: rawPatientName || "Child",
        parentName: rawParentName || "Parent",
        phoneNumber: normalizePhone(rawPhone),
        age: parsedAge,
        gender: rawGender || undefined,
        city: rawCity || undefined,
        preferredLanguage: rawLang || undefined,
        therapistId: pick(data, "therapist_id", "therapistId", "doctor_id", "doctorId") || null,
        therapistName: normalizeDepartment(rawTherapistName || "General Consultation"),
        appointmentDate: normalizeAppointmentDate(rawDate),
        appointmentTime: normalizeAppointmentTime(rawTime) || undefined,
        appointmentType: normalizeAppointmentType(pick(data, "appointment_type", "appointmentType", "visit_type") || "in-person"),
        mainConcern: rawConcern || "General Consultation",
        concernDescription: pick(data, "concern_description", "concernDescription", "description") || "",
        additionalNotes: pick(data, "additional_notes", "additionalNotes", "notes") || "",
        paymentStatus: normalizeStatus(pick(data, "payment_status", "paymentStatus") || "pending"),
        bookingStatus: normalizeStatus(pick(data, "booking_status", "bookingStatus", "status") || "pending"),
    });
    return { input: parsedInput, hasDate };
}
function generatedBookingId(input) {
    return `MSG91-${createHash("sha256")
        .update(`${input.phoneNumber}|${input.appointmentDate}|${input.appointmentTime}|${input.therapistId ?? input.therapistName}`)
        .digest("hex")
        .slice(0, 20)}`;
}
function duplicateFilter(input, bookingId) {
    return {
        $or: [
            { bookingId },
            {
                phoneNumber: input.phoneNumber,
                appointmentDate: input.appointmentDate,
                appointmentTime: input.appointmentTime,
            },
        ],
    };
}
function normalizeMongoAppointment(document) {
    const { _id, ...appointment } = document;
    return {
        ...appointment,
        id: _id ? String(_id) : String(appointment.id ?? ""),
    };
}
async function ensureAppointmentIndexes() {
    const collection = getMongoDb().collection(appointmentCollection);
    await Promise.all([
        collection.createIndex({ bookingId: 1 }, { unique: true }),
        collection.createIndex({ phoneNumber: 1, appointmentDate: 1, appointmentTime: 1 }, { unique: true }),
        collection.createIndex({ bookingStatus: 1, appointmentDate: 1 }),
        collection.createIndex({ therapistId: 1, appointmentDate: 1 }),
        collection.createIndex({ createdAt: -1 }),
    ]);
    return collection;
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
export async function saveMsg91Appointment(payload) {
    const { input, hasDate } = parseMsg91AppointmentPayload(payload);
    // If date was NOT explicitly provided in the payload (intermediate flow node like Connection_Api_2),
    // return preliminary success without writing incomplete bookings to DB or locking slots.
    if (!hasDate) {
        const preliminaryRecord = {
            ...input,
            id: "preliminary-service-selection",
            bookingId: "PRELIMINARY",
            appointmentDate: "",
            appointmentTime: "",
            bookingStatus: "pending",
            rawPayload: payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        return { appointment: preliminaryRecord, duplicate: false, isPreliminary: true };
    }
    // If appointmentTime is missing or empty, pick first available slot or fallback to default slot 10:00
    if (!input.appointmentTime || input.appointmentTime.trim() === "") {
        const availableSlots = await getAvailableSlots(input.therapistName, input.appointmentDate);
        if (availableSlots && availableSlots.length > 0) {
            input.appointmentTime = availableSlots[0].time;
        }
        else {
            input.appointmentTime = "10:00";
        }
    }
    // Reserve slot by assigning available therapist if possible
    const assigned = await assignTherapist(input.therapistName, input.appointmentDate, input.appointmentTime);
    if (assigned) {
        input.therapistId = assigned.id;
        input.therapistName = assigned.name;
    }
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
    await connectMongoDb();
    if (isMongoConnected()) {
        const collection = await ensureAppointmentIndexes();
        const filter = duplicateFilter(input, bookingId);
        const existing = await collection.findOne(filter);
        if (existing)
            return { appointment: normalizeMongoAppointment(existing), duplicate: true };
        const result = await collection.insertOne(document);
        return { appointment: { id: result.insertedId.toString(), ...document }, duplicate: false };
    }
    await fs.mkdir(config.storageDir, { recursive: true });
    const appointments = await readStoredAppointments();
    const existing = appointments.find((item) => item.bookingId === bookingId ||
        (item.phoneNumber === input.phoneNumber && item.appointmentDate === input.appointmentDate && item.appointmentTime === input.appointmentTime));
    if (existing)
        return { appointment: existing, duplicate: true };
    const appointment = { id: randomUUID(), ...document };
    await writeJsonFile(storedAppointmentsPath(), [appointment, ...appointments]);
    return { appointment, duplicate: false };
}
export function appointmentMongoIdFilter(id) {
    return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}
