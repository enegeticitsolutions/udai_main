/**
 * bookingService.ts
 *
 * Core logic for the UDAI appointment booking system.
 *
 * Slot rules:
 *  - Duration: 45 minutes
 *  - Working hours: driven by therapist weeklySchedule
 *  - Lunch break: slots overlapping the lunch window are excluded
 *
 * Booking collection: `webhookmessages`
 * Leave collection:   `therapistUnavailability`
 * Schedule source:    `therapists` collection via TherapistModel
 */

import { TherapistModel, DEFAULT_WEEKLY_SCHEDULE, type ITherapist, type IWeeklyScheduleEntry } from "../models/Therapist.js";
import { TherapistUnavailability } from "../models/TherapistUnavailability.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
import { AvailabilityModel } from "../models/Availability.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import mongoose from "mongoose";

// ── Dynamic Availability Helper ──────────────────────────────────────────────

async function getUnavailableTherapists(date: string): Promise<string[]> {
  try {
    let records: any[] = [];
    if (mongoose.connection.readyState === 1) {
      records = await AvailabilityModel.find({ date, isAvailable: false }).lean();
    } else {
      await connectMongoDb();
      const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
      if (db) {
        records = await db.collection("availabilities").find({ date, isAvailable: false }).toArray();
      }
    }
    return records.map((r: any) => String(r.therapistName ?? ""));
  } catch (err: any) {
    console.warn("[getUnavailableTherapists] Error reading availabilities:", err.message);
    return [];
  }
}

function isTherapistUnavailable(name: string, unavailableNames: string[]): boolean {
  if (!unavailableNames || unavailableNames.length === 0) return false;
  const n = name.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
  return unavailableNames.some((un) => {
    const unNorm = un.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
    return n === unNorm || n.includes(unNorm) || unNorm.includes(n);
  });
}

// ── Constants ────────────────────────────────────────────────────────────────

const SLOT_DURATION_MINUTES = 45;

// ── Department Normalization ─────────────────────────────────────────────────

/**
 * Normalizes input department name to one of the 6 public bookable departments.
 * Excludes Founder Trustee or other non-bookable roles.
 */
