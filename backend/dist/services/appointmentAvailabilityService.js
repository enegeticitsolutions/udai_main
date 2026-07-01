import path from "node:path";
import { config } from "../config.js";
import { readJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { getTherapists } from "./contentService.js";
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
function formatTimeLabel(time) {
    const [hourPart, minutePart] = time.split(":");
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}
function normalizeInquiry(record) {
    const { _id, ...rest } = record;
    return {
        id: _id ? _id.toString() : String(rest.id ?? ""),
        ...rest,
    };
}
async function readDeactivatedDates() {
    await connectMongoDb();
    if (isMongoConnected()) {
        return await getMongoDb().collection("deactivatedDates").find({}).toArray();
    }
    try {
        return await readJsonFile(deactivatedDatesPath());
    }
    catch {
        return [];
    }
}
async function readInquiryRecords() {
    await connectMongoDb();
    if (isMongoConnected()) {
        const docs = await getMongoDb().collection("therapistInquiries").find({}).sort({ createdAt: -1 }).toArray();
        return docs.map((doc) => normalizeInquiry(doc));
    }
    try {
        return await readJsonFile(inquiriesPath());
    }
    catch (error) {
        const err = error;
        if (err.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}
function isActiveTherapist(therapist) {
    return therapist.active !== false && therapist.isActive !== false;
}
export async function getDepartmentAvailability(department, date) {
    const [therapists, inquiries, deactivatedDates] = await Promise.all([
        getTherapists(),
        readInquiryRecords(),
        readDeactivatedDates()
    ]);
    const deactivatedTherapistIds = new Set(deactivatedDates
        .filter(d => d.date === date)
        .map(d => String(d.therapistId)));
    const departmentTherapists = therapists.filter((therapist) => therapist.department === department &&
        isActiveTherapist(therapist) &&
        !deactivatedTherapistIds.has(String(therapist.id)));
    const bookedByTime = inquiries.filter((item) => item.department === department &&
        item.appointmentDate === date &&
        item.status !== "cancelled" &&
        item.status !== "rejected");
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
        };
    });
}
export async function reserveDepartmentTherapist(department, date, time) {
    const [therapists, inquiries, deactivatedDates] = await Promise.all([
        getTherapists(),
        readInquiryRecords(),
        readDeactivatedDates()
    ]);
    const deactivatedTherapistIds = new Set(deactivatedDates
        .filter(d => d.date === date)
        .map(d => String(d.therapistId)));
    const departmentTherapists = therapists.filter((therapist) => therapist.department === department &&
        isActiveTherapist(therapist) &&
        !deactivatedTherapistIds.has(String(therapist.id)));
    const activeBookings = inquiries.filter((item) => item.department === department &&
        item.appointmentDate === date &&
        item.appointmentTime === time &&
        item.status !== "cancelled" &&
        item.status !== "rejected");
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
