import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function storageFilePath() {
  return path.resolve(config.storageDir, "child-schedules.json");
}

async function readFallbackFile() {
  const filePath = storageFilePath();
  try {
    return await readJsonFile(filePath);
  } catch {
    return [];
  }
}

async function writeFallbackFile(data) {
  const filePath = storageFilePath();
  await writeJsonFile(filePath, data);
}

export function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return digits;
}

export function calculateEndTime(startTime) {
  if (!startTime || !startTime.includes(":")) return "10:45";
  const [hStr, mStr] = startTime.split(":");
  const totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + 45;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getDayOfWeekFromDate(dateStr) {
  const [yr, mo, dy] = dateStr.split("-").map(Number);
  const dateObj = new Date(yr, mo - 1, dy);
  return DAYS_OF_WEEK[dateObj.getDay()] || "";
}

export function formatSlotsSummary(slots) {
  if (!slots || slots.length === 0) return "No slots assigned";
  return slots
    .map((s) => `${s.day_of_week} at ${s.start_time}${s.end_time ? `-${s.end_time}` : ""}`)
    .join(", ");
}

function normalizeDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    id: _id ? _id.toString() : String(rest.id ?? ""),
    _id: _id ? _id.toString() : String(rest.id ?? ""),
    ...rest,
  };
}

