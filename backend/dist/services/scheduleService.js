import mongoose from "mongoose";
import { ChildScheduleModel } from "../models/ChildSchedule.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/**
 * Normalizes phone numbers for matching (removes non-digits, handles +91/91/0 prefix by taking last 10 digits).
 */
export function normalizePhone(raw) {
    if (!raw)
        return "";
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length >= 10) {
        return digits.slice(-10);
    }
    return digits;
}
/**
 * Creates MongoDB phone query matching both local 10-digit, country-coded, and numeric formats.
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
            `0${clean}`,
            Number(clean),
            Number(`91${clean}`),
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
        .map((s) => {
        const therapy = s.therapy_name || s.therapy_type || s.sessionName || "";
        const therapist = s.therapist_id || s.therapistId || "";
        const details = [therapy, therapist].filter(Boolean).join(" with ");
        return `${s.day_of_week || s.dayOfWeek} at ${s.start_time || s.startTime}${s.end_time || s.endTime ? `-${s.end_time || s.endTime}` : ""}${details ? ` (${details})` : ""}`;
    })
        .join(", ");
}
function normalizeDoc(doc) {
    if (!doc)
        return null;
    const { _id, ...rest } = doc;
    const rawSlots = Array.isArray(rest.sessions) && rest.sessions.length > 0
        ? rest.sessions
        : (Array.isArray(rest.recurring_slots) ? rest.recurring_slots : []);
    const normalizedSlots = rawSlots.map((s) => {
        const day = s.day_of_week || s.dayOfWeek || "Monday";
        const startTime = s.start_time || s.startTime || "10:00";
        const endTime = s.end_time || s.endTime || calculateEndTime(startTime);
        const service = s.therapy_name || s.therapy_type || s.session_name || s.sessionName || s.serviceId || rest.therapy_type || "Occupational Therapy";
        const therapist = s.therapist_id || s.therapistId || s.therapist_name || rest.therapist_id || "Ms. Nikki";
        return {
            day_of_week: day,
            dayOfWeek: day,
            start_time: startTime,
            startTime: startTime,
            end_time: endTime,
            endTime: endTime,
            therapy_name: service,
            therapy_type: service,
            session_name: service,
            sessionName: service,
            serviceId: service,
            therapist_id: therapist,
            therapistId: therapist,
            therapist_name: therapist,
        };
    });
    return {
        _id,
        id: _id ? String(_id) : "",
        ...rest,
        recurring_slots: normalizedSlots,
        sessions: normalizedSlots,
    };
}
export async function listSchedules(query) {
    const filter = {};
    if (query.status) {
        filter.status = query.status.toUpperCase();
    }
    if (query.therapist_id) {
        const reg = new RegExp(query.therapist_id.trim(), "i");
        filter.$or = [
            { therapist_id: reg },
            { "recurring_slots.therapist_id": reg },
            { "recurring_slots.therapistId": reg },
            { "sessions.therapist_id": reg },
            { "sessions.therapistId": reg },
        ];
    }
    if (query.therapy_type) {
        const reg = new RegExp(query.therapy_type.trim(), "i");
        filter.$or = [
            { therapy_type: reg },
            { "recurring_slots.therapy_name": reg },
            { "recurring_slots.therapy_type": reg },
            { "sessions.therapy_name": reg },
            { "sessions.sessionName": reg },
        ];
    }
    if (query.day_of_week) {
        filter.$or = [
            { "recurring_slots.day_of_week": query.day_of_week },
            { "recurring_slots.dayOfWeek": query.day_of_week },
            { "sessions.day_of_week": query.day_of_week },
            { "sessions.dayOfWeek": query.day_of_week },
        ];
    }
    if (query.search) {
        const s = query.search.trim();
        const phoneClean = normalizePhone(s);
        filter.$or = [
            { child_name: new RegExp(s, "i") },
            { parent_phone: new RegExp(phoneClean || s, "i") },
            { therapist_id: new RegExp(s, "i") },
            { therapy_type: new RegExp(s, "i") },
            { "recurring_slots.therapist_id": new RegExp(s, "i") },
            { "recurring_slots.therapy_name": new RegExp(s, "i") },
            { "sessions.therapist_id": new RegExp(s, "i") },
            { "sessions.therapy_name": new RegExp(s, "i") },
        ];
    }
    let list = [];
    if (mongoose.connection.readyState === 1) {
        list = await ChildScheduleModel.find(filter).sort({ child_name: 1 }).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (db) {
            list = await db.collection("childSchedules").find(filter).sort({ child_name: 1 }).toArray();
        }
    }
    return list.map(normalizeDoc);
}
export async function getScheduleById(id) {
    let doc = null;
    if (mongoose.connection.readyState === 1) {
        doc = await ChildScheduleModel.findById(id).lean();
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (db) {
            doc = await db.collection("childSchedules").findOne({ _id: new mongoose.Types.ObjectId(id) });
        }
    }
    return doc ? normalizeDoc(doc) : null;
}
function cleanTherapistName(t) {
    return String(t || "")
        .replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "")
        .trim()
        .toLowerCase();
}
/**
 * Checks if the given therapist is already booked on any of the specified recurring slots
 * by another active child schedule. Supports per-session therapist definitions.
 */
