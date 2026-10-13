import { Router } from "express";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { RoutineBookingModel } from "../models/RoutineBooking.js";
import { generateSessionSchedule } from "../services/msg91AppointmentService.js";
export const msg91RoutineBookingRouter = Router();
/**
 * Normalizes phone number to 10 clean digits.
 */
function normalizePhone(raw) {
    if (!raw)
        return "";
    const digits = String(raw).replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : digits;
}
/**
 * Cleans potential unpopulated MSG91 template variable tokens.
 * e.g. "{{selected_days}}", "@selected_days", "null", "undefined".
 */
function sanitizeInput(val) {
    if (!val || typeof val !== "string")
        return "";
    const trimmed = val.trim();
    if (trimmed === "null" ||
        trimmed === "undefined" ||
        trimmed.startsWith("{{") ||
        trimmed.endsWith("}}") ||
        trimmed.startsWith("@")) {
        return "";
    }
    return trimmed;
}
/**
 * Helper to get upcoming date (YYYY-MM-DD) for a specific day of the week.
 */
function getNextDateForDay(dayName) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetIdx = days.indexOf(dayName.trim().toLowerCase());
    const now = new Date();
    if (targetIdx === -1) {
        return now.toISOString().slice(0, 10);
    }
    const currentIdx = now.getDay();
    let diff = targetIdx - currentIdx;
    if (diff <= 0)
        diff += 7;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const d = String(targetDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
/**
 * POST /api/msg91-routine-booking
 * Dedicated, isolated endpoint for frequent routine therapy bookings from MSG91 WhatsApp bot.
 */
msg91RoutineBookingRouter.post("/", async (req, res) => {
    try {
        const rawBody = (req.body ?? {});
        const nested = (rawBody.data ?? rawBody.payload ?? rawBody.variables ?? {});
        // 1. Extract and sanitize inputs
        const rawPhone = rawBody.phoneNumber ||
            rawBody.phone ||
            rawBody.sender ||
            rawBody.from ||
            rawBody.customerNumber ||
            rawBody.mobile ||
            rawBody.wa_id ||
            nested.phoneNumber ||
            nested.phone ||
            nested.sender ||
            nested.from ||
            nested.customerNumber ||
            nested.mobile ||
            "";
        const cleanPhone = normalizePhone(rawPhone);
        if (!cleanPhone || cleanPhone.length < 10) {
            return res.status(400).json({
                status: "failed",
                message: "A valid 10-digit phone number is required",
            });
        }
        let selectedPackage = sanitizeInput(rawBody.selectedPackage ||
            rawBody.package ||
            rawBody.selected_package ||
            nested.selectedPackage ||
            nested.package ||
            nested.selected_package);
        let selectedDays = sanitizeInput(rawBody.selectedDays ||
            rawBody.days ||
            rawBody.selected_days ||
            nested.selectedDays ||
            nested.days ||
            nested.selected_days);
        // 2. Defaulting Logic:
        // If selectedPackage is "3 Days booking" (or contains '3') and selectedDays is missing/empty,
        // default selectedDays to "Monday, Wednesday, Friday"
        const is3DaysPackage = /3\s*day/i.test(selectedPackage) || selectedPackage === "3";
        if (is3DaysPackage && !selectedDays) {
            selectedDays = "Monday, Wednesday, Friday";
        }
        // Default package if missing
        if (!selectedPackage) {
            if (selectedDays) {
                const dayTokens = selectedDays.split(/[,&]+/).map((s) => s.trim()).filter(Boolean);
                selectedPackage = `${dayTokens.length} Days Booking`;
            }
            else {
                selectedPackage = "3 Days booking";
                selectedDays = "Monday, Wednesday, Friday";
            }
        }
        // Determine total sessions
        let totalSessions = 1;
        if (/3\s*day/i.test(selectedPackage) || selectedPackage.includes("3")) {
            totalSessions = 3;
        }
        else if (/2\s*day/i.test(selectedPackage) || selectedPackage.includes("2")) {
            totalSessions = 2;
        }
        else if (/1\s*day/i.test(selectedPackage) || selectedPackage.includes("1")) {
            totalSessions = 1;
        }
        else if (selectedDays) {
            const parts = selectedDays.split(/[,&]+/).map((s) => s.trim()).filter(Boolean);
            totalSessions = Math.max(1, parts.length);
        }
        // Connect to MongoDB
        await connectMongoDb().catch(() => { });
        const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
        // 3. Find or map user/child using phone number (link to existing child schedule/routine if applicable)
        let matchedChildSchedule = null;
        let priorAppointment = null;
        if (db) {
            const phoneRegex = new RegExp(`${cleanPhone}$`);
            const phoneFilter = {
                $or: [
                    { parent_phone: cleanPhone },
                    { parent_phone: `+91${cleanPhone}` },
                    { parent_phone: `91${cleanPhone}` },
                    { parent_phone: phoneRegex },
                ],
            };
            try {
                // Check active or existing child schedules
                matchedChildSchedule = await db.collection("childSchedules").findOne({
                    status: "ACTIVE",
                    ...phoneFilter,
                });
                if (!matchedChildSchedule) {
                    matchedChildSchedule = await db.collection("childSchedules").findOne(phoneFilter);
                }
            }
            catch (err) {
                console.warn("[msg91-routine-booking] Child schedule lookup warning:", err.message);
            }
            // If child schedule not found, query prior appointments for child/parent identity
            if (!matchedChildSchedule) {
                try {
                    priorAppointment = await db.collection("appointments").findOne({
                        $or: [
                            { phoneNumber: phoneRegex },
                            { phone: phoneRegex },
                            { "rawPayload.customerNumber": phoneRegex },
                        ],
                    }, { sort: { createdAt: -1, _id: -1 } });
                }
                catch (err) {
                    console.warn("[msg91-routine-booking] Prior appointment lookup warning:", err.message);
                }
            }
        }
        // Resolve Child Name, Parent Name, Therapist, Department
        const childName = matchedChildSchedule?.child_name ||
            priorAppointment?.patientName ||
            priorAppointment?.childName ||
            `Child (${cleanPhone})`;
        const parentName = matchedChildSchedule?.parent_name ||
            priorAppointment?.parentName ||
            `Parent of ${childName}`;
        const therapistName = matchedChildSchedule?.therapist_id ||
            priorAppointment?.therapistName ||
            priorAppointment?.assignedTherapist ||
            "Ms Nikki";
        const therapistId = matchedChildSchedule?.therapist_id ||
            priorAppointment?.therapistId ||
            "roster-ot-1";
        const department = matchedChildSchedule?.therapy_type ||
            priorAppointment?.department ||
            "Occupational Therapy";
        const appointmentTime = matchedChildSchedule?.recurring_slots?.[0]?.start_time ||
            priorAppointment?.appointmentTime ||
            "10:00";
        const todayStr = new Date().toISOString().slice(0, 10);
        const bookingDate = todayStr;
        // Generate schedule breakdown for Admin Panel view
        const parsedDaysList = selectedDays
            .split(/[,&]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        let sessionSchedule = [];
        if (parsedDaysList.length > 0) {
            sessionSchedule = parsedDaysList.map((day, idx) => ({
                sessionNumber: idx + 1,
                date: getNextDateForDay(day),
                time: appointmentTime,
                day: day,
            }));
        }
        else {
            const generated = generateSessionSchedule(bookingDate, appointmentTime, totalSessions);
            sessionSchedule = generated.schedule;
        }
        const sessionScheduleText = sessionSchedule
            .map((s) => `Day ${s.sessionNumber}: ${s.date} (${s.day}) at ${s.time}`)
            .join(" | ");
        // Estimate fee (e.g. ₹1500 per session or ₹3000 for 2, ₹4500 for 3)
        const feeCharged = totalSessions === 3 ? 4500 : totalSessions === 2 ? 3000 : 1500;
        const uniqueBookingId = `ROUTINE-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
        // 4. Construct Routine Booking Document
        const routineRecord = {
            bookingId: uniqueBookingId,
            phoneNumber: cleanPhone,
            parent_phone: cleanPhone,
            patientName: childName,
            child_name: childName,
            childName: childName,
            parentName: parentName,
            selectedPackage: selectedPackage,
            package: selectedPackage,
            session_frequency: selectedPackage,
            selectedDays: selectedDays,
            selected_days: selectedDays,
            booking_date: bookingDate,
            appointmentDate: sessionSchedule[0]?.date || bookingDate,
            appointmentTime: appointmentTime,
            department: department,
            therapy_type: department,
            therapistName: therapistName,
            therapistId: therapistId,
            status: "CONFIRMED",
            bookingStatus: "confirmed",
            paymentStatus: "PAID",
            totalSessions: totalSessions,
            sessionSchedule: sessionSchedule,
            sessionScheduleText: sessionScheduleText,
            feeCharged: feeCharged,
            bookingSource: "msg91_whatsapp_routine",
            bookingType: "routine",
            isRoutineBooking: true,
            childScheduleId: matchedChildSchedule?._id || null,
            rawPayload: req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // 5. Save Record
        // A. Save to dedicated routineBookings collection
        try {
            if (mongoose.connection.readyState === 1) {
                await RoutineBookingModel.create({
                    ...routineRecord,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
            else if (db) {
                await db.collection("routineBookings").insertOne({
                    ...routineRecord,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        }
        catch (saveErr) {
            console.warn("[msg91-routine-booking] Warning saving to routineBookings:", saveErr.message);
        }
        // B. Save to 'appointments' collection so it renders automatically on the Admin Panel dashboard
        if (db) {
            await db.collection("appointments").insertOne({
                ...routineRecord,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
        console.log(`✅ [MSG91 Routine Booking] Created: ${uniqueBookingId} for ${childName} (${cleanPhone}) | Package: "${selectedPackage}" | Days: "${selectedDays}"`);
        // 6. Return standard success response
        return res.status(200).json({
            status: "success",
            message: "Routine booking recorded successfully",
        });
    }
    catch (error) {
        console.error("❌ [msg91-routine-booking] Error:", error);
        return res.status(500).json({
            status: "failed",
            message: error?.message || "Internal server error",
        });
    }
});
export default msg91RoutineBookingRouter;