export async function listSchedules(query = {}) {
  const { search, therapist_id, therapy_type, day_of_week, status } = query;

  try {
    await connectMongoDb();
    if (isMongoConnected()) {
      const db = getMongoDb();
      const filter = {};

      if (status) {
        filter.status = status.toUpperCase();
      }
      if (therapist_id) {
        filter.therapist_id = new RegExp(therapist_id.trim(), "i");
      }
      if (therapy_type) {
        filter.therapy_type = new RegExp(therapy_type.trim(), "i");
      }
      if (day_of_week) {
        filter["recurring_slots.day_of_week"] = day_of_week;
      }
      if (search) {
        const s = search.trim();
        const pClean = normalizePhone(s);
        filter.$or = [
          { child_name: new RegExp(s, "i") },
          { parent_phone: new RegExp(pClean || s, "i") },
          { therapist_id: new RegExp(s, "i") },
          { therapy_type: new RegExp(s, "i") },
        ];
      }

      const docs = await db.collection("childSchedules").find(filter).sort({ child_name: 1 }).toArray();
      return docs.map(normalizeDoc);
    }
  } catch (err) {
    console.warn("[scheduleService] Mongo error, falling back to file:", err.message);
  }

  let list = await readFallbackFile();
  if (status) {
    list = list.filter((r) => String(r.status || "").toUpperCase() === status.toUpperCase());
  }
  if (therapist_id) {
    list = list.filter((r) => String(r.therapist_id || "").toLowerCase().includes(therapist_id.toLowerCase()));
  }
  if (day_of_week) {
    list = list.filter((r) => (r.recurring_slots || []).some((s) => s.day_of_week === day_of_week));
  }
  if (search) {
    const s = search.toLowerCase();
    const pClean = normalizePhone(s);
    list = list.filter(
      (r) =>
        String(r.child_name || "").toLowerCase().includes(s) ||
        String(r.parent_phone || "").includes(pClean || s) ||
        String(r.therapist_id || "").toLowerCase().includes(s) ||
        String(r.therapy_type || "").toLowerCase().includes(s)
    );
  }
  list.sort((a, b) => String(a.child_name || "").localeCompare(String(b.child_name || ""), undefined, { sensitivity: "base" }));
  return list;
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
    recurring_slots: slots.length > 0 ? slots : [{ day_of_week: "Monday", start_time: "10:00", end_time: "10:45" }],
    status: (data.status || "ACTIVE").toUpperCase(),
    notes: data.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await connectMongoDb();
    if (isMongoConnected()) {
      const db = getMongoDb();
      const existing = await db.collection("childSchedules").findOne({
        child_name: new RegExp(`^${payload.child_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      if (existing) {
        await db.collection("childSchedules").updateOne(
          { _id: existing._id },
          { $set: { ...payload, updatedAt: new Date().toISOString() } }
        );
        return normalizeDoc({ ...existing, ...payload });
      }
      const result = await db.collection("childSchedules").insertOne(payload);
      return normalizeDoc({ _id: result.insertedId, ...payload });
    }
  } catch (err) {
    console.warn("[scheduleService] Mongo insert error, saving to file:", err.message);
  }

  const list = await readFallbackFile();
  const existingIdx = list.findIndex(
    (item) => item.child_name && item.child_name.toLowerCase() === payload.child_name.toLowerCase()
  );
  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...payload, updatedAt: new Date().toISOString() };
    await writeFallbackFile(list);
    return list[existingIdx];
  }
  const id = `SCH-${Date.now()}`;
  const record = { id, _id: id, ...payload };
  list.unshift(record);
  await writeFallbackFile(list);
  return record;
}

export async function updateSchedule(id, updates) {
  const allowed = ["child_name", "parent_phone", "therapist_id", "therapy_type", "recurring_slots", "status", "notes"];
  const cleanUpdates = { updatedAt: new Date().toISOString() };

  for (const key of Object.keys(updates)) {
    if (allowed.includes(key)) {
      if (key === "recurring_slots" && Array.isArray(updates[key])) {
        cleanUpdates[key] = updates[key].map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time || calculateEndTime(s.start_time),
        }));
      } else if (key === "status") {
        cleanUpdates[key] = String(updates[key]).toUpperCase();
      } else {
        cleanUpdates[key] = updates[key];
      }
    }
  }

  try {
    await connectMongoDb();
    if (isMongoConnected()) {
      const db = getMongoDb();
      const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
      await db.collection("childSchedules").updateOne(filter, { $set: cleanUpdates });
      const updated = await db.collection("childSchedules").findOne(filter);
      if (updated) return normalizeDoc(updated);
    }
  } catch (err) {
    console.warn("[scheduleService] Mongo update error, updating file:", err.message);
  }

  const list = await readFallbackFile();
  const index = list.findIndex((item) => String(item.id || item._id) === String(id));
  if (index !== -1) {
    list[index] = { ...list[index], ...cleanUpdates };
    await writeFallbackFile(list);
    return list[index];
  }
  return null;
}

export async function deleteSchedule(id) {
  try {
    await connectMongoDb();
    if (isMongoConnected()) {
      const db = getMongoDb();
      const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
      await db.collection("childSchedules").deleteOne(filter);
      return true;
    }
  } catch (err) {
    console.warn("[scheduleService] Mongo delete error:", err.message);
  }

  let list = await readFallbackFile();
  list = list.filter((item) => String(item.id || item._id) !== String(id));
  await writeFallbackFile(list);
  return true;
}

export async function bulkUpsertSchedules(rows) {
  const results = [];
  for (const row of rows) {
    if (!row.child_name || !row.parent_phone) continue;
    const res = await createSchedule(row);
    results.push(res);
  }
  return results;
}

export async function getReservedSlotsForDate(dateStr, therapistId) {
  const dayOfWeek = getDayOfWeekFromDate(dateStr);
  if (!dayOfWeek || dayOfWeek === "Sunday") return [];

  const all = await listSchedules({ status: "ACTIVE", day_of_week: dayOfWeek });
  const reserved = [];

  for (const item of all) {
    if (therapistId) {
      const tClean = therapistId.replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim().toLowerCase();
      const itemTClean = String(item.therapist_id || "").replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim().toLowerCase();
      if (!itemTClean.includes(tClean) && !tClean.includes(itemTClean)) {
        continue;
      }
    }

    for (const slot of item.recurring_slots || []) {
      if (slot.day_of_week === dayOfWeek) {
        reserved.push({
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

  return reserved;
}

export async function verifyParent(phone) {
  const clean = normalizePhone(phone);
  if (!clean) return { isReturningParent: false, message: "Invalid phone number" };

  const all = await listSchedules({ status: "ACTIVE" });
  const schedule = all.find((item) => {
    const itemPhone = normalizePhone(item.parent_phone);
    return itemPhone === clean || itemPhone.endsWith(clean) || clean.endsWith(itemPhone);
  });

  if (!schedule) {
    return {
      isReturningParent: false,
      message: "No active recurring schedule found. Routing to first-time consultation intake flow.",
      route: "NEW_INTAKE_FLOW",
    };
  }

  const slotsSummary = formatSlotsSummary(schedule.recurring_slots);
  const botMessage = `Hello, here is ${schedule.child_name}'s therapy schedule for this week: ${slotsSummary}. Reply 1 to Confirm All, or Reply 2 to Request Schedule Change.`;

  return {
    isReturningParent: true,
    child_name: schedule.child_name,
    parent_phone: schedule.parent_phone,
    therapist_id: schedule.therapist_id,
    therapy_type: schedule.therapy_type,
    recurring_slots: schedule.recurring_slots,
    slots_summary: slotsSummary,
    bot_message: botMessage,
    options: [
      { reply: "1", action: "CONFIRM_ALL", text: "Confirm All Weekly Slots" },
      { reply: "2", action: "REQUEST_CHANGE", text: "Request Schedule Change" },
    ],
  };
}
