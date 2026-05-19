import path from "node:path";
import { config } from "../config.js";
import { readJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { getTherapists } from "./contentService.js";
import type { Therapist } from "../types.js";

export type AvailabilitySlot = {
  time: string;
  label: string;
  totalTherapists: number;
  bookedCount: number;
  availableCount: number;
  isAvailable: boolean;
};

export type TherapistInquiryRecord = {
  id: string;
  department: string;
  appointmentDate?: string;
  appointmentTime?: string;
  status?: string;
  assignedTherapist?: string;
  [key: string]: unknown;
};

const slotTimes = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function deactivatedDatesPath() {
  return path.join(config.storageDir, "deactivated-dates.json");
}

function inquiriesPath() {
  return path.join(config.storageDir, "therapist-inquiries.json");
}

function formatTimeLabel(time: string) {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function normalizeInquiry(record: Record<string, unknown>): TherapistInquiryRecord {
  const { _id, ...rest } = record as Record<string, unknown> & { _id?: { toString(): string } };
  return {
    id: _id ? _id.toString() : String((rest as Record<string, unknown>).id ?? ""),
    ...rest,
  } as TherapistInquiryRecord;
}

async function readDeactivatedDates(): Promise<Array<{ therapistId: string; date: string }>> {
  await connectMongoDb();
  if (isMongoConnected()) {
    return await getMongoDb().collection("deactivatedDates").find({}).toArray() as any;
  }
  try {
    return await readJsonFile<any[]>(deactivatedDatesPath());
  } catch {
    return [];
  }
}

async function readInquiryRecords(): Promise<TherapistInquiryRecord[]> {
  await connectMongoDb();

  if (isMongoConnected()) {
    const docs = await getMongoDb().collection("therapistInquiries").find({}).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => normalizeInquiry(doc as Record<string, unknown>));
  }

  try {
    return await readJsonFile<TherapistInquiryRecord[]>(inquiriesPath());
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function isActiveTherapist(therapist: Therapist & { active?: boolean; isActive?: boolean }) {
  return therapist.active !== false && therapist.isActive !== false;
}

export async function getDepartmentAvailability(department: string, date: string) {
  const [therapists, inquiries, deactivatedDates] = await Promise.all([
    getTherapists(),
    readInquiryRecords(),
    readDeactivatedDates()
  ]);

  const deactivatedTherapistIds = new Set(
    deactivatedDates
      .filter(d => d.date === date)
      .map(d => String(d.therapistId))
  );

  const departmentTherapists = therapists.filter(
    (therapist) =>
      therapist.department === department &&
      isActiveTherapist(therapist) &&
      !deactivatedTherapistIds.has(String(therapist.id)),
  );

  const bookedByTime = inquiries.filter(
    (item) =>
      item.department === department &&
      item.appointmentDate === date &&
      item.status !== "cancelled" &&
      item.status !== "rejected",
  );

  return slotTimes.map((time) => {
    const bookedCount = bookedByTime.filter((item) => item.appointmentTime === time).length;
    const availableCount = Math.max(departmentTherapists.length - bookedCount, 0);
    const isAvailable = availableCount > 0;

    return {
      time,
      label: formatTimeLabel(time),
      totalTherapists: departmentTherapists.length,
      bookedCount,
      availableCount,
      isAvailable,
    } satisfies AvailabilitySlot;
  });
}

export async function reserveDepartmentTherapist(department: string, date: string, time: string) {
  const [therapists, inquiries, deactivatedDates] = await Promise.all([
    getTherapists(),
    readInquiryRecords(),
    readDeactivatedDates()
  ]);

  const deactivatedTherapistIds = new Set(
    deactivatedDates
      .filter(d => d.date === date)
      .map(d => String(d.therapistId))
  );

  const departmentTherapists = therapists.filter(
    (therapist) =>
      therapist.department === department &&
      isActiveTherapist(therapist) &&
      !deactivatedTherapistIds.has(String(therapist.id)),
  );

  const activeBookings = inquiries.filter(
    (item) =>
      item.department === department &&
      item.appointmentDate === date &&
      item.appointmentTime === time &&
      item.status !== "cancelled" &&
      item.status !== "rejected",
  );

  if (activeBookings.length >= departmentTherapists.length) {
    return null;
  }

  const bookedNames = new Set(activeBookings.map((item) => item.assignedTherapist).filter(Boolean));
  const availableTherapist = departmentTherapists.find((therapist) => !bookedNames.has(therapist.name)) ?? null;

  if (!availableTherapist) {
    return null;
  }

  return availableTherapist;
}
