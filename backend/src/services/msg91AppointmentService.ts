import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId, type Filter } from "mongodb";
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

export type AppointmentRecord = {
  id: string;
  bookingId: string;
  patientName: string;
  parentName?: string;
  phoneNumber: string;
  age?: number;
  firstSession?: string;
  isFirstSession?: boolean;
  gender?: string;
  city?: string;
  preferredLanguage?: string;
  department?: string;
  therapistId?: string | null;
  therapistName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType?: string;
  mainConcern?: string;
  concernDescription?: string;
  additionalNotes?: string;
  paymentStatus?: string;
  bookingStatus?: string;
  /** Pricing metadata */
  session_frequency?: string;
  totalSessions?: number;
  sessionSchedule?: Array<{ sessionNumber: number; date: string; time: string; day: string }>;
  sessionScheduleText?: string;
  feeCharged?: number;
  rawPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

export function generateSessionSchedule(
  startDate: string,
  startTime: string,
  totalSessions: number = 1
): { schedule: Array<{ sessionNumber: number; date: string; time: string; day: string }>; scheduleText: string } {
  const schedule: Array<{ sessionNumber: number; date: string; time: string; day: string }> = [];
  if (!startDate) return { schedule: [], scheduleText: "" };

  const timeStr = startTime || "10:00";
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Helper to parse date to noon to avoid timezone or DST boundary drift
  let curr: Date;
  const ymdMatch = String(startDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    curr = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]), 12, 0, 0);
  } else {
    const parsed = new Date(startDate);
    if (isNaN(parsed.getTime())) {
      schedule.push({ sessionNumber: 1, date: startDate, time: timeStr, day: "" });
      return { schedule, scheduleText: `Day 1: ${startDate} (${timeStr})` };
    }
    curr = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
  }

  const formatYMD = (d: Date) => {
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
const FEE_ONLINE  = 600;   // ₹600 – online consultation (new or returning, non-counselling)
const FEE_OFFLINE = 800;   // ₹800 – pay at clinic (new or returning, non-counselling)
const FEE_COUNSELLING_SINGLE  = 800;   // ₹800  – returning, counselling single session (1 day)
const FEE_COUNSELLING_2DAYS   = 1600;  // ₹1600 – returning, counselling 2-day package
const FEE_COUNSELLING_3DAYS   = 2400;  // ₹2400 – returning, counselling 3-day package

/**
 * Pure function that returns the appointment fee, totalSessions, and feeCharged
 * based on patient type, appointment mode, department, and session frequency.
 *
 * Pricing rules:
 *  - New patient  → Online: ₹600 | Offline: ₹800
 *  - Returning + Counselling:
 *      "3 Days" / "2400"  → ₹2400, 3 sessions
 *      "2 Days" / "1600"  → ₹1600, 2 sessions
 *      Single / anything else → ₹800, 1 session
 *  - Returning + any other service → Online: ₹600 | Offline: ₹800
 */
export function calculateAppointmentFee(params: {
  isNew: boolean;
  appointmentType: string;        // "online" | "in-person" | "offline" | "clinic"
  department: string;
  session_frequency?: string;     // e.g. "3 Days", "2 Days", "Single", "2400", "1600"
}): { amount: number; totalSessions: number; feeCharged: number } {
  const { isNew, appointmentType, department, session_frequency = "" } = params;
  const isOnline = ["online", "video", "virtual"].includes(appointmentType.toLowerCase().trim());
  const isCounselling = department.toLowerCase().replace(/[_ ]+/g, "-").includes("counsel");

  // New patient — fee depends only on consultation mode
  if (isNew) {
    const amount = isOnline ? FEE_ONLINE : FEE_OFFLINE;
    return { amount, totalSessions: 1, feeCharged: amount };
  }

  // Returning patient + Counselling — tiered by session frequency
  if (isCounselling) {
    const sf = session_frequency.toLowerCase().trim();
    if (sf.includes("3 day") || sf.includes("3day") || sf.includes("2400")) {
      return { amount: FEE_COUNSELLING_3DAYS, totalSessions: 3, feeCharged: FEE_COUNSELLING_3DAYS };
    }
    if (sf.includes("2 day") || sf.includes("2day") || sf.includes("1600")) {
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

function pick(body: Record<string, unknown>, ...keys: string[]): string {
  if (!body || typeof body !== "object") return "";
  for (const key of keys) {
    const value = body[key];
    if (value !== undefined && value !== null) {
      if (typeof value === "string" && value.trim() !== "") return value.trim();
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const inner = String(obj.value ?? obj.name ?? obj.label ?? obj.title ?? obj.id ?? "").trim();
        if (inner) return inner;
      }
    }
  }
  return "";
}

function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function normalizeAppointmentType(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[_ ]+/g, "-");
  if (["inperson", "in-person", "offline", "clinic"].includes(normalized)) return "in-person";
  if (["online", "video", "virtual"].includes(normalized)) return "online";
  return normalized || "in-person";
}

function normalizeStatus(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase().replace(/[_ ]+/g, "-");
  return s || "pending";
}

function payloadData(payload: unknown): Record<string, unknown> {
  const body = (payload ?? {}) as Record<string, unknown>;
  return (body.data ?? body.payload ?? body.variables ?? body.body ?? body) as Record<string, unknown>;
}

export function normalizeAppointmentDate(dateInput: unknown): string {
  const str = String(dateInput ?? "").trim();
  if (!str) return new Date().toISOString().slice(0, 10);

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
    const monthMap: Record<string, number> = {
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

export function normalizeAppointmentTime(timeInput: unknown): string {
  const str = String(timeInput ?? "").trim().toUpperCase();
  if (!str) return "10:00";

  // 1. Check for 12-hour format like "10:30 AM", "2:15 PM", "9:00AM", "12:00 PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
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

export function parseMsg91AppointmentPayload(payload: unknown) {
  const data = payloadData(payload);
  const root = (payload ?? {}) as Record<string, unknown>;

  // Phone: Extract from all possible locations
  const rawPhone =
    pick(
      data,
      "phoneNumber", "phone_number", "phone", "sender", "from", "mobile", "mobileNumber", "mobile_number",
      "customerNumber", "customer_number", "customer_mobile", "wa_id", "wa_number", "whatsapp_number", "caller", "msisdn", "number", "user_phone", "user_id", "receiver"
    ) ||
    pick(root, "phoneNumber", "phone_number", "phone", "customerNumber", "customer_mobile", "from", "mobile", "wa_id");
  const cleanPhone = normalizePhone(rawPhone);

  // Child / Patient Name: Extract with flexible fallback
  const rawChildName =
    pick(
      data,
      "patientName", "patient_name", "childName", "child_name", "name_of_child", "nameOfChild", "child",
      "name", "full_name", "customerName", "userName", "user_name"
    ) ||
    pick(root, "patientName", "childName", "name", "customerName") ||
    "Not specified";

  // Parent Name:
  const rawParentName =
    pick(
      data,
      "parentName", "parent_name", "parent", "guardianName", "guardian_name"
    ) ||
    pick(root, "parentName", "parent", "guardianName") ||
    "";

  // Age:
  const rawAge =
    pick(data, "age", "child_age", "childAge", "age_of_child", "ageOfChild", "patient_age", "patientAge") ||
    pick(root, "age", "child_age", "patientAge");
  let parsedAge = 0;
  if (rawAge !== undefined && rawAge !== null && rawAge !== "") {
    const digitsOnly = String(rawAge).replace(/[^\d]/g, "");
    if (digitsOnly) {
      parsedAge = parseInt(digitsOnly, 10);
    }
  }

  // First Session:
  const rawFirstSession =
    pick(data, "firstSession", "first_session", "is_first_session", "isFirstSession", "first_session_attended", "firstSessionAttended") ||
    pick(root, "firstSession", "isFirstSession") ||
    "";

  // Appointment Date:
  const rawDate =
    pick(data, "appointmentDate", "appointment_date", "date", "selected_date", "date_of_appointment", "schedule") ||
    pick(root, "appointmentDate", "appointment_date", "date", "selected_date");
  const hasDate = Boolean(rawDate && String(rawDate).trim());

  // Appointment Time:
  const rawTime =
    pick(data, "appointment_time", "appointmentTime", "time", "selected_time", "slot", "appointment_slot", "slot_time") ||
    pick(root, "appointmentTime", "appointment_time", "time", "slot");

  // Department / Service: Exhaustive key check and strict normalization
  const rawDepartment =
    pick(
      data,
      "department",
      "service",
      "selected_service",
      "concern_of_child",
      "service_concern",
      "service_name",
      "therapist_name",
      "therapistName",
      "doctor",
      "doctor_name",
      "mainConcern",
      "main_concern",
      "concern"
    ) ||
    pick(
      root,
      "department",
      "service",
      "selected_service",
      "concern_of_child",
      "service_concern",
      "service_name",
      "therapistName",
      "doctor",
      "mainConcern",
      "concern"
    ) ||
    "";
  const resolvedDept = normalizeDepartment(rawDepartment);

  // Concern:
  const rawConcern =
    pick(data, "mainConcern", "main_concern", "concern", "concern_of_child", "concernOfChild", "child_concern", "problem", "message") ||
    pick(root, "mainConcern", "concern", "problem", "message") ||
    "";

  const rawGender = pick(data, "gender") || pick(root, "gender") || "";
  const rawCity = pick(data, "city") || pick(root, "city") || "";
  const rawLang = pick(data, "preferred_language", "preferredLanguage", "language") || pick(root, "preferredLanguage") || "English";
  const rawBookingId = pick(data, "booking_id", "bookingId", "id", "requestId", "uuid") || pick(root, "bookingId", "booking_id", "requestId", "uuid");
  const rawPaymentStatus = pick(data, "payment_status", "paymentStatus") || pick(root, "paymentStatus", "payment_status") || "pending";
  const rawBookingStatus = pick(data, "booking_status", "bookingStatus", "status") || pick(root, "bookingStatus", "status") || "confirmed";
  const rawSessionFrequency =
    pick(data, "session_frequency", "sessionFrequency", "session_type", "sessionType", "frequency") ||
    pick(root, "session_frequency", "sessionFrequency", "frequency") ||
    "";

  const input: Omit<AppointmentRecord, "id" | "bookingId" | "rawPayload" | "createdAt" | "updatedAt"> & { bookingId?: string } = {
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
    session_frequency: rawSessionFrequency || undefined,
  };

  return { input, hasDate };
}

function generatedBookingId(input: any) {
  return `MSG91-${createHash("sha256")
    .update(`${input.phoneNumber}|${input.appointmentDate}|${input.appointmentTime}|${input.therapistId ?? input.therapistName}`)
    .digest("hex")
    .slice(0, 20)}`;
}

function normalizeMongoAppointment(document: Record<string, unknown>): AppointmentRecord {
  const { _id, ...appointment } = document;
  return {
    ...appointment,
    id: _id ? String(_id) : String(appointment.id ?? ""),
  } as AppointmentRecord;
}

export async function saveMsg91Appointment(payload: unknown) {
  const { input } = parseMsg91AppointmentPayload(payload);

  // Connect to MongoDB targeting explicit database
  try {
    await connectMongoDb();
  } catch (connErr: any) {
    console.warn("[saveMsg91Appointment] connectMongoDb error:", connErr.message);
  }

  const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;

  // ── First Session Service Guard ─────────────────────────────────
  let targetDepartment = input.department || normalizeDepartment(input.therapistName || "OT");
  let isFirstSession = true;

  if (db && input.phoneNumber) {
    const cleanPhone = normalizePhone(input.phoneNumber);
    const phoneQueries: string[] = [input.phoneNumber, cleanPhone];
    if (cleanPhone.length === 10) {
      phoneQueries.push(`91${cleanPhone}`, `+91${cleanPhone}`);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
      phoneQueries.push(cleanPhone.slice(2), `+${cleanPhone}`);
    }

    try {
      const existingCount = await db.collection(appointmentCollection).countDocuments({
        phoneNumber: { $in: phoneQueries },
      });

      const requestedDept = input.department ? normalizeDepartment(input.department) : "";
      if (existingCount === 0) {
        isFirstSession = input.firstSession === "false" || input.firstSession === "no" ? false : true;
        targetDepartment = requestedDept || "Counselling";
        input.department = targetDepartment;
        input.firstSession = isFirstSession ? "true" : "false";
        input.isFirstSession = isFirstSession;
        console.log(`[First Session Guard] New patient (${cleanPhone}) -> Department: ${targetDepartment}, isFirstSession: ${isFirstSession}`);
      } else {
        // Returning patient: Keep chosen service as-is and set isFirstSession = false
        isFirstSession = false;
        targetDepartment = requestedDept || targetDepartment;
        input.department = targetDepartment;
        input.firstSession = "false";
        input.isFirstSession = false;
        console.log(`[First Session Guard] Returning patient (${cleanPhone}) with ${existingCount} prior booking(s) -> Retained department: ${targetDepartment}, isFirstSession: false`);
      }
    } catch (countErr: any) {
      console.warn("[First Session Guard] Error checking existingCount:", countErr.message);
      input.isFirstSession = input.firstSession === "true" || input.firstSession === "yes" || input.firstSession === "1";
    }
  } else {
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
    throw new NoSlotsAvailableError(
      `Slot ${input.appointmentTime} on ${input.appointmentDate} is already booked. Please choose another available slot.`
    );
  }

  input.department = targetDepartment;
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
  const { schedule: sessionSchedule, scheduleText: sessionScheduleText } = generateSessionSchedule(
    input.appointmentDate,
    input.appointmentTime,
    totalSessions
  );
  input.sessionSchedule = sessionSchedule;
  input.sessionScheduleText = sessionScheduleText;

  const document = {
    ...input,
    bookingId,
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
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...document,
            updatedAt: now,
          },
        }
      );
      console.log(`[saveMsg91Appointment] Updated existing appointment record: ${bookingId}`);
      return { appointment: normalizeMongoAppointment({ ...existing, ...document }), duplicate: true, isPreliminary: false };
    }

    const result = await collection.insertOne(document);
    console.log(`[saveMsg91Appointment] Inserted new appointment in MongoDB: ${result.insertedId}`);
    return { appointment: { id: result.insertedId.toString(), ...document }, duplicate: false, isPreliminary: false };
  }

async function readStoredAppointments(): Promise<AppointmentRecord[]> {
  try {
    return await readJsonFile<AppointmentRecord[]>(storedAppointmentsPath());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

  // File store fallback
  await fs.mkdir(config.storageDir, { recursive: true });
  const appointments = await readStoredAppointments();
  const existingIndex = appointments.findIndex((item: AppointmentRecord) =>
    item.bookingId === bookingId ||
    (item.phoneNumber === input.phoneNumber && item.appointmentDate === input.appointmentDate && item.appointmentTime === input.appointmentTime)
  );

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

export function appointmentMongoIdFilter(id: string): Filter<Record<string, unknown>> {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}
