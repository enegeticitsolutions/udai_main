import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";

const statuses = new Set(["pending", "confirmed", "completed", "cancelled"]);
const allowedSortFields = new Set(["createdAt", "appointmentDate", "appointmentTime", "patientName", "bookingStatus"]);
const listeners = new Set();
let changeStreamStarted = false;

function storagePath() {
  return path.resolve(config.projectRoot, "..", "backend", "storage", "appointments.json");
}

function normalizeMongoDocument(document) {
  const { _id, ...rest } = document;
  return { id: _id ? _id.toString() : String(rest.id ?? ""), ...rest };
}

function normalizedBookingStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (statuses.has(status)) return status;
  if (status === "new" || status === "initiated") return "pending";
  return "pending";
}

function legacyAppointment(document) {
  const sourceId = String(document._id ?? document.id ?? "");
  const appointmentDate = String(document.appointmentDate ?? document.appointment_date ?? document.createdAt ?? "").slice(0, 10);
  return {
    bookingId: `MSG91-LEGACY-${sourceId}`,
    legacySourceId: sourceId,
    patientName: String(document.childName ?? document.child_name ?? document.name ?? "WhatsApp Patient"),
    phoneNumber: String(document.phoneNumber ?? document.phone ?? document.phone_number ?? document.parentPhone ?? ""),
    age: Number(document.age ?? document.child_age ?? 0),
    gender: String(document.gender ?? "Not provided"),
    city: String(document.city ?? "Not provided"),
    preferredLanguage: String(document.preferredLanguage ?? document.preferred_language ?? "Not provided"),
    therapistId: document.therapistId ?? document.assignedTherapistId ?? null,
    therapistName: String(document.therapistName ?? document.assignedTherapist ?? document.department ?? document.doctor ?? "Unassigned"),
    appointmentDate,
    appointmentTime: String(document.appointmentTime ?? document.appointment_time ?? "12:00"),
    appointmentType: String(document.appointmentType ?? document.appointment_type ?? "in-person"),
    mainConcern: String(document.mainConcern ?? document.majorConcerns ?? document.concern ?? document.concern_of_child ?? "WhatsApp therapist booking"),
    concernDescription: String(document.concernDescription ?? document.concern_description ?? document.majorConcerns ?? document.concern_of_child ?? ""),
    additionalNotes: String(document.additionalNotes ?? document.additional_notes ?? document.assignmentNote ?? ""),
    paymentStatus: String(document.paymentStatus ?? "pending"),
    bookingStatus: normalizedBookingStatus(document.bookingStatus ?? document.status),
    rawPayload: document,
    source: "legacy-msg91-inquiry",
    createdAt: document.createdAt ?? new Date().toISOString(),
    updatedAt: document.updatedAt ?? document.createdAt ?? new Date().toISOString(),
  };
}

async function syncLegacyWhatsappAppointments() {
  if (!isMongoConnected()) return;
  const db = getMongoDb();
  const inquiries = await db.collection("therapistInquiries").find({
    $or: [
      { source: { $regex: "whatsapp", $options: "i" } },
      { referredBy: { $regex: "whatsapp", $options: "i" } },
    ],
  }).toArray();
  if (inquiries.length === 0) return;

  const collection = db.collection("appointments");
  await Promise.all(inquiries.map((inquiry) => {
    const appointment = legacyAppointment(inquiry);
    return collection.updateOne(
      { bookingId: appointment.bookingId },
      { $setOnInsert: appointment },
      { upsert: true },
    );
  }));
}

