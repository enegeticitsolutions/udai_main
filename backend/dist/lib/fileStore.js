import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "./mongodb.js";
const mongoCollectionByFileName = {
    "contacts.json": "contacts",
    "volunteers.json": "volunteers",
    "donations.json": "donations",
    "event-rsvps.json": "eventRegistrations",
    "therapist-inquiries.json": "therapistInquiries",
    "orders.json": "orders",
};
export async function ensureStorageDir() {
    await fs.mkdir(config.storageDir, { recursive: true });
}
export async function readJsonFile(filePath) {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
}
export async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
export async function appendRecord(fileName, record) {
    await ensureStorageDir();
    await connectMongoDb();
    if (isMongoConnected()) {
        const db = getMongoDb();
        const collectionName = mongoCollectionByFileName[fileName];
        if (collectionName) {
            const now = new Date().toISOString();
            const document = {
                ...record,
                createdAt: now,
                updatedAt: now,
            };
            const result = await db.collection(collectionName).insertOne(document);
            return {
                id: result.insertedId.toString(),
                ...document,
            };
        }
    }
    const filePath = path.join(config.storageDir, fileName);
    let current = [];
    try {
        current = await readJsonFile(filePath);
    }
    catch (error) {
        const err = error;
        if (err.code !== "ENOENT") {
            throw error;
        }
    }
    const entry = {
        ...record,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
    };
    current.push(entry);
    await fs.writeFile(filePath, JSON.stringify(current, null, 2));
    return entry;
}
