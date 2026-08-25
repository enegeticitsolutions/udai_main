import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { connectMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { TherapistModel } from "../models/Therapist.js";
import { TherapistSlotModel } from "../models/TherapistSlot.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
export const DEFAULT_10_SLOTS = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
    "06:00 PM",
    "07:00 PM",
];
function getStoredSlotsPath() {
    return path.join(config.storageDir, "therapist_slots.json");
}
function getNext5Dates() {
    const dates = [];
    const now = new Date();
    for (let i = 1; i <= 5; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
    }
    return dates;
}
export async function seedTherapistSlots() {
    await connectMongoDb();
    const next5Dates = getNext5Dates();
    let therapists = [];
    if (isMongoConnected()) {
        try {
            const dbTherapists = await Promise.race([
                TherapistModel.find({ active: true }).lean(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000)),
            ]);
            if (dbTherapists && dbTherapists.length > 0) {
                therapists = dbTherapists.map((t) => ({ id: String(t._id), name: t.name }));
            }
        }
        catch {
            // Fallback to mock therapists if DB query times out
        }
    }
    if (therapists.length === 0) {
        therapists = [
            { id: "therapist_1", name: "Dr. Ananya Sharma (Speech Therapy)" },
            { id: "therapist_2", name: "Dr. Rajesh Verma (Physical Therapy)" },
            { id: "therapist_3", name: "Dr. Priya Patel (Occupational Therapy)" },
        ];
    }
    const newSlots = [];
    for (const therapist of therapists) {
        for (const date of next5Dates) {
            for (let index = 0; index < DEFAULT_10_SLOTS.length; index++) {
                const time = DEFAULT_10_SLOTS[index];
                const slotId = `${therapist.id}_${date}_${index + 1}`;
                newSlots.push({
                    slotId,
                    therapistId: therapist.id,
                    therapistName: therapist.name,
                    date,
                    time,
                    status: "available",
                });
            }
        }
    }
    let seededCount = newSlots.length;
    if (isMongoConnected()) {
        try {
            await Promise.race([
                Promise.all(newSlots.map((slot) => TherapistSlotModel.updateOne({ therapistId: slot.therapistId, date: slot.date, time: slot.time }, { $setOnInsert: slot }, { upsert: true }))),
                new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 3000)),
            ]);
        }
        catch {
            console.log("[SlotService] DB write timed out; saved to storage/therapist_slots.json fallback.");
        }
    }
    // Also write to local storage JSON file for file-store fallback
    try {
        await fs.mkdir(config.storageDir, { recursive: true });
        await fs.writeFile(getStoredSlotsPath(), JSON.stringify(newSlots, null, 2), "utf-8");
    }
    catch (err) {
        console.warn("[SlotService] Fallback JSON file write failed:", err.message);
    }
    console.log(`[SlotService] Seeded ${seededCount} slots across next 5 days (${next5Dates[0]} to ${next5Dates[4]})`);
    return { seededCount, dates: next5Dates };
}
export async function getAvailableSlotsForDate(appointmentDateInput, therapistIdInput) {
    const next5Dates = getNext5Dates();
    const targetDate = String(appointmentDateInput ?? "").trim() || next5Dates[0];
    const therapistId = String(therapistIdInput ?? "").trim();
    await connectMongoDb();
    let slotsFromDb = [];
    if (isMongoConnected()) {
        const query = { date: targetDate, status: "available" };
        if (therapistId) {
            query.therapistId = therapistId;
        }
        slotsFromDb = await TherapistSlotModel.find(query).lean();
    }
    if (slotsFromDb.length === 0) {
        // Attempt reading from local JSON file
        try {
            const content = await fs.readFile(getStoredSlotsPath(), "utf-8");
            const jsonSlots = JSON.parse(content);
            slotsFromDb = jsonSlots.filter((s) => s.date === targetDate && (therapistId ? s.therapistId === therapistId : true));
        }
        catch {
            // Fallback: generate default 10 slots dynamically
            slotsFromDb = DEFAULT_10_SLOTS.map((time, idx) => ({
                slotId: `slot_${idx + 1}`,
                therapistId: therapistId || "therapist_1",
                therapistName: "UDAI Therapist",
                date: targetDate,
                time,
                status: "available",
            }));
        }
    }
    // Exclude booked times by querying WebhookMessage & Appointments
    const bookedTimes = new Set();
    if (isMongoConnected()) {
        const bookedWebhooks = await WebhookMessage.find({
            appointmentDate: targetDate,
            status: { $nin: ["cancelled", "rejected"] },
        })
            .select("appointmentTime")
            .lean();
        for (const b of bookedWebhooks) {
            if (b.appointmentTime)
                bookedTimes.add(b.appointmentTime);
        }
    }
    const availableSlots = slotsFromDb
        .filter((s) => !bookedTimes.has(s.time))
        .slice(0, 10);
    const formattedSlots = availableSlots.map((s, idx) => ({
        id: `slot_${idx + 1}`,
        title: s.time,
        value: s.time,
    }));
    return {
        success: true,
        date: targetDate,
        therapist_id: therapistId || (availableSlots[0]?.therapistId ?? "therapist_1"),
        total_slots: formattedSlots.length,
        slots: formattedSlots,
    };
}
