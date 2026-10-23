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
  if (digits.length >= 10) {
    return digits.slice(-10);
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

export function cleanSessionName(rawName = "") {
  let name = String(rawName || "").trim();
  name = name.replace(/\b(dr\.|dr|mr\.|mr|ms\.|ms|mrs\.|mrs)\s+[a-z]+/gi, "").trim();
  name = name.replace(/\b(nikki|tanu|sakshi|durgesh|atal|shobha|divya|shivam|pooja|khushboo|anjali|deepak)\b/gi, "").trim();
  name = name.replace(/\b(with|by|under)\b/gi, "").replace(/[()]/g, "").trim();
  name = name.replace(/^[-:,/|\s]+|[-:,/|\s]+$/g, "").trim();
  if (!name) name = "Therapy";
  if (!/\bsession\b/i.test(name)) name = `${name} Session`;
  return name.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function formatTime12Hour(timeStr) {
  if (!timeStr) return "";
  const clean = String(timeStr).trim();
  if (/am|pm/i.test(clean)) return clean.toUpperCase();
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (isNaN(h)) return clean;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatRoutineSummary(slots = [], defaultTherapy = "Therapy") {
  if (!Array.isArray(slots) || slots.length === 0) return "";
  const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...slots].sort((a, b) => {
    const dayA = a.day_of_week || a.day || a.dayOfWeek || "";
    const dayB = b.day_of_week || b.day || b.dayOfWeek || "";
    const idxA = DAY_ORDER.indexOf(dayA);
    const idxB = DAY_ORDER.indexOf(dayB);
    if (idxA !== idxB) {
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    const tA = String(a.start_time || a.startTime || a.time || "");
    const tB = String(b.start_time || b.startTime || b.time || "");
    return tA.localeCompare(tB);
  });

  return sorted.map((s) => {
    const day = s.day_of_week || s.day || s.dayOfWeek || "Monday";
    const startRaw = s.start_time || s.startTime || s.time || "10:00";
    const endRaw = s.end_time || s.endTime || calculateEndTime(startRaw);
    const therapy = s.therapy_name || s.therapy_type || s.session_name || s.sessionName || s.serviceId || defaultTherapy;
    const sessionName = cleanSessionName(therapy);
    const startTime12 = formatTime12Hour(startRaw);
    const endTime12 = formatTime12Hour(endRaw);
    return `• ${day}: ${startTime12} - ${endTime12} - ${sessionName}`;
  }).join("\n");
}

export function formatSlotsSummary(slots) {
  return formatRoutineSummary(slots);
}

function normalizeDoc(doc) {
  if (!doc) return null;
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
    id: _id ? _id.toString() : String(rest.id ?? ""),
    _id: _id ? _id.toString() : String(rest.id ?? ""),
    ...rest,
    recurring_slots: normalizedSlots,
    sessions: normalizedSlots,
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
        const reg = new RegExp(therapist_id.trim(), "i");
        filter.$or = [
          { therapist_id: reg },
          { "recurring_slots.therapist_id": reg },
          { "recurring_slots.therapistId": reg },
          { "sessions.therapist_id": reg },
          { "sessions.therapistId": reg },
        ];
      }
      if (therapy_type) {
        const reg = new RegExp(therapy_type.trim(), "i");
        filter.$or = [
          { therapy_type: reg },
          { "recurring_slots.therapy_name": reg },
          { "recurring_slots.therapy_type": reg },
          { "sessions.therapy_name": reg },
          { "sessions.sessionName": reg },
        ];
      }
      if (day_of_week) {
        filter.$or = [
          { "recurring_slots.day_of_week": day_of_week },
          { "recurring_slots.dayOfWeek": day_of_week },
          { "sessions.day_of_week": day_of_week },
          { "sessions.dayOfWeek": day_of_week },
        ];
      }
      if (search) {
        const s = search.trim();
        const pClean = normalizePhone(s);
        filter.$or = [
          { child_name: new RegExp(s, "i") },
          { parent_phone: new RegExp(pClean || s, "i") },
          { therapist_id: new RegExp(s, "i") },
          { therapy_type: new RegExp(s, "i") },
          { "recurring_slots.therapist_id": new RegExp(s, "i") },
          { "recurring_slots.therapy_name": new RegExp(s, "i") },
          { "sessions.therapist_id": new RegExp(s, "i") },
          { "sessions.therapy_name": new RegExp(s, "i") },
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
    list = list.filter((r) => {
      const topT = String(r.therapist_id || "").toLowerCase();
      const slotsT = (r.recurring_slots || r.sessions || []).some((s) =>
        String(s.therapist_id || s.therapistId || "").toLowerCase().includes(therapist_id.toLowerCase())
      );
      return topT.includes(therapist_id.toLowerCase()) || slotsT;
    });
  }
  if (therapy_type) {
    list = list.filter((r) => {
      const topTy = String(r.therapy_type || "").toLowerCase();
      const slotsTy = (r.recurring_slots || r.sessions || []).some((s) =>
        String(s.therapy_name || s.therapy_type || s.sessionName || "").toLowerCase().includes(therapy_type.toLowerCase())
      );
      return topTy.includes(therapy_type.toLowerCase()) || slotsTy;
    });
  }
  if (day_of_week) {
    list = list.filter((r) =>
      (r.recurring_slots || r.sessions || []).some(
        (s) => (s.day_of_week || s.dayOfWeek) === day_of_week
      )
    );
  }
  if (search) {
    const s = search.toLowerCase();
    const pClean = normalizePhone(s);
    list = list.filter((r) => {
      const basic =
        String(r.child_name || "").toLowerCase().includes(s) ||
        String(r.parent_phone || "").includes(pClean || s) ||
        String(r.therapist_id || "").toLowerCase().includes(s) ||
        String(r.therapy_type || "").toLowerCase().includes(s);
      const inSlots = (r.recurring_slots || r.sessions || []).some((slot) =>
        String(slot.therapy_name || slot.therapy_type || slot.sessionName || "").toLowerCase().includes(s) ||
        String(slot.therapist_id || slot.therapistId || "").toLowerCase().includes(s)
      );
      return basic || inSlots;
    });
  }
  list.sort((a, b) => String(a.child_name || "").localeCompare(String(b.child_name || ""), undefined, { sensitivity: "base" }));
  return list.map(normalizeDoc);
}

export async function getScheduleById(id) {
  try {
    await connectMongoDb();
    if (isMongoConnected()) {
      const db = getMongoDb();
      const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
      const doc = await db.collection("childSchedules").findOne(filter);
      if (doc) return normalizeDoc(doc);
    }
  } catch (err) {
    console.warn("[scheduleService] Mongo getById error:", err.message);
  }

  const list = await readFallbackFile();
  const found = list.find((item) => String(item.id || item._id) === String(id));
  return found ? normalizeDoc(found) : null;
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
  if (status !== "ACTIVE") return null;
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
    const slotTherapist = cleanTherapistName(
      slot.therapist_id || slot.therapistId || slot.therapist_name || options.therapist_id
    );
    if (!slotTherapist) continue;

    for (const existing of activeSchedules) {
      const existingId = String(existing._id || existing.id || "");
      if (options.id && existingId === String(options.id)) continue;
      if (
        options.child_name &&
        String(existing.child_name || "").toLowerCase().trim() === String(options.child_name || "").toLowerCase().trim()
      ) {
        continue;
      }

      for (const exSlot of existing.recurring_slots || existing.sessions || []) {
        const exDay = exSlot.day_of_week || exSlot.dayOfWeek;
        const exTime = exSlot.start_time || exSlot.startTime;
        if (slotDay === exDay && slotTime === exTime) {
          const exTherapist = cleanTherapistName(
            exSlot.therapist_id || exSlot.therapistId || exSlot.therapist_name || existing.therapist_id
          );
          if (
            exTherapist &&
            (slotTherapist === exTherapist ||
              slotTherapist.includes(exTherapist) ||
              exTherapist.includes(slotTherapist))
          ) {
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
    const day = slot.day_of_week || slot.dayOfWeek || "Monday";
    const startTime = slot.start_time || slot.startTime || "10:00";
    const endTime = slot.end_time || slot.endTime || calculateEndTime(startTime);
    const service =
      slot.therapy_name ||
      slot.therapy_type ||
      slot.session_name ||
      slot.sessionName ||
      slot.serviceId ||
      data.therapy_type ||
      "Occupational Therapy";
    const therapist =
      slot.therapist_id ||
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

  if (slots.length > 25) {
    throw new Error("Maximum 25 recurring slots permitted per child.");
  }

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
    child_name: String(data.child_name || data.childName || "").trim(),
    parent_phone: String(data.parent_phone || data.parentPhone || data.phone || "").trim(),
    therapist_id: derivedTherapistId,
    therapy_type: derivedTherapyType,
    recurring_slots: finalSlots,
    sessions: finalSlots,
    status: (data.status || "ACTIVE").toUpperCase(),
    notes: data.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    throw new Error(
      `Collision detected: Slot on ${collision.clashingSlot.day_of_week || collision.clashingSlot.dayOfWeek} at ${collision.clashingSlot.start_time || collision.clashingSlot.startTime} clashes with "${collision.conflictWith}".`
    );
  }

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
    if (err.message?.includes("Collision detected")) throw err;
    console.warn("[scheduleService] Mongo insert error, saving to file:", err.message);
  }

  const list = await readFallbackFile();
  const existingIdx = list.findIndex(
    (item) => item.child_name && item.child_name.toLowerCase() === payload.child_name.toLowerCase()
  );
  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...payload, updatedAt: new Date().toISOString() };
    await writeFallbackFile(list);
    return normalizeDoc(list[existingIdx]);
  }
  const id = `SCH-${Date.now()}`;
  const record = { id, _id: id, ...payload };
  list.unshift(record);
  await writeFallbackFile(list);
  return normalizeDoc(record);
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
  const cleanUpdates = { updatedAt: new Date().toISOString() };

  for (const key of Object.keys(updates)) {
    if (allowed.includes(key)) {
      if ((key === "recurring_slots" || key === "sessions") && Array.isArray(updates[key])) {
        const mapped = updates[key].map((s) => {
          const day = s.day_of_week || s.dayOfWeek || "Monday";
          const startTime = s.start_time || s.startTime || "10:00";
          const endTime = s.end_time || s.endTime || calculateEndTime(startTime);
          const service =
            s.therapy_name ||
            s.therapy_type ||
            s.session_name ||
            s.sessionName ||
            s.serviceId ||
            updates.therapy_type ||
            "Occupational Therapy";
          const therapist =
            s.therapist_id ||
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
      } else if (key === "status") {
        cleanUpdates[key] = String(updates[key]).toUpperCase();
      } else {
        cleanUpdates[key] = updates[key];
      }
    }
  }

  if (cleanUpdates.recurring_slots && cleanUpdates.recurring_slots.length > 25) {
    throw new Error("Maximum 25 recurring slots permitted per child.");
  }

  const current = await getScheduleById(id);
  if (!current) return null;

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
      throw new Error(
        `Collision detected: Slot on ${collision.clashingSlot.day_of_week || collision.clashingSlot.dayOfWeek} at ${collision.clashingSlot.start_time || collision.clashingSlot.startTime} clashes with "${collision.conflictWith}".`
      );
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
    if (err.message?.includes("Collision detected")) throw err;
    console.warn("[scheduleService] Mongo update error, updating file:", err.message);
  }

  const list = await readFallbackFile();
  const index = list.findIndex((item) => String(item.id || item._id) === String(id));
  if (index !== -1) {
    list[index] = { ...list[index], ...cleanUpdates };
    await writeFallbackFile(list);
    return normalizeDoc(list[index]);
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
        reserved.push({
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

  return reserved;
}

export async function verifyParent(phone) {
  const clean = normalizePhone(phone);
  if (!clean) {
    return {
      success: false,
      isReturningParent: false,
      is_returning: false,
      isReturning: false,
      isNew: true,
      is_new: true,
      is_new_patient: "true",
      isNewPatient: true,
      existingPatient: false,
      existing_patient: false,
      is_frequent: false,
      isFrequent: false,
      message: "Invalid phone number",
    };
  }

  const all = await listSchedules({ status: "ACTIVE" });
  let schedule = all.find((item) => {
    const itemPhone = normalizePhone(item.parent_phone);
    return itemPhone === clean || itemPhone.endsWith(clean) || clean.endsWith(itemPhone);
  });

  if (!schedule) {
    const allAnyStatus = await listSchedules();
    schedule = allAnyStatus.find((item) => {
      const itemPhone = normalizePhone(item.parent_phone);
      return itemPhone === clean || itemPhone.endsWith(clean) || clean.endsWith(itemPhone);
    });
  }

  if (!schedule) {
    return {
      success: false,
      isReturningParent: false,
      is_returning: false,
      isReturning: false,
      existingPatient: false,
      existing_patient: false,
      isNew: true,
      is_new: true,
      is_new_patient: "true",
      isNewPatient: true,
      is_frequent: false,
      isFrequent: false,
      is_frequent_str: "false",
      is_frequent_bool: false,
      child_name: "",
      childName: "",
      patientName: "",
      parent_name: "",
      parentName: "",
      therapy_name: "",
      routine_summary: "",
      slots_summary: "",
      total_prescribed: 0,
      totalPrescribed: 0,
      message: "No active recurring schedule found. Routing to first-time consultation intake flow.",
      route: "NEW_INTAKE_FLOW",
      data: {
        success: false,
        isReturningParent: false,
        is_returning: false,
        is_frequent: false,
        child_name: "",
        childName: "",
        patientName: "",
        routine_summary: "",
        slots_summary: "",
        total_prescribed: 0,
        totalPrescribed: 0,
      },
    };
  }

  const rawSlots = schedule.recurring_slots || schedule.sessions || schedule.slots || [];
  const routineSummary = formatRoutineSummary(rawSlots, schedule.therapy_type);
  const childName = String(schedule.child_name || schedule.childName || schedule.patientName || schedule.name || "").trim();
  const parentName = String(schedule.parent_name || schedule.parentName || schedule.parent || "").trim();
  const totalPrescribed = rawSlots.length;
  const botMessage = `Hello, here is ${childName}'s therapy schedule for this week:\n${routineSummary}\nReply 1 to Confirm All, or Reply 2 to Request Schedule Change.`;

  return {
    success: true,
    isReturningParent: true,
    is_returning: true,
    isReturning: true,
    existingPatient: true,
    existing_patient: true,
    isNew: false,
    is_new: false,
    is_new_patient: "false",
    isNewPatient: false,
    is_new_patient_bool: false,
    is_frequent: true,
    isFrequent: true,
    is_frequent_str: "true",
    is_frequent_bool: true,
    child_name: childName,
    childName: childName,
    patientName: childName,
    parent_name: parentName,
    parentName: parentName,
    parent_phone: schedule.parent_phone,
    phone: clean,
    therapist_id: schedule.therapist_id,
    therapy_type: schedule.therapy_type,
    therapy_name: schedule.therapy_type,
    routine_summary: routineSummary,
    slots_summary: routineSummary,
    total_prescribed: totalPrescribed,
    totalPrescribed: totalPrescribed,
    recurring_slots: rawSlots,
    slots: rawSlots,
    sessions: rawSlots,
    bot_message: botMessage,
    options: [
      { reply: "1", action: "CONFIRM_ALL", text: "Confirm All Weekly Slots" },
      { reply: "2", action: "REQUEST_CHANGE", text: "Request Schedule Change" },
    ],
    data: {
      success: true,
      isReturningParent: true,
      is_returning: true,
      existingPatient: true,
      existing_patient: true,
      isNew: false,
      is_new: false,
      is_new_patient: "false",
      isNewPatient: false,
      is_frequent: true,
      isFrequent: true,
      child_name: childName,
      childName: childName,
      patientName: childName,
      parent_name: parentName,
      parentName: parentName,
      parent_phone: schedule.parent_phone,
      phone: clean,
      therapy_name: schedule.therapy_type,
      routine_summary: routineSummary,
      slots_summary: routineSummary,
      total_prescribed: totalPrescribed,
      totalPrescribed: totalPrescribed,
    },
  };
}
