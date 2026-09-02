import { Router } from "express";
import { AvailabilityModel } from "../models/Availability.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import mongoose from "mongoose";
export const availabilityRouter = Router();
// Configured clinic therapists grouped by department
export const CLINIC_THERAPISTS = [
    { department: "OT", therapistName: "Nikki" },
    { department: "OT", therapistName: "Harsimran" },
    { department: "Physiotherapy", therapistName: "Divya" },
    { department: "Special Educator", therapistName: "Sobha" },
    { department: "Special Educator", therapistName: "Sonia" },
    { department: "Special Educator", therapistName: "Ranjana" },
    { department: "Speech Therapy", therapistName: "Atal" },
    { department: "Speech Therapy", therapistName: "Sakshi" },
    { department: "Physical Therapy", therapistName: "Durgesh" },
    { department: "Academic Support", therapistName: "Sonia" },
    { department: "Academic Support", therapistName: "Sobha" },
    { department: "Counselling", therapistName: "Tanu" },
    { department: "Counselling", therapistName: "Sonia" },
];
/**
 * GET /api/availability
 * Returns availability status for clinic therapists for a date or date range.
 */
availabilityRouter.get("/", async (req, res) => {
    try {
        const { startDate, endDate, date, department } = req.query;
        const filter = {};
        if (date) {
            filter.date = String(date).trim();
        }
        else if (startDate && endDate) {
            filter.date = { $gte: String(startDate).trim(), $lte: String(endDate).trim() };
        }
        else if (startDate) {
            filter.date = { $gte: String(startDate).trim() };
        }
        if (department) {
            filter.department = String(department).trim();
        }
        // Try Mongoose first
        let records = [];
        if (mongoose.connection.readyState === 1) {
            records = await AvailabilityModel.find(filter).lean();
        }
        else {
            await connectMongoDb();
            const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
            if (db) {
                records = await db.collection("availabilities").find(filter).toArray();
            }
        }
        res.status(200).json({
            success: true,
            count: records.length,
            data: records,
            configuredTherapists: CLINIC_THERAPISTS,
        });
    }
    catch (error) {
        console.error("[Availability] Error fetching availability:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch availability" });
    }
});
/**
 * POST /api/availability/toggle
 * Accepts { therapistName, department, date, isAvailable } and upserts the document.
 */
availabilityRouter.post("/toggle", async (req, res) => {
    try {
        const { therapistName, department, date, isAvailable } = req.body;
        if (!therapistName || !date) {
            res.status(400).json({ success: false, message: "therapistName and date are required" });
            return;
        }
        const cleanDate = String(date).trim();
        const cleanName = String(therapistName).trim();
        const cleanDept = String(department || "").trim();
        const availableVal = isAvailable === undefined ? true : Boolean(isAvailable);
        let updatedDoc = null;
        if (mongoose.connection.readyState === 1) {
            updatedDoc = await AvailabilityModel.findOneAndUpdate({ therapistName: cleanName, date: cleanDate }, {
                $set: {
                    therapistName: cleanName,
                    department: cleanDept,
                    date: cleanDate,
                    isAvailable: availableVal,
                    updatedAt: new Date(),
                },
            }, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        else {
            await connectMongoDb();
            const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
            if (db) {
                await db.collection("availabilities").updateOne({ therapistName: cleanName, date: cleanDate }, {
                    $set: {
                        therapistName: cleanName,
                        department: cleanDept,
                        date: cleanDate,
                        isAvailable: availableVal,
                        updatedAt: new Date(),
                    },
                }, { upsert: true });
                updatedDoc = await db.collection("availabilities").findOne({ therapistName: cleanName, date: cleanDate });
            }
        }
        console.log(`[Availability Toggle] ${cleanName} (${cleanDept}) on ${cleanDate} -> isAvailable: ${availableVal}`);
        res.status(200).json({
            success: true,
            message: `Availability updated: ${cleanName} is now ${availableVal ? "Available" : "Not Available"} on ${cleanDate}`,
            data: updatedDoc,
        });
    }
    catch (error) {
        console.error("[Availability] Error toggling availability:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update availability" });
    }
});
export default availabilityRouter;
