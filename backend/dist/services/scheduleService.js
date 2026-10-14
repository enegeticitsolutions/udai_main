import mongoose from "mongoose";
import { ChildScheduleModel } from "../models/ChildSchedule.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/**
 * Normalizes phone numbers for matching (removes non-digits, handles 91 prefix).
 */
export function normalizePhone(raw) {
    if (!raw)
        return "";
    const digits = String(raw).replace(/\D/g, "");
    // If 12 digits starting with 91, extract 10 digits
    if (digits.length === 12 && digits.startsWith("91")) {
        return digits.slice(2);
    }
    return digits;
}
/**
 * Creates MongoDB phone query matching both local 10-digit and country-coded formats.
 */
export function getPhoneQueryVariants(rawPhone) {
    const clean = normalizePhone(rawPhone);
    if (!clean)
        return { $in: [] };
    return {
        $in: [
            clean,
            `+91${clean}`,
            `91${clean}`,
            `+91 ${clean}`,
            new RegExp(clean + "$", "i"),
        ],
    };
}
/**
 * Adds 45 minutes to a given "HH:mm" time string.
 */
export function calculateEndTime(startTime) {
    if (!startTime || !startTime.includes(":"))
        return "10:45";
    const [hStr, mStr] = startTime.split(":");
    let totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + 45;
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/**
 * Returns Day of Week (Monday, Tuesday, etc.) for YYYY-MM-DD.
 */
export function getDayOfWeekFromDate(dateStr) {
    const [yr, mo, dy] = dateStr.split("-").map(Number);
    const dateObj = new Date(yr, mo - 1, dy);
    return DAYS_OF_WEEK[dateObj.getDay()] || "";
}
/**
 * Formats slots into readable text.
 */
export function formatSlotsSummary(slots) {
    if (!slots || slots.length === 0)
        return "No slots assigned";
    return slots
        .map((s) => `${s.day_of_week} at ${s.start_time}${s.end_time ? `-${s.end_time}` : ""}`)
        .join(", ");
}
export async function listSchedules(query) {
    const filter = {};
    if (query.status) {
        filter.status = query.status.toUpperCase();
    }
    if (query.therapist_id) {
        filter.therapist_id = new RegExp(query.therapist_id.trim(), "i");
    }
    if (query.therapy_type) {
        filter.therapy_type = new RegExp(query.therapy_type.trim(), "i");
    }
    if (query.day_of_week) {
        filter["recurring_slots.day_of_week"] = query.day_of_week;
    }
    if (query.search) {
        const s = query.search.trim();
        const phoneClean = normalizePhone(s);
        filter.$or = [
            { child_name: new RegExp(s, "i") },
            { parent_phone: new RegExp(phoneClean || s, "i") },
            { therapist_id: new RegExp(s, "i") },
            { therapy_type: new RegExp(s, "i") },
        ];
    }
    if (mongoose.connection.readyState === 1) {
        return await ChildScheduleModel.find(filter).sort({ child_name: 1 }).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (!db)
            return [];
        return await db.collection("childSchedules").find(filter).sort({ child_name: 1 }).toArray();
    }
}
export async function getScheduleById(id) {
    if (mongoose.connection.readyState === 1) {
        return await ChildScheduleModel.findById(id).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (!db)
            return null;
        return await db.collection("childSchedules").findOne({ _id: new mongoose.Types.ObjectId(id) });
    }
}
export async function createSchedule(data) {
    const slots = (data.recurring_slots || []).map((slot) => ({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time || calculateEndTime(slot.start_time),
    }));
    const payload = {
        child_name: String(data.child_name || "").trim(),
        parent_phone: String(data.parent_phone || "").trim(),
        therapist_id: String(data.therapist_id || "").trim(),
        therapy_type: String(data.therapy_type || "").trim(),
        recurring_slots: slots,
        status: data.status || "ACTIVE",
        notes: data.notes || "",
        updatedAt: new Date(),
        createdAt: new Date(),
    };
    if (mongoose.connection.readyState === 1) {
        const existing = await ChildScheduleModel.findOne({
            child_name: new RegExp(`^${payload.child_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
        if (existing) {
            Object.assign(existing, payload);
            return await existing.save();
        }
        const doc = new ChildScheduleModel(payload);
        return await doc.save();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (!db)
            throw new Error("Database not connected");
        const existing = await db.collection("childSchedules").findOne({
            child_name: new RegExp(`^${payload.child_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
        if (existing) {
            await db.collection("childSchedules").updateOne({ _id: existing._id }, { $set: payload });
            return { _id: existing._id, ...payload };
        }
        const result = await db.collection("childSchedules").insertOne(payload);
        return { _id: result.insertedId, ...payload };
    }
}
export async function updateSchedule(id, updates) {
    const allowed = [
        "child_name",
        "parent_phone",
        "therapist_id",
        "therapy_type",
        "recurring_slots",
        "status",
        "notes",
    ];
    const cleanUpdates = { updatedAt: new Date() };
    for (const key of Object.keys(updates)) {
        if (allowed.includes(key)) {
            if (key === "recurring_slots" && Array.isArray(updates[key])) {
                cleanUpdates[key] = updates[key].map((s) => ({
                    day_of_week: s.day_of_week,
                    start_time: s.start_time,
                    end_time: s.end_time || calculateEndTime(s.start_time),
                }));
            }
            else if (key === "status") {
                cleanUpdates[key] = String(updates[key]).toUpperCase();
            }
            else {
                cleanUpdates[key] = updates[key];
            }
        }
    }
    if (mongoose.connection.readyState === 1) {
        return await ChildScheduleModel.findByIdAndUpdate(id, { $set: cleanUpdates }, { new: true, runValidators: true }).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (!db)
            throw new Error("Database not connected");
        await db.collection("childSchedules").updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: cleanUpdates });
        return await db.collection("childSchedules").findOne({ _id: new mongoose.Types.ObjectId(id) });
    }
}
export async function deleteSchedule(id) {
    if (mongoose.connection.readyState === 1) {
        return await ChildScheduleModel.findByIdAndDelete(id).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (!db)
            throw new Error("Database not connected");
        return await db.collection("childSchedules").deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    }
}
export async function bulkUpsertSchedules(rows) {
    const results = [];
    for (const row of rows) {
        if (!row.child_name || !row.parent_phone)
            continue;
        const slots = (row.recurring_slots || []).map((s) => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time || calculateEndTime(s.start_time),
        }));
        const cleanRow = {
            child_name: String(row.child_name).trim(),
            parent_phone: String(row.parent_phone).trim(),
            therapist_id: String(row.therapist_id || "").trim(),
            therapy_type: String(row.therapy_type || "").trim(),
            recurring_slots: slots.length > 0 ? slots : [{ day_of_week: "Monday", start_time: "10:00", end_time: "10:45" }],
            status: (row.status || "ACTIVE").toUpperCase(),
            updatedAt: new Date(),
        };
        if (mongoose.connection.readyState === 1) {
            const saved = await ChildScheduleModel.findOneAndUpdate({
                child_name: cleanRow.child_name,
                parent_phone: cleanRow.parent_phone,
            }, { $set: cleanRow, $setOnInsert: { createdAt: new Date() } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
            results.push(saved);
        }
        else {
            await connectMongoDb();
            const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
            if (db) {
                await db.collection("childSchedules").updateOne({ child_name: cleanRow.child_name, parent_phone: cleanRow.parent_phone }, { $set: cleanRow, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
                results.push(cleanRow);
            }
        }
    }
    return results;
}
/**
 * Returns reserved recurring slots for a therapist on a given date.
 */
export async function getReservedSlotsForDate(dateStr, therapistId) {
    const dayOfWeek = getDayOfWeekFromDate(dateStr);
    if (!dayOfWeek || dayOfWeek === "Sunday") {
        return [];
    }
    const filter = {
        status: "ACTIVE",
        "recurring_slots.day_of_week": dayOfWeek,
    };
    if (therapistId) {
        const tClean = therapistId.replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
        filter.therapist_id = new RegExp(tClean, "i");
    }
    let schedules = [];
    if (mongoose.connection.readyState === 1) {
        schedules = await ChildScheduleModel.find(filter).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (db) {
            schedules = await db.collection("childSchedules").find(filter).toArray();
        }
    }
    const reservedSlots = [];
    for (const item of schedules) {
        for (const slot of item.recurring_slots || []) {
            if (slot.day_of_week === dayOfWeek) {
                reservedSlots.push({
                    child_name: item.child_name,
                    parent_phone: item.parent_phone,
                    therapist_id: item.therapist_id,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time || calculateEndTime(slot.start_time),
                });
            }
        }
    }
    return reservedSlots;
}
/**
 * WhatsApp parent verification: matches phone against active ChildSchedule.
 */
export async function verifyParent(phone) {
    const clean = normalizePhone(phone);
    if (!clean) {
        return { isReturningParent: false, message: "Invalid phone number" };
    }
    const query = {
        status: "ACTIVE",
        $or: [
            { parent_phone: clean },
            { parent_phone: `+91${clean}` },
            { parent_phone: `91${clean}` },
            { parent_phone: new RegExp(clean + "$", "i") },
        ],
    };
    let schedule = null;
    if (mongoose.connection.readyState === 1) {
        schedule = await ChildScheduleModel.findOne(query).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (db) {
            schedule = await db.collection("childSchedules").findOne(query);
        }
    }
    if (!schedule) {
        return {
            isReturningParent: false,
            is_frequent: false,
            isFrequent: false,
            message: "No active recurring schedule found. Routing to first-time consultation intake flow.",
            route: "NEW_INTAKE_FLOW",
        };
    }
    const slotsSummary = formatSlotsSummary(schedule.recurring_slots);
    const botMessage = `Hello, here is ${schedule.child_name}'s therapy schedule for this week: ${slotsSummary}. Reply 1 to Confirm All, or Reply 2 to Request Schedule Change.`;
    return {
        isReturningParent: true,
        is_frequent: true,
        isFrequent: true,
        child_name: schedule.child_name,
        childName: schedule.child_name,
        parent_phone: schedule.parent_phone,
        therapist_id: schedule.therapist_id,
        therapy_type: schedule.therapy_type,
        therapy_name: schedule.therapy_type,
        routine_summary: slotsSummary,
        slots_summary: slotsSummary,
        recurring_slots: schedule.recurring_slots,
        bot_message: botMessage,
        options: [
            { reply: "1", action: "CONFIRM_ALL", text: "Confirm All Weekly Slots" },
            { reply: "2", action: "REQUEST_CHANGE", text: "Request Schedule Change" },
        ],
    };
}
