import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import {
  donations as seedDonations,
  contacts as seedContacts,
  inquiries as seedInquiries,
  orders as seedOrders,
  subscribers as seedSubscribers,
  therapists as seedTherapists,
  volunteers as seedVolunteers,
} from "../data/seedData.js";

const storageByEntity = {
  inquiries: { fileName: "therapist-inquiries.json", collectionName: "therapistInquiries", seed: seedInquiries },
  volunteers: { fileName: "volunteers.json", collectionName: "volunteers", seed: seedVolunteers },
  donations: { fileName: "donations.json", collectionName: "donations", seed: seedDonations },
  contacts: { fileName: "contacts.json", collectionName: "contacts", seed: seedContacts },
  orders: { fileName: "orders.json", collectionName: "orders", seed: seedOrders },
  therapists: { fileName: "therapists.json", collectionName: "therapists", seed: seedTherapists },
  subscribers: { fileName: "subscribers.json", collectionName: "subscribers", seed: seedSubscribers },
};

function storagePath(fileName) {
  return path.join(config.storageDir, fileName);
}

function normalizeMongoDocument(document) {
  const { _id, ...rest } = document;
  return {
    id: _id ? _id.toString() : String(rest.id ?? ""),
    ...rest,
  };
}

async function readStorageRecords(entity) {
  const { fileName, seed } = storageByEntity[entity];

  try {
    return await readJsonFile(storagePath(fileName));
  } catch {
    return seed;
  }
}

async function readRecords(entity) {
  const { collectionName } = storageByEntity[entity];
  try {
    await connectMongoDb();
  } catch {
    // Fall back to file storage when MongoDB is unavailable so the admin panel
    // still boots and shows the saved roster data.
  }

  if (isMongoConnected()) {
    const docs = await getMongoDb().collection(collectionName).find({}).sort({ createdAt: -1 }).toArray();
    if (docs.length > 0) {
      return docs.map((doc) => normalizeMongoDocument(doc));
    }
  }

  return readStorageRecords(entity);
}

async function updateStorageRecord(entity, id, updates) {
  const { fileName } = storageByEntity[entity];
  const records = await readStorageRecords(entity);
  const nextRecords = records.map((record) => (String(record.id) === String(id) ? { ...record, ...updates } : record));
  const exists = nextRecords.some((record) => String(record.id) === String(id));

  if (!exists) {
    return null;
  }

  await fs.mkdir(config.storageDir, { recursive: true });
  await writeJsonFile(storagePath(fileName), nextRecords);

  return nextRecords.find((record) => String(record.id) === String(id)) ?? null;
}

async function updateMongoRecord(entity, id, updates) {
  const { collectionName } = storageByEntity[entity];
  try {
    await connectMongoDb();
  } catch {
    return null;
  }

  if (!isMongoConnected()) {
    return null;
  }

  const collection = getMongoDb().collection(collectionName);
  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
  const existing = await collection.findOne(filter);

  if (!existing) {
    return null;
  }

  const merged = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await collection.updateOne(filter, { $set: merged });

  return normalizeMongoDocument({ ...existing, ...merged });
}

async function deleteStorageRecord(entity, id) {
  const { fileName } = storageByEntity[entity];
  const records = await readStorageRecords(entity);
  const nextRecords = records.filter((record) => String(record.id) !== String(id));

  if (nextRecords.length === records.length) {
    return null;
  }

  await fs.mkdir(config.storageDir, { recursive: true });
  await writeJsonFile(storagePath(fileName), nextRecords);

  return { id };
}

async function deleteMongoRecord(entity, id) {
  const { collectionName } = storageByEntity[entity];
  try {
    await connectMongoDb();
  } catch {
    return null;
  }

  if (!isMongoConnected()) {
    return null;
  }

  const collection = getMongoDb().collection(collectionName);
  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
  const result = await collection.deleteOne(filter);

  if (result.deletedCount === 0) {
    return null;
  }

  return { id };
}

async function createStorageRecord(entity, record) {
  const { fileName } = storageByEntity[entity];
  const records = await readStorageRecords(entity);
  if (entity === "subscribers") {
    const email = String(record.email ?? "").trim().toLowerCase();
    const existing = records.find((item) => String(item.email ?? "").trim().toLowerCase() === email);
    if (existing) {
      return existing;
    }
  }
  const nextRecord = {
    id: `${entity.slice(0, 3).toUpperCase()}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...record,
  };
  const nextRecords = [nextRecord, ...records];

  await fs.mkdir(config.storageDir, { recursive: true });
  await writeJsonFile(storagePath(fileName), nextRecords);

  return nextRecord;
}

async function createMongoRecord(entity, record) {
  const { collectionName } = storageByEntity[entity];
  try {
    await connectMongoDb();
  } catch {
    return null;
  }

  if (!isMongoConnected()) {
    return null;
  }

  const collection = getMongoDb().collection(collectionName);
  if (entity === "subscribers") {
    const email = String(record.email ?? "").trim().toLowerCase();
    const existing = await collection.findOne({ email });
    if (existing) {
      return normalizeMongoDocument(existing);
    }
  }
  const nextRecord = {
    id: `${entity.slice(0, 3).toUpperCase()}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...record,
  };

  await collection.insertOne(nextRecord);
  return normalizeMongoDocument(nextRecord);
}

export async function getAdminBootstrap() {
  const [inquiries, donations, volunteers, contacts, orders, therapists, subscribers] = await Promise.all([
    readRecords("inquiries"),
    readRecords("donations"),
    readRecords("volunteers"),
    readRecords("contacts"),
    readRecords("orders"),
    readRecords("therapists"),
    readRecords("subscribers"),
  ]);

  const totalDonations = donations.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const totalOrders = orders.length;
  const paidOrders = orders.filter((item) => item.paymentStatus === "paid").length;
  const pendingOrders = orders.filter((item) => item.paymentStatus !== "paid").length;
  const orderRevenue = orders.reduce((sum, item) => sum + Number(item.totalAmount ?? item.subtotal ?? 0), 0);
  const pendingRequests = inquiries.filter((item) => item.status === "new").length;
  const activeTherapists = therapists.filter((item) => item.active !== false).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = inquiries.filter((item) => String(item.appointmentDate ?? "").startsWith(today)).length;
  const cancelledRequests = inquiries.filter((item) => item.status === "cancelled").length;
  const rescheduledRequests = inquiries.filter((item) => item.status === "rescheduled").length;

  return {
    inquiries,
    donations,
    orders,
    volunteers,
    contacts,
    therapists,
    subscribers,
    dashboard: {
      totalRequests: inquiries.length,
      pendingRequests,
      todayAppointments,
      activeTherapists,
      donationTotal: totalDonations,
      totalOrders,
      paidOrders,
      pendingOrderPayments: pendingOrders,
      orderRevenue,
      cancelledRequests,
      rescheduledRequests,
    },
  };
}

export async function updateAdminRecord(entity, id, updates) {
  const mongoUpdated = await updateMongoRecord(entity, id, updates);
  if (mongoUpdated) {
    return mongoUpdated;
  }

  return updateStorageRecord(entity, id, updates);
}

export async function createAdminRecord(entity, record) {
  const mongoCreated = await createMongoRecord(entity, record);
  if (mongoCreated) {
    return mongoCreated;
  }

  return createStorageRecord(entity, record);
}

export async function deleteAdminRecord(entity, id) {
  const mongoDeleted = await deleteMongoRecord(entity, id);
  if (mongoDeleted) {
    return mongoDeleted;
  }

  return deleteStorageRecord(entity, id);
}
