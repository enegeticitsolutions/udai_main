/**
 * seedTherapists.ts
 *
 * Seeds/updates therapist records in MongoDB with normalized department names.
 * Deactivates all other therapists to prevent un-normalized fallback data.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TherapistModel } from "../models/Therapist.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// ── Deterministic ObjectId generator ─────────────────────────────────────────
function getStableObjectId(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hex = Math.abs(hash).toString(16).padEnd(24, "0").slice(0, 24);
    return hex;
}
// ── Therapist seed data with normalized department names ─────────────────────
const standardSchedule = [
    ...[1, 2, 3, 4, 5].map((day) => ({
        day,
        startTime: "10:00",
        endTime: "18:00",
        lunchStart: "13:00",
        lunchEnd: "13:30",
    })),
    { day: 6, startTime: "10:00", endTime: "15:00", lunchStart: "00:00", lunchEnd: "00:00" }, // Sat
];
const THERAPISTS = [
    // 1. OT
    {
        _id: getStableObjectId("Harsimran"),
        name: "Harsimran",
        department: "OT",
        role: "Occupational Therapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("Nikki"),
        name: "Nikki",
        department: "OT",
        role: "Occupational Therapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("Anamika"),
        name: "Anamika",
        department: "OT",
        role: "Occupational Therapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("Divya"),
        name: "Divya",
        department: "OT",
        role: "Occupational Therapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    // 2. Special Educator
    {
        _id: getStableObjectId("Veshali"),
        name: "Veshali",
        department: "Special Educator",
        role: "Special Educator",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("Poonam"),
        name: "Poonam",
        department: "Special Educator",
        role: "Special Educator",
        active: true,
        weeklySchedule: standardSchedule,
    },
    // 3. Speech Therapy
    {
        _id: getStableObjectId("Sakshi"),
        name: "Sakshi",
        department: "Speech Therapy",
        role: "Speech Therapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("Tanu"),
        name: "Tanu",
        department: "Speech Therapy",
        role: "Speech & Language Pathologist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    // 4. Physical Therapy
    {
        _id: getStableObjectId("RajeshVerma"),
        name: "Dr. Rajesh Verma",
        department: "Physical Therapy",
        role: "Pediatric Physiotherapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("NehaSharma"),
        name: "Dr. Neha Sharma",
        department: "Physical Therapy",
        role: "Physical Therapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    // 5. Academic Support
    {
        _id: getStableObjectId("MeenakshiSundaram"),
        name: "Meenakshi Sundaram",
        department: "Academic Support",
        role: "NIOS & Academic Instructor",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("RituSaxena"),
        name: "Ritu Saxena",
        department: "Academic Support",
        role: "Academic Support Specialist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    // 6. Counselling
    {
        _id: getStableObjectId("ShaliniGupta"),
        name: "Dr. Shalini Gupta",
        department: "Counselling",
        role: "Child & Family Psychologist",
        active: true,
        weeklySchedule: standardSchedule,
    },
    {
        _id: getStableObjectId("AmitKapoor"),
        name: "Dr. Amit Kapoor",
        department: "Counselling",
        role: "Counselor & Behavioral Therapist",
        active: true,
        weeklySchedule: standardSchedule,
    },
];
async function main() {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || "udai";
    if (!mongoUri) {
        console.error("❌ MONGODB_URI is not set in .env");
        process.exit(1);
    }
    console.log(`🌱 Connecting to MongoDB (db: ${dbName})…`);
    await mongoose.connect(mongoUri, { dbName });
    // 1. Upsert seeded therapists
    for (const therapist of THERAPISTS) {
        const filter = { _id: new mongoose.Types.ObjectId(therapist._id) };
        const result = await TherapistModel.updateOne(filter, {
            $set: {
                name: therapist.name,
                department: therapist.department,
                role: therapist.role,
                active: therapist.active,
                weeklySchedule: therapist.weeklySchedule,
            },
        }, { upsert: true });
        if (result.upsertedCount > 0) {
            console.log(`  ➕ Inserted: ${therapist.name}`);
        }
        else {
            console.log(`  ✏️  Updated:  ${therapist.name}`);
        }
    }
    // 2. Deactivate all other therapists to prevent non-normalized or generic fallback schedules
    const seededIds = THERAPISTS.map(t => new mongoose.Types.ObjectId(t._id));
    const deactivateResult = await TherapistModel.updateMany({ _id: { $nin: seededIds } }, { $set: { active: false } });
    console.log(`\n🚫 Deactivated ${deactivateResult.modifiedCount} other unseeded therapists.`);
    console.log("\n✅ Seed complete.");
    await mongoose.disconnect();
}
main().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