export async function findTherapistScheduleCollision(options) {
    const status = (options.status || "ACTIVE").toUpperCase();
    if (status !== "ACTIVE")
        return null;
    const rawSlots = options.recurring_slots || options.sessions || [];
    if (!Array.isArray(rawSlots) || rawSlots.length === 0) {
        return null;
    }
    // Internal duplicate check: ensure no two slots in recurring_slots have same day and start_time
    const seenSlots = new Set();
    for (const s of rawSlots) {
        const day = s.day_of_week || s.dayOfWeek;
        const time = s.start_time || s.startTime;
        const key = `${day}_${time}`;
        if (seenSlots.has(key)) {
            return {
                clashingSlot: s,
                conflictWith: `${options.child_name || "Same child"} (duplicate slot specified: ${day} at ${time})`,
            };
        }
        seenSlots.add(key);
    }
    const activeSchedules = await listSchedules({ status: "ACTIVE" });
    for (const slot of rawSlots) {
        const slotDay = slot.day_of_week || slot.dayOfWeek;
        const slotTime = slot.start_time || slot.startTime;
        const slotTherapist = cleanTherapistName(slot.therapist_id || slot.therapistId || slot.therapist_name || options.therapist_id || "");
        if (!slotTherapist)
            continue;
        for (const existing of activeSchedules) {
            const existingId = String(existing._id || existing.id || "");
            if (options.id && existingId === String(options.id))
                continue;
            if (options.child_name &&
                String(existing.child_name || "").toLowerCase().trim() === String(options.child_name || "").toLowerCase().trim()) {
                continue;
            }
            for (const exSlot of existing.recurring_slots || existing.sessions || []) {
                const exDay = exSlot.day_of_week || exSlot.dayOfWeek;
                const exTime = exSlot.start_time || exSlot.startTime;
                if (slotDay === exDay && slotTime === exTime) {
                    const exTherapist = cleanTherapistName(exSlot.therapist_id || exSlot.therapistId || exSlot.therapist_name || existing.therapist_id || "");
                    if (exTherapist &&
                        (slotTherapist === exTherapist ||
                            slotTherapist.includes(exTherapist) ||
                            exTherapist.includes(slotTherapist))) {
                        return {
                            clashingSlot: slot,
                            conflictWith: `${existing.child_name} (with therapist ${slot.therapist_id || exSlot.therapist_id || existing.therapist_id})`,
                        };
                    }
                }
            }
        }
    }
    return null;
}
export async function createSchedule(data) {
    const rawSlots = data.recurring_slots || data.sessions || [];
    const slots = rawSlots.map((slot) => {
        const day = (slot.day_of_week || slot.dayOfWeek || "Monday");
        const startTime = slot.start_time || slot.startTime || "10:00";
        const endTime = slot.end_time || slot.endTime || calculateEndTime(startTime);
        const service = slot.therapy_name ||
            slot.therapy_type ||
            slot.session_name ||
            slot.sessionName ||
            slot.serviceId ||
            data.therapy_type ||
            "Occupational Therapy";
        const therapist = slot.therapist_id ||
            slot.therapistId ||
            slot.therapist_name ||
            data.therapist_id ||
            "Ms. Nikki";
        return {
            day_of_week: day,
            dayOfWeek: day,
            start_time: startTime,
            startTime: startTime,
            end_time: endTime,
            endTime: endTime,
            therapy_name: service,
            therapy_type: service,
            session_name: service,
            sessionName: service,
            serviceId: service,
            therapist_id: therapist,
            therapistId: therapist,
            therapist_name: therapist,
        };
    });
    const uniqueTherapies = Array.from(new Set(slots.map((s) => s.therapy_name).filter(Boolean)));
    const uniqueTherapists = Array.from(new Set(slots.map((s) => s.therapist_id).filter(Boolean)));
    const derivedTherapyType = uniqueTherapies.length > 0 ? uniqueTherapies.join(", ") : (data.therapy_type || "Therapy");
    const derivedTherapistId = uniqueTherapists.length > 0 ? uniqueTherapists.join(", ") : (data.therapist_id || "");
    const defaultSlot = {
        day_of_week: "Monday",
        dayOfWeek: "Monday",
        start_time: "10:00",
        startTime: "10:00",
        end_time: "10:45",
        endTime: "10:45",
        therapy_name: "Occupational Therapy",
        therapy_type: "Occupational Therapy",
        session_name: "Occupational Therapy",
        sessionName: "Occupational Therapy",
        serviceId: "Occupational Therapy",
        therapist_id: "Ms. Nikki",
        therapistId: "Ms. Nikki",
        therapist_name: "Ms. Nikki",
    };
    const finalSlots = slots.length > 0 ? slots : [defaultSlot];
    const payload = {
        child_name: String(data.child_name || "").trim(),
        parent_phone: String(data.parent_phone || "").trim(),
        therapist_id: derivedTherapistId,
        therapy_type: derivedTherapyType,
        recurring_slots: finalSlots,
        sessions: finalSlots,
        status: data.status || "ACTIVE",
        notes: data.notes || "",
        updatedAt: new Date(),
        createdAt: new Date(),
    };
    // Anti-collision check
    const collision = await findTherapistScheduleCollision({
        child_name: payload.child_name,
        therapist_id: payload.therapist_id,
        recurring_slots: payload.recurring_slots,
        sessions: payload.sessions,
        status: payload.status,
    });
    if (collision) {
        throw new Error(`Collision detected: Slot on ${collision.clashingSlot.day_of_week || collision.clashingSlot.dayOfWeek} at ${collision.clashingSlot.start_time || collision.clashingSlot.startTime} clashes with "${collision.conflictWith}".`);
    }
    if (mongoose.connection.readyState === 1) {
        const existing = await ChildScheduleModel.findOne({
            child_name: new RegExp(`^${payload.child_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
        if (existing) {
            Object.assign(existing, payload);
            return normalizeDoc(await existing.save());
        }
        const doc = new ChildScheduleModel(payload);
        return normalizeDoc(await doc.save());
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
            return normalizeDoc({ _id: existing._id, ...payload });
        }
        const result = await db.collection("childSchedules").insertOne(payload);
        return normalizeDoc({ _id: result.insertedId, ...payload });
    }
}
export async function updateSchedule(id, updates) {
    const allowed = [
        "child_name",
        "parent_phone",
        "therapist_id",
        "therapy_type",
        "recurring_slots",
        "sessions",
        "status",
        "notes",
    ];
    const cleanUpdates = { updatedAt: new Date() };
    for (const key of Object.keys(updates)) {
        if (allowed.includes(key)) {
            if ((key === "recurring_slots" || key === "sessions") && Array.isArray(updates[key])) {
                const mapped = updates[key].map((s) => {
                    const day = s.day_of_week || s.dayOfWeek || "Monday";
                    const startTime = s.start_time || s.startTime || "10:00";
                    const endTime = s.end_time || s.endTime || calculateEndTime(startTime);
                    const service = s.therapy_name ||
                        s.therapy_type ||
                        s.session_name ||
                        s.sessionName ||
                        s.serviceId ||
                        updates.therapy_type ||
                        "Occupational Therapy";
                    const therapist = s.therapist_id ||
                        s.therapistId ||
                        s.therapist_name ||
                        updates.therapist_id ||
                        "Ms. Nikki";
                    return {
                        day_of_week: day,
                        dayOfWeek: day,
                        start_time: startTime,
                        startTime: startTime,
                        end_time: endTime,
                        endTime: endTime,
                        therapy_name: service,
                        therapy_type: service,
                        session_name: service,
                        sessionName: service,
                        serviceId: service,
                        therapist_id: therapist,
                        therapistId: therapist,
                        therapist_name: therapist,
                    };
                });
                cleanUpdates.recurring_slots = mapped;
                cleanUpdates.sessions = mapped;
            }
            else if (key === "status") {
                cleanUpdates[key] = String(updates[key]).toUpperCase();
            }
            else {
                cleanUpdates[key] = updates[key];
            }
        }
    }
    const current = await getScheduleById(id);
    if (!current)
        return null;
    if (cleanUpdates.recurring_slots) {
        const uniqueTherapies = Array.from(new Set(cleanUpdates.recurring_slots.map((s) => s.therapy_name).filter(Boolean)));
        const uniqueTherapists = Array.from(new Set(cleanUpdates.recurring_slots.map((s) => s.therapist_id).filter(Boolean)));
        if (cleanUpdates.therapy_type === undefined && uniqueTherapies.length > 0) {
            cleanUpdates.therapy_type = uniqueTherapies.join(", ");
        }
        if (cleanUpdates.therapist_id === undefined && uniqueTherapists.length > 0) {
            cleanUpdates.therapist_id = uniqueTherapists.join(", ");
        }
    }
    const targetSlots = cleanUpdates.recurring_slots !== undefined ? cleanUpdates.recurring_slots : current.recurring_slots;
    const targetStatus = cleanUpdates.status !== undefined ? cleanUpdates.status : current.status;
    const targetChildName = cleanUpdates.child_name !== undefined ? cleanUpdates.child_name : current.child_name;
    if (targetStatus === "ACTIVE") {
        const collision = await findTherapistScheduleCollision({
            id: String(id),
            child_name: targetChildName,
            recurring_slots: targetSlots,
            sessions: targetSlots,
            status: targetStatus,
        });
        if (collision) {
            throw new Error(`Collision detected: Slot on ${collision.clashingSlot.day_of_week || collision.clashingSlot.dayOfWeek} at ${collision.clashingSlot.start_time || collision.clashingSlot.startTime} clashes with "${collision.conflictWith}".`);
        }
    }
    if (mongoose.connection.readyState === 1) {
        const updated = await ChildScheduleModel.findByIdAndUpdate(id, { $set: cleanUpdates }, { new: true, runValidators: true }).lean();
        return normalizeDoc(updated);
    }
    else {
        await connectMongoDb();
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        if (!db)
            throw new Error("Database not connected");
        await db.collection("childSchedules").updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: cleanUpdates });
        const updated = await db.collection("childSchedules").findOne({ _id: new mongoose.Types.ObjectId(id) });
        return normalizeDoc(updated);
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
        if (cleanRow.status === "ACTIVE") {
            const collision = await findTherapistScheduleCollision({
                child_name: cleanRow.child_name,
                therapist_id: cleanRow.therapist_id,
                recurring_slots: cleanRow.recurring_slots,
                status: cleanRow.status,
            });
            if (collision) {
                throw new Error(`Collision detected for "${cleanRow.child_name}": Therapist "${cleanRow.therapist_id}" is already booked on ${collision.clashingSlot.day_of_week} at ${collision.clashingSlot.start_time} with "${collision.conflictWith}".`);
            }
        }
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
export async function getReservedSlotsForDate(dateStr, therapistId) {
    const dayOfWeek = getDayOfWeekFromDate(dateStr);
    if (!dayOfWeek || dayOfWeek === "Sunday") {
        return [];
    }
    const all = await listSchedules({ status: "ACTIVE", day_of_week: dayOfWeek });
    const reservedSlots = [];
    for (const item of all) {
        const slots = item.recurring_slots || item.sessions || [];
        for (const slot of slots) {
            const slotDay = slot.day_of_week || slot.dayOfWeek;
            if (slotDay === dayOfWeek) {
                const slotTherapist = slot.therapist_id || slot.therapistId || slot.therapist_name || item.therapist_id;
                if (therapistId) {
                    const tClean = cleanTherapistName(therapistId);
                    const sTClean = cleanTherapistName(slotTherapist);
                    if (tClean && sTClean && !sTClean.includes(tClean) && !tClean.includes(sTClean)) {
                        continue;
                    }
                }
                reservedSlots.push({
                    child_name: item.child_name,
                    parent_phone: item.parent_phone,
                    therapist_id: slotTherapist,
                    therapy_name: slot.therapy_name || slot.therapy_type || slot.sessionName || item.therapy_type,
                    day_of_week: slotDay,
                    start_time: slot.start_time || slot.startTime,
                    end_time: slot.end_time || slot.endTime || calculateEndTime(slot.start_time || slot.startTime),
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
            is_frequent_str: "false",
            is_frequent_bool: false,
            child_name: "",
            therapy_name: "",
            routine_summary: "",
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
        is_frequent_str: "true",
        is_frequent_bool: true,
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