export function normalizeDepartment(dept: string): string {
  const d = String(dept ?? "").trim();
  if (/^(ot|occupational\s*therapist)$/i.test(d)) return "OT";
  if (/^(speech\s*therapy|speech\s*therapist|speech\s*and\s*language\s*therapist)$/i.test(d)) return "Speech Therapy";
  if (/^(physical\s*therapy|physiotherapy|pediatric\s*physiotherapist)$/i.test(d)) return "Physical Therapy";
  if (/^(nios\s*instructor|academic\s*support)$/i.test(d)) return "Academic Support";
  if (/^(special\s*educator)$/i.test(d)) return "Special Educator";
  if (/^(counselling)$/i.test(d)) return "Counselling";
  return d;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert "HH:MM" to total minutes since midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert total minutes since midnight back to "HH:MM" */
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format "HH:MM" → "9:00 AM" style label */
function formatLabel(time: string): string {
  const [hourStr, minStr] = time.split(":");
  const hour = Number(hourStr);
  const min = Number(minStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(min).padStart(2, "0")} ${suffix}`;
}

/**
 * Returns the exact clinical shift schedule for a therapist on working days (Mon-Sat).
 */
export function getTherapistClinicalSchedule(therapistName: string): IWeeklyScheduleEntry[] {
  const name = String(therapistName || "").toLowerCase().trim();
  const workingDays = [1, 2, 3, 4, 5, 6]; // Monday (1) to Saturday (6)

  if (name.includes("atal")) {
    // Atal: 09:15 - 17:15 (Lunch: 13:00 - 13:30)
    return workingDays.map((day) => ({
      day,
      startTime: "09:15",
      endTime: "17:15",
      lunchStart: "13:00",
      lunchEnd: "13:30",
    }));
  }

  if (name.includes("sakshi")) {
    // Sakshi: 10:00 - 14:00 (No Lunch)
    return workingDays.map((day) => ({
      day,
      startTime: "10:00",
      endTime: "14:00",
      lunchStart: "00:00",
      lunchEnd: "00:00",
    }));
  }

  if (name.includes("harsimran")) {
    // Harsimran: 13:00 - 17:15 (No Lunch)
    return workingDays.map((day) => ({
      day,
      startTime: "13:00",
      endTime: "17:15",
      lunchStart: "00:00",
      lunchEnd: "00:00",
    }));
  }

  // Standard shift: Nikki, Divya, Sobha, Sonia, Ranjana, Durgesh, Tanu (10:00 - 16:30, Lunch: 13:00 - 13:30)
  return workingDays.map((day) => ({
    day,
    startTime: "10:00",
    endTime: "16:30",
    lunchStart: "13:00",
    lunchEnd: "13:30",
  }));
}

/**
 * Generates 45-minute slots between startTime and endTime for a single contiguous block of time.
 */
function generateSlotsForBlock(startTime: string, endTime: string): string[] {
  const startMins = toMinutes(startTime);
  const endMins = toMinutes(endTime);
  const slots: string[] = [];
  let current = startMins;

  while (current + SLOT_DURATION_MINUTES <= endMins) {
    slots.push(fromMinutes(current));
    current += SLOT_DURATION_MINUTES;
  }

  return slots;
}

/**
 * Generate 45-minute slots between startTime and endTime,
 * generating slots independently for the morning block (before lunch)
 * and the afternoon block (after lunch).
 */
function generateSlots(
  startTime: string,
  endTime: string,
  lunchStart: string,
  lunchEnd: string
): string[] {
  const hasLunch =
    lunchStart &&
    lunchEnd &&
    lunchStart !== "00:00" &&
    lunchEnd !== "00:00" &&
    lunchStart !== lunchEnd;

  let slots: string[] = [];
  if (!hasLunch) {
    slots = generateSlotsForBlock(startTime, endTime);
  } else {
    const morningSlots = generateSlotsForBlock(startTime, lunchStart);
    const afternoonSlots = generateSlotsForBlock(lunchEnd, endTime);
    slots = [...morningSlots, ...afternoonSlots];
  }

  // For 13:00 - 17:15 shift (e.g. Harsimran), ensure 16:30 is included as the final 45m slot
  if (startTime === "13:00" && endTime === "17:15" && !slots.includes("16:30")) {
    slots.push("16:30");
    slots.sort((a, b) => toMinutes(a) - toMinutes(b));
  }

  return slots;
}

/** Get day-of-week (0=Sunday … 6=Saturday) from YYYY-MM-DD */
function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

/** Returns true if `time` falls within [blockStart, blockEnd) */
function timeInRange(time: string, blockStart: string, blockEnd: string): boolean {
  const t = toMinutes(time);
  return t >= toMinutes(blockStart) && t < toMinutes(blockEnd);
}

/**
 * Checks whether a given slot start time falls within the therapist's working shift hours,
 * taking into account potential lunch breaks.
 */
function isTimeInTherapistShift(time: string, therapist: ITherapist, dayOfWeek: number): boolean {
  const schedule = therapist.weeklySchedule.find((s) => s.day === dayOfWeek);
  if (!schedule) return false;

  const t = toMinutes(time);
  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);
  const slotEnd = t + SLOT_DURATION_MINUTES;

  // Must fit within the therapist's shift boundaries
  if (t < start || slotEnd > end) return false;

  // Exclude if it overlaps with lunch
  const hasLunch =
    schedule.lunchStart &&
    schedule.lunchEnd &&
    schedule.lunchStart !== "00:00" &&
    schedule.lunchEnd !== "00:00" &&
    schedule.lunchStart !== schedule.lunchEnd;

  if (hasLunch) {
    const lunchStartMins = toMinutes(schedule.lunchStart);
    const lunchEndMins = toMinutes(schedule.lunchEnd);
    const overlapsLunch = t < lunchEndMins && slotEnd > lunchStartMins;
    if (overlapsLunch) return false;
  }

  return true;
}

// ── Therapist data loader ─────────────────────────────────────────────────────

/**
 * Load active therapists for a department with clinical shift schedules applied.
 */
async function loadTherapists(department: string): Promise<ITherapist[]> {
  const normalizedDept = normalizeDepartment(department);

  const mongoTherapists = await TherapistModel.find({
    department: normalizedDept,
    active: true,
  }).lean();

  if (mongoTherapists.length > 0) {
    return mongoTherapists.map((t) => ({
      ...t,
      weeklySchedule: getTherapistClinicalSchedule(t.name),
    })) as ITherapist[];
  }

  // Fallback: JSON-based content service with clinical shift schedules
  const { getTherapists } = await import("./contentService.js");
  const allTherapists = await getTherapists();
  return allTherapists
    .filter(
      (t: any) =>
        normalizeDepartment(t.department) === normalizedDept &&
        t.active !== false &&
        t.isActive !== false
    )
    .map((t: any) => ({
      _id: String(t.id ?? t._id ?? `json-${t.name}`),
      name: t.name,
      department: normalizeDepartment(t.department),
      role: t.role ?? "",
      image: t.image ?? "",
      summary: t.summary ?? "",
      active: true,
      weeklySchedule: getTherapistClinicalSchedule(t.name),
    }));
}

// ── Active Appointments Helper ───────────────────────────────────────────────

async function getActiveAppointmentsForDate(date: string): Promise<any[]> {
  try {
    if (!isMongoConnected() && mongoose.connection.readyState !== 1) {
      await connectMongoDb();
    }
    const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
    if (db) {
      const docs = await db.collection("appointments").find({
        appointmentDate: date,
        bookingStatus: { $nin: ["cancelled", "rejected"] },
      }).toArray();
      return docs;
    }
  } catch (err: any) {
    console.warn("[getActiveAppointmentsForDate] Error fetching appointments:", err.message);
  }
  return [];
}

export function isTherapistBookedForSlot(
  therapist: ITherapist,
  time: string,
  appointments: any[]
): boolean {
  const tName = therapist.name.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
  const tid = String(therapist._id || "");

  return appointments.some((appt) => {
    if (appt.appointmentTime !== time) return false;
    const aName = String(appt.therapistName || appt.assignedTherapist || "")
      .toLowerCase()
      .replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "")
      .trim();
    const aId = String(appt.therapistId || appt.assignedTherapistId || "");

    if (tid && aId && tid === aId) return true;
    if (aName && (tName === aName || tName.includes(aName) || aName.includes(tName))) return true;
    return false;
  });
}

// ── Core booking queries ──────────────────────────────────────────────────────

export interface SlotInfo {
  time: string;
  label: string;
  totalTherapists: number;
  bookedCount: number;
  availableCount: number;
  isAvailable: boolean;
}

/**
 * Returns ONLY the available 45-min slots for a department on a given date.
 */
export async function getAvailableSlots(
  department: string,
  date: string
): Promise<SlotInfo[]> {
  const normalizedDept = normalizeDepartment(department);

  // Sunday check: force 0 slots
  const [yr, mo, dy] = date.split("-").map(Number);
  const dateObj = new Date(yr, mo - 1, dy);
  if (dateObj.getDay() === 0) {
    console.log(`[Slots Log] Raw Dept: "${department}", Normalized: "${normalizedDept}", Date: "${date}", Matched Therapists: [], Generated Slots: 0 (Sunday: Not Scheduled)`);
    return [];
  }

  const dayOfWeek = getDayOfWeek(date);

  // 1. Load active therapists for this department
  const therapists = await loadTherapists(normalizedDept);
  if (therapists.length === 0) {
    console.log(`[Slots Log] Raw Dept: "${department}", Normalized: "${normalizedDept}", Date: "${date}", Matched Therapists: [], Generated Slots: 0`);
    return [];
  }

  // 2. Filter to those who work on this weekday
  const workingTherapists = therapists.filter((t) =>
    t.weeklySchedule.some((s) => s.day === dayOfWeek)
  );
  if (workingTherapists.length === 0) {
    console.log(`[Slots Log] Raw Dept: "${department}", Normalized: "${normalizedDept}", Date: "${date}", Matched Therapists: [], Generated Slots: 0`);
    return [];
  }

  // 2b. Exclude therapists dynamically marked as Unavailable in MongoDB availabilities collection
  const unavailNames = await getUnavailableTherapists(date);
  const activeWorkingTherapists = workingTherapists.filter(
    (t) => !isTherapistUnavailable(t.name, unavailNames)
  );
  const activeTherapistNames = activeWorkingTherapists.map((t) => t.name);

  if (activeWorkingTherapists.length === 0) {
    console.log(`[Slots Log] Raw Dept: "${department}", Normalized: "${normalizedDept}", Date: "${date}", All therapists unavailable [${unavailNames.join(", ")}], Generated Slots: 0`);
    return [];
  }

  // 3. Load leave records for these therapists on this date
  const therapistIds = activeWorkingTherapists.map((t) => String(t._id));
  const leaves = await TherapistUnavailability.find({
    therapistId: { $in: therapistIds },
    date,
  }).lean();

  // 4. Load confirmed bookings from appointments collection
  const activeBookings = await getActiveAppointmentsForDate(date);

  // 5. Generate all possible 45-minute slot times from active working therapists
  const slotTimesSet = new Set<string>();

  for (const therapist of activeWorkingTherapists) {
    const sched = therapist.weeklySchedule.find((s) => s.day === dayOfWeek);
    if (!sched) continue;
    const tSlots = generateSlots(sched.startTime, sched.endTime, sched.lunchStart, sched.lunchEnd);
    for (const time of tSlots) {
      slotTimesSet.add(time);
    }
  }

  // Sort unique slot times chronologically
  const sortedSlotTimes = Array.from(slotTimesSet).sort((a, b) => {
    return toMinutes(a) - toMinutes(b);
  });

  // 6. Evaluate each slot capacity
  const availableSlots: SlotInfo[] = [];

  for (const time of sortedSlotTimes) {
    const freeTherapistsAtSlot = activeWorkingTherapists.filter((therapist) => {
      // Must fit in shift & not overlap lunch
      if (!isTimeInTherapistShift(time, therapist, dayOfWeek)) return false;
      // Must not be on leave
      const tid = String(therapist._id);
      if (leaves.some((l) => l.therapistId === tid && l.type === "full")) return false;
      // Must not be already booked in appointments collection
      if (isTherapistBookedForSlot(therapist, time, activeBookings)) return false;
      return true;
    });

    const availableCount = freeTherapistsAtSlot.length;
    const totalTherapists = activeWorkingTherapists.filter((t) => isTimeInTherapistShift(time, t, dayOfWeek)).length;

    // STRICT NON-COLLISION RULE:
    // If availableCount === 0 (all therapists booked or unavailable), OMIT this slot completely so it cannot be selected on WhatsApp!
    if (availableCount > 0) {
      availableSlots.push({
        time,
        label: formatLabel(time),
        totalTherapists,
        bookedCount: totalTherapists - availableCount,
        availableCount,
        isAvailable: true,
      });
    }
  }

  console.log(`[Slots Log] Raw Dept: "${department}", Normalized: "${normalizedDept}", Date: "${date}", Matched Therapists: [${activeTherapistNames.join(", ")}], Generated Slots: ${availableSlots.length}`);
  return availableSlots;
}

/**
 * Returns dates from today through the next 4 days (5 days total)
 * that have at least one available slot for the given department.
 * Dates are returned as objects with title ("Thu, 16 Jul") and value ("2026-07-16").
 */
export async function getAvailableDates(
  department: string
): Promise<{ title: string; value: string }[]> {
  const normalizedDept = normalizeDepartment(department);
  const results: { title: string; value: string }[] = [];

  // Get current date/time in Asia/Kolkata
  const kolkataTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(kolkataTime);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 0; i <= 4; i++) {
    const d = new Date(localDate);
    d.setDate(d.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const slots = await getAvailableSlots(normalizedDept, dateStr);
    if (slots.length > 0) {
      const weekdayStr = weekdays[d.getDay()];
      const dayStr = d.getDate();
      const monthStr = months[d.getMonth()];
      const title = `${weekdayStr}, ${dayStr} ${monthStr}`;

      results.push({
        title,
        value: dateStr,
      });
    }
  }

  return results;
}

/**
 * Assigns the first available therapist for a department / date / time.
 */
export async function assignTherapist(
  department: string,
  date: string,
  time: string
): Promise<{ id: string; name: string } | null> {
  const normalizedDept = normalizeDepartment(department);
  const dayOfWeek = getDayOfWeek(date);
  const therapists = await loadTherapists(normalizedDept);

  const workingTherapists = therapists.filter((t) =>
    t.weeklySchedule.some((s) => s.day === dayOfWeek)
  );
  if (workingTherapists.length === 0) return null;

  // Exclude therapists dynamically marked unavailable in availabilities collection
  const unavailNames = await getUnavailableTherapists(date);
  const activeWorkingTherapists = workingTherapists.filter(
    (t) => !isTherapistUnavailable(t.name, unavailNames)
  );
  if (activeWorkingTherapists.length === 0) return null;

  const therapistIds = activeWorkingTherapists.map((t) => String(t._id));
  const leaves = await TherapistUnavailability.find({
    therapistId: { $in: therapistIds },
    date,
  }).lean();

  const activeBookings = await getActiveAppointmentsForDate(date);

  for (const therapist of activeWorkingTherapists) {
    const tid = String(therapist._id);

    // Verify the slot falls within this therapist's shift hours
    if (!isTimeInTherapistShift(time, therapist, dayOfWeek)) continue;

    // Skip: full-day leave
    if (leaves.some((l) => l.therapistId === tid && l.type === "full")) continue;

    // Skip: partial leave covering this time
    if (
      leaves.some(
        (l) =>
          l.therapistId === tid &&
          l.type === "partial" &&
          l.startTime &&
          l.endTime &&
          timeInRange(time, l.startTime, l.endTime)
      )
    )
      continue;

    // Skip: already booked in appointments collection for this exact date & time
    if (isTherapistBookedForSlot(therapist, time, activeBookings)) continue;

    // Found a free available therapist!
    return { id: tid, name: therapist.name };
  }

  // Strictly return null if all therapists in department are booked for this slot
  return null;
}

/**
 * Returns a list of all 6 public bookable departments.
 */
export async function getDepartments(): Promise<string[]> {
  return [
    "OT",
    "Special Educator",
    "Speech Therapy",
    "Physical Therapy",
    "Academic Support",
    "Counselling"
  ];
}
