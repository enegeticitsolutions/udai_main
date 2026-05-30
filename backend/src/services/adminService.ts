import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import type { Therapist } from "../types.js";
import { getCareers, getTherapists, getProducts } from "./contentService.js";

type AdminRecord = {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{
    productId: number;
    title: string;
    quantity: number;
    price: number;
  }>;
  amount?: number;
  subtotal?: number;
  shippingAmount?: number;
  totalAmount?: number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  orderStatus?: string;
  appointmentDate?: string;
  active?: boolean;
  isActive?: boolean;
  [key: string]: unknown;
};

type AdminTherapist = Therapist & {
  active: boolean;
};

const storageByEntity: Record<string, { fileName: string; collectionName: string }> = {
  inquiries: { fileName: "therapist-inquiries.json", collectionName: "therapistInquiries" },
  volunteers: { fileName: "volunteers.json", collectionName: "volunteers" },
  donations: { fileName: "donations.json", collectionName: "donations" },
  contacts: { fileName: "contacts.json", collectionName: "contacts" },
  orders: { fileName: "orders.json", collectionName: "orders" },
  therapists: { fileName: "therapists.json", collectionName: "therapists" },
  deactivatedDates: { fileName: "deactivated-dates.json", collectionName: "deactivatedDates" },
  notifications: { fileName: "notifications.json", collectionName: "notifications" },
};

function storagePath(fileName: string) {
  return path.join(config.storageDir, fileName);
}

function normalizeMongoDocument(document: Record<string, unknown>): AdminRecord {
  const { _id, ...rest } = document as Record<string, unknown> & { _id?: { toString(): string } };
  return {
    id: _id ? _id.toString() : String((rest as Record<string, unknown>).id ?? ""),
    ...rest,
  } as AdminRecord;
}

