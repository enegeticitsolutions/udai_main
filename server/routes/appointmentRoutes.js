const express = require("express");
const router = express.Router();

const Appointment = require("../models/Appointment");
const Payment = require("../models/Payment");
const { getNextId } = require("../utils/idGenerator");


// ============================
// CREATE APPOINTMENT
// ============================
router.post("/", async (req, res) => {
    try {

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "Body is empty" });
        }

        const { patientId, therapistId, date, time, sessionType } = req.body;

        if (!patientId || !therapistId || !date || !time || !sessionType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // ======================
        // PAYMENT CHECK — DISABLED FOR DEVELOPMENT
        // ======================
        // const payment = await Payment.findOne({
        //     patientId,
        //     paymentStatus: "paid"
        // });
        //
        // if (!payment) {
        //     return res.status(400).json({ error: "No active payment found" });
        // }

        // ======================
        // SESSION CHECK — DISABLED FOR DEVELOPMENT
        // ======================
        // if (payment.type === "package" && payment.remainingSessions <= 0) {
        //     return res.status(400).json({ error: "No sessions left" });
        // }

        // ======================
        // CHECK SLOT CONFLICT
        // ======================
        const existing = await Appointment.findOne({
            therapistId,
            date,
            time,
            status: "booked"
        });

        if (existing) {
            return res.status(400).json({ error: "Slot already booked" });
        }

        // ======================
        // CREATE APPOINTMENT
        // ======================
        const appointmentCode = await getNextId("appointment", "APT");

        const appointment = await Appointment.create({
            patientId,
            therapistId,
            date,
            time,
            sessionType,
            appointmentCode
        });

        res.json({
            message: "Appointment created",
            appointment
        });

    } catch (err) {
        console.log("CREATE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================
// GET ALL APPOINTMENTS
// ============================
router.get("/", async (req, res) => {
    try {
        const data = await Appointment.find()
            .populate("patientId")
            .populate("therapistId");

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================
// COMPLETE SESSION
// ============================
router.put("/:id/complete", async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        if (appointment.status === "completed") {
            return res.status(400).json({ error: "Already completed" });
        }

        // ======================
        // UPDATE STATUS
        // ======================
        appointment.status = "completed";
        await appointment.save();

        // ======================
        // DEDUCT SESSION
        // ======================
        const payment = await Payment.findOne({
            patientId: appointment.patientId,
            paymentStatus: "paid"
        });

        if (payment && payment.type === "package") {

            if (payment.remainingSessions > 0) {
                payment.sessionsUsed += 1;
                payment.remainingSessions -= 1;
                await payment.save();
            }
        }

        res.json({
            message: "Session completed and deducted",
            appointment,
            payment
        });

    } catch (err) {
        console.log("COMPLETE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================
// CANCEL APPOINTMENT
// ============================
router.put("/:id/cancel", async (req, res) => {
    try {

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        if (appointment.status === "cancelled") {
            return res.status(400).json({ error: "Already cancelled" });
        }

        // ======================
        // UPDATE STATUS
        // ======================
        appointment.status = "cancelled";
        await appointment.save();

        // ======================
        // APPLY PENALTY
        // ======================
        const payment = await Payment.findOne({
            patientId: appointment.patientId,
            paymentStatus: "paid"
        });

        if (payment && payment.type === "package") {

            if (payment.remainingSessions > 0) {
                payment.remainingSessions -= 1;
                await payment.save();
            }
        }

        res.json({
            message: "Appointment cancelled and session deducted",
            appointment,
            payment
        });

    } catch (err) {
        console.log("CANCEL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================
// RESCHEDULE APPOINTMENT
// ============================
router.put("/:id/reschedule", async (req, res) => {
    try {

        const { date, time } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        // CHECK SLOT
        const existing = await Appointment.findOne({
            therapistId: appointment.therapistId,
            date,
            time,
            status: "booked"
        });

        if (existing) {
            return res.status(400).json({ error: "Slot already booked" });
        }

        appointment.date = date;
        appointment.time = time;
        appointment.status = "rescheduled";

        await appointment.save();

        res.json({
            message: "Appointment rescheduled",
            appointment
        });

    } catch (err) {
        console.log("RESCHEDULE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================
// DELETE APPOINTMENT
// ============================
router.delete("/:id", async (req, res) => {
    try {

        await Appointment.findByIdAndDelete(req.params.id);

        res.json({ message: "Appointment deleted" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
