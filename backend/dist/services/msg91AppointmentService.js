import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
const appointmentTypeSchema = z.enum(["online", "in-person"]);
const paymentStatusSchema = z.enum(["pending", "paid", "failed", "not-required"]);
const bookingStatusSchema = z.enum(["pending", "confirmed", "completed", "cancelled"]);
const msg91AppointmentSchema = z.object({
    bookingId: z.string().trim().min(2).max(180).optional(),
    patientName: z.string().trim().min(2).max(160),
    phoneNumber: z.string().trim().regex(/^\+?\d{10,15}$/, "Phone number must contain 10 to 15 digits"),
    age: z.coerce.number().int().min(0).max(120),
    gender: z.string().trim().min(1).max(60),
    city: z.string().trim().min(2).max(160),
    preferredLanguage: z.string().trim().min(2).max(80),
    therapistId: z.string().trim().max(160).optional().nullable(),
    therapistName: z.string().trim().min(2).max(160),
    appointmentDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Appointment date must use YYYY-MM-DD"),
    appointmentTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Appointment time must use HH:mm"),
    appointmentType: appointmentTypeSchema,
    mainConcern: z.string().trim().min(2).max(500),
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
        if (value !== undefined && value !== null && String(value).trim() !== "")
            return value;
    }
    return "";
}
function normalizePhone(value) {
    return String(value ?? "").replace(/[^\d+]/g, "");
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
export function parseMsg91AppointmentPayload(payload) {
    const data = payloadData(payload);
    return msg91AppointmentSchema.parse({
        bookingId: pick(data, "booking_id", "bookingId", "id") || undefined,
        patientName: pick(data, "patient_name", "patientName", "name", "full_name"),
        phoneNumber: normalizePhone(pick(data, "phone_number", "phoneNumber", "mobile", "phone", "wa_id")),
        age: pick(data, "age", "patient_age", "patientAge"),
        gender: pick(data, "gender"),
        city: pick(data, "city"),
        preferredLanguage: pick(data, "preferred_language", "preferredLanguage", "language"),
        therapistId: pick(data, "therapist_id", "therapistId", "doctor_id", "doctorId") || null,
        therapistName: pick(data, "therapist_name", "therapistName", "doctor", "doctor_name"),
        appointmentDate: pick(data, "appointment_date", "appointmentDate", "date"),
        appointmentTime: pick(data, "appointment_time", "appointmentTime", "time"),
        appointmentType: normalizeAppointmentType(pick(data, "appointment_type", "appointmentType", "visit_type")),
        mainConcern: pick(data, "main_concern", "mainConcern", "concern"),
        concernDescription: pick(data, "concern_description", "concernDescription", "description"),
        additionalNotes: pick(data, "additional_notes", "additionalNotes", "notes"),
        paymentStatus: normalizeStatus(pick(data, "payment_status", "paymentStatus") || "pending"),
        bookingStatus: normalizeStatus(pick(data, "booking_status", "bookingStatus", "status") || "pending"),
    });
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
    const input = parseMsg91AppointmentPayload(payload);
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