async function readStorageRecords(entity: keyof typeof storageByEntity): Promise<AdminRecord[]> {
  const { fileName } = storageByEntity[entity];

  try {
    const records = await readJsonFile<AdminRecord[]>(storagePath(fileName));
    return records;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readRecords(entity: keyof typeof storageByEntity): Promise<AdminRecord[]> {
  const { collectionName } = storageByEntity[entity];

  await connectMongoDb();

  if (isMongoConnected()) {
    const docs = await getMongoDb().collection(collectionName).find({}).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => normalizeMongoDocument(doc as Record<string, unknown>));
  }

  return readStorageRecords(entity);
}

async function readTherapistStorageRecords(): Promise<AdminTherapist[]> {
  try {
    const records = await readJsonFile<AdminTherapist[]>(storagePath(storageByEntity.therapists.fileName));
    return records;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function normalizeTherapist(record: Therapist & Partial<AdminTherapist>): AdminTherapist {
  return {
    ...record,
    active: record.active ?? true,
  };
}

async function readTherapists(): Promise<AdminTherapist[]> {
  const baseTherapists = (await getTherapists()).map((therapist) => normalizeTherapist(therapist));
  const overrides = await readTherapistStorageRecords();
  const overrideMap = new Map(overrides.map((therapist) => [therapist.id, therapist]));

  return baseTherapists.map((therapist) => normalizeTherapist({ ...therapist, ...(overrideMap.get(therapist.id) ?? {}) }));
}

async function updateTherapistStorageRecord(id: string, updates: Record<string, unknown>) {
  const therapistRecords = await readTherapistStorageRecords();
  const baseTherapists = await getTherapists();
  const baseTherapist = baseTherapists.find((therapist) => therapist.id === Number(id) || String(therapist.id) === id);

  if (!baseTherapist) {
    return null;
  }

  const merged = normalizeTherapist({
    ...baseTherapist,
    ...therapistRecords.find((therapist) => String(therapist.id) === id),
    ...updates,
    id: Number.isNaN(Number(id)) ? id : Number(id),
  } as Therapist & Partial<AdminTherapist>);

  const nextRecords = therapistRecords.some((therapist) => String(therapist.id) === id)
    ? therapistRecords.map((therapist) => (String(therapist.id) === id ? merged : therapist))
    : [...therapistRecords, merged];

  await fs.mkdir(config.storageDir, { recursive: true });
  await writeJsonFile(storagePath(storageByEntity.therapists.fileName), nextRecords);

  return merged;
}

async function updateTherapistMongoRecord(id: string, updates: Record<string, unknown>) {
  const therapists = await readTherapists();
  const existing = therapists.find((therapist) => String(therapist.id) === id);

  if (!existing) {
    return null;
  }

  const merged = normalizeTherapist({
    ...existing,
    ...updates,
    id: existing.id,
  } as Therapist & Partial<AdminTherapist>);

  await connectMongoDb();

  if (!isMongoConnected()) {
    return null;
  }

  const collection = getMongoDb().collection(storageByEntity.therapists.collectionName);
  await collection.updateOne(
    { id: existing.id },
    {
      $set: {
        ...merged,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );

  return merged;
}

async function updateStorageRecord(entity: keyof typeof storageByEntity, id: string, updates: Record<string, unknown>) {
  const { fileName } = storageByEntity[entity];
  const fileRecords = await readStorageRecords(entity);
  const nextRecords = fileRecords.map((record) => (record.id === id ? { ...record, ...updates } : record));

  await fs.mkdir(config.storageDir, { recursive: true });
  await writeJsonFile(storagePath(fileName), nextRecords);

  return nextRecords.find((record) => record.id === id) ?? null;
}

async function updateMongoRecord(entity: keyof typeof storageByEntity, id: string, updates: Record<string, unknown>) {
  const { collectionName } = storageByEntity[entity];
  await connectMongoDb();

  if (!isMongoConnected()) {
    return null;
  }

  const collection = getMongoDb().collection(collectionName);
  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
  const existing = await collection.findOne(filter);

  if (!existing) {
    return null;
  }

  await collection.updateOne(filter, {
    $set: {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  });

  return {
    id,
    ...existing,
    ...updates,
  };
}

export async function getAdminBootstrap() {
  const [inquiries, donations, volunteers, orders, therapists, deactivatedDates, notifications, products, careers] = await Promise.all([
    readRecords("inquiries"),
    readRecords("donations"),
    readRecords("volunteers"),
    readRecords("orders"),
    readTherapists(),
    readRecords("deactivatedDates"),
    readRecords("notifications"),
    getProducts(),
    getCareers(),
  ]);

  const totalDonations = donations.reduce((sum, item) => {
    const amount = Number(item.amount ?? 0);
    return sum + amount;
  }, 0);

  const totalOrders = orders.length;
  const paidOrders = orders.filter((item) => item.paymentStatus === "paid").length;
  const pendingOrders = orders.filter((item) => item.paymentStatus !== "paid").length;
  const orderRevenue = orders.reduce((sum, item) => {
    const amount = Number(item.totalAmount ?? item.subtotal ?? 0);
    return sum + amount;
  }, 0);

  const pendingRequests = inquiries.filter((item) => item.status === "new").length;
  const activeTherapists = therapists.filter((item) => item.active !== false).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = inquiries.filter((item) => String(item.appointmentDate ?? "").startsWith(today)).length;

  return {
    inquiries,
    donations,
    orders,
    volunteers,
    therapists,
    deactivatedDates,
    notifications,
    products,
    careers,
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
    },
  };
}

export async function toggleDeactivatedDate(therapistId: string, date: string) {
  const records = await readRecords("deactivatedDates");
  const existingIndex = records.findIndex(r => String(r.therapistId) === String(therapistId) && r.date === date);

  if (existingIndex > -1) {
    // Remove if exists (reactivate)
    const id = records[existingIndex].id;
    await connectMongoDb();
    if (isMongoConnected()) {
      await getMongoDb().collection("deactivatedDates").deleteOne({ _id: new ObjectId(id) });
    } else {
      const nextRecords = records.filter((_, i) => i !== existingIndex);
      await writeJsonFile(storagePath("deactivated-dates.json"), nextRecords);
    }
    return { status: "reactivated" };
  } else {
    // Add (deactivate)
    const newRecord = {
      therapistId,
      date,
      createdAt: new Date().toISOString()
    };

    if (isMongoConnected()) {
      const res = await getMongoDb().collection("deactivatedDates").insertOne(newRecord);
      // Cancel existing inquiries for this therapist on this date
      await getMongoDb().collection("therapistInquiries").updateMany(
        { assignedTherapist: therapistId, appointmentDate: date, status: { $ne: "cancelled" } },
        { $set: { status: "cancelled", cancellationReason: "Doctor unavailable on this date" } }
      );
    } else {
      const inquiries = await readRecords("inquiries");
      const updatedInquiries = inquiries.map(inq => {
        if (String(inq.assignedTherapist) === therapistId && inq.appointmentDate === date && inq.status !== "cancelled") {
          return { ...inq, status: "cancelled", cancellationReason: "Doctor unavailable on this date" };
        }
        return inq;
      });
      await writeJsonFile(storagePath("therapist-inquiries.json"), updatedInquiries);

      const nextRecords = [...records, { id: Date.now().toString(), ...newRecord }];
      await writeJsonFile(storagePath("deactivated-dates.json"), nextRecords);
    }
    return { status: "deactivated" };
  }
}

export async function appendNotification(payload: Record<string, unknown>) {
  const newRecord = {
    ...payload,
    createdAt: new Date().toISOString(),
  };

  await connectMongoDb();
  if (isMongoConnected()) {
    const res = await getMongoDb().collection("notifications").insertOne(newRecord);
    return { id: res.insertedId.toString(), ...newRecord };
  } else {
    const records = await readRecords("notifications");
    const recordWithId = { id: Date.now().toString(), ...newRecord };
    const nextRecords = [recordWithId, ...records];
    await writeJsonFile(storagePath("notifications.json"), nextRecords);
    return recordWithId;
  }
}

export async function updateAdminRecord(
  entity: keyof typeof storageByEntity,
  id: string,
  updates: Record<string, unknown>,
) {
  if (entity === "therapists") {
    const mongoUpdated = await updateTherapistMongoRecord(id, updates);
    if (mongoUpdated) {
      return mongoUpdated;
    }

    return updateTherapistStorageRecord(id, updates);
  }

  const mongoUpdated = await updateMongoRecord(entity, id, updates);
  if (mongoUpdated) {
    return mongoUpdated;
  }

  return updateStorageRecord(entity, id, updates);
}