function idFilter(id) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readStorageAppointments() {
  try {
    return await readJsonFile(storagePath());
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function writeStorageAppointments(appointments) {
  await fs.mkdir(path.dirname(storagePath()), { recursive: true });
  await writeJsonFile(storagePath(), appointments);
}

function storageFilter(appointments, query) {
  const search = String(query.search ?? "").trim().toLowerCase();
  const dateFrom = String(query.dateFrom ?? "").trim();
  const dateTo = String(query.dateTo ?? "").trim();
  return appointments.filter((item) => {
    if (search && !String(item.patientName ?? "").toLowerCase().includes(search) && !String(item.phoneNumber ?? "").includes(search)) return false;
    if (query.bookingStatus && item.bookingStatus !== query.bookingStatus) return false;
    if (query.therapistId && String(item.therapistId ?? "") !== String(query.therapistId)) return false;
    if (dateFrom && String(item.appointmentDate ?? "") < dateFrom) return false;
    if (dateTo && String(item.appointmentDate ?? "") > dateTo) return false;
    return true;
  });
}

function emitAppointmentEvent(event) {
  for (const listener of listeners) listener(event);
}

async function ensureChangeStream() {
  if (changeStreamStarted) return;
  changeStreamStarted = true;
  try {
    await connectMongoDb();
    if (!isMongoConnected()) return;
    const stream = getMongoDb().collection("appointments").watch([], { fullDocument: "updateLookup" });
    stream.on("change", (change) => {
      const record = change.fullDocument ? normalizeMongoDocument(change.fullDocument) : null;
      emitAppointmentEvent({ type: change.operationType, appointment: record, id: String(change.documentKey?._id ?? "") });
    });
    stream.on("error", (error) => {
      console.warn("[Admin appointments] MongoDB Change Stream unavailable. Admin frontend will continue polling.", error.message);
      changeStreamStarted = false;
    });
  } catch (error) {
    console.warn("[Admin appointments] MongoDB Change Stream unavailable. Admin frontend will continue polling.", error.message);
    changeStreamStarted = false;
  }
}

export async function listAppointments(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit ?? "10", 10) || 10));
  const sortBy = allowedSortFields.has(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  try {
    await connectMongoDb();
  } catch (error) {
    console.warn("[Admin appointments] MongoDB unavailable. Reading appointment fallback storage.", error.message);
  }

  if (isMongoConnected()) {
    await syncLegacyWhatsappAppointments();
    const filters = {};
    const search = String(query.search ?? "").trim();
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filters.$or = [{ patientName: regex }, { phoneNumber: regex }];
    }
    if (query.bookingStatus) filters.bookingStatus = query.bookingStatus;
    if (query.therapistId) filters.therapistId = String(query.therapistId);
    if (query.dateFrom || query.dateTo) {
      filters.appointmentDate = {};
      if (query.dateFrom) filters.appointmentDate.$gte = String(query.dateFrom);
      if (query.dateTo) filters.appointmentDate.$lte = String(query.dateTo);
    }

    const collection = getMongoDb().collection("appointments");
    const [docs, total] = await Promise.all([
      collection.find(filters).sort({ [sortBy]: sortOrder }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filters),
    ]);
    return { items: docs.map(normalizeMongoDocument), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  const filtered = storageFilter(await readStorageAppointments(), query);
  filtered.sort((a, b) => String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")) * sortOrder);
  return {
    items: filtered.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total: filtered.length, pages: Math.ceil(filtered.length / limit) },
  };
}

export async function getAppointment(id) {
  try {
    await connectMongoDb();
  } catch {
    // Use fallback storage.
  }
  if (isMongoConnected()) {
    await syncLegacyWhatsappAppointments();
    const record = await getMongoDb().collection("appointments").findOne(idFilter(id));
    return record ? normalizeMongoDocument(record) : null;
  }
  return (await readStorageAppointments()).find((item) => String(item.id) === String(id)) ?? null;
}

export async function updateAppointmentStatus(id, bookingStatus) {
  if (!statuses.has(bookingStatus)) throw new Error("Invalid booking status");
  try {
    await connectMongoDb();
  } catch {
    // Use fallback storage.
  }
  const updatedAt = new Date().toISOString();
  if (isMongoConnected()) {
    await syncLegacyWhatsappAppointments();
    const collection = getMongoDb().collection("appointments");
    await collection.updateOne(idFilter(id), { $set: { bookingStatus, updatedAt } });
    const record = await collection.findOne(idFilter(id));
    return record ? normalizeMongoDocument(record) : null;
  }
  const appointments = await readStorageAppointments();
  const index = appointments.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return null;
  appointments[index] = { ...appointments[index], bookingStatus, updatedAt };
  await writeStorageAppointments(appointments);
  emitAppointmentEvent({ type: "update", appointment: appointments[index], id });
  return appointments[index];
}

export async function getAppointmentMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    await connectMongoDb();
  } catch {
    // Use fallback storage.
  }
  if (isMongoConnected()) {
    await syncLegacyWhatsappAppointments();
    const collection = getMongoDb().collection("appointments");
    const [totalBookings, todayBookings, pendingBookings, confirmedBookings] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ appointmentDate: today }),
      collection.countDocuments({ bookingStatus: "pending" }),
      collection.countDocuments({ bookingStatus: "confirmed" }),
    ]);
    return { totalBookings, todayBookings, pendingBookings, confirmedBookings };
  }
  const appointments = await readStorageAppointments();
  return {
    totalBookings: appointments.length,
    todayBookings: appointments.filter((item) => item.appointmentDate === today).length,
    pendingBookings: appointments.filter((item) => item.bookingStatus === "pending").length,
    confirmedBookings: appointments.filter((item) => item.bookingStatus === "confirmed").length,
  };
}

export async function subscribeToAppointmentEvents(listener) {
  listeners.add(listener);
  await ensureChangeStream();
  return () => listeners.delete(listener);
}
