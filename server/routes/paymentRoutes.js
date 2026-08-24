const express = require("express");
const router = express.Router();

const Payment = require("../models/Payment");



// ============================
// CREATE PAYMENT
// ============================
router.post("/", async (req, res) => {
    try {

        console.log("BODY:", req.body);
        const { patientId, amount, type, totalSessions } = req.body;

        // Validation
        if (!patientId) {
            return res.status(400).json({ error: "patientId is required" });
        }

        if (!amount) {
            return res.status(400).json({ error: "amount is required" });
        }

        // Default sessions logic
        let sessions = 0;

        if (type === "package") {
            if (!totalSessions || totalSessions <= 0) {
                return res.status(400).json({ error: "totalSessions required for package" });
            }
            sessions = totalSessions;
        }

        const payment = await Payment.create({
            patientId,
            amount,
            type: type || "per-session",
            totalSessions: sessions,
            remainingSessions: sessions
        });

        res.json({
            message: "Payment created successfully",
            payment
        });

    } catch (err) {
        console.log("CREATE PAYMENT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================
// GET ALL PAYMENTS
// ============================
router.get("/", async (req, res) => {
    try {
        const data = await Payment.find().populate("patientId");
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================
// GET PAYMENTS BY PATIENT
// ============================
router.get("/patient/:patientId", async (req, res) => {
    try {
        const data = await Payment.find({ patientId: req.params.patientId });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================
// USE SESSION (AFTER COMPLETION)
// ============================
router.post("/use-session/:id", async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.type === "package") {

            if (payment.remainingSessions <= 0) {
                return res.status(400).json({ error: "No sessions left" });
            }

            payment.sessionsUsed += 1;
            payment.remainingSessions -= 1;

            await payment.save();

            return res.json({
                message: "Session used successfully",
                payment
            });

        } else {
            // Per session payment
            return res.json({
                message: "Per-session payment used",
                payment
            });
        }

    } catch (err) {
        console.log("USE SESSION ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================
// CANCEL SESSION (DEDUCTION)
// ============================
router.post("/cancel-session/:id", async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.type === "package") {

            if (payment.remainingSessions <= 0) {
                return res.status(400).json({ error: "No sessions left" });
            }

            // Deduct 1 session as penalty
            payment.remainingSessions -= 1;

            await payment.save();

            return res.json({
                message: "1 session deducted due to cancellation",
                payment
            });

        } else {
            // Per session - no deduction logic
            return res.json({
                message: "Cancellation recorded (no package deduction)",
                payment
            });
        }

    } catch (err) {
        console.log("CANCEL SESSION ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================
// UPDATE PAYMENT STATUS
// ============================
router.put("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;

        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            { paymentStatus: status },
            { new: true }
        );

        res.json(payment);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================
// DELETE PAYMENT
// ============================
router.delete("/:id", async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);

        res.json({ message: "Payment deleted" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { getNextId } = require("../utils/idGenerator");

router.post("/", async (req, res) => {
    try {

        const paymentCode = await getNextId("payment", "PAY");

        const { patientId, amount, type, totalSessions } = req.body;

        const payment = await Payment.create({
            patientId,
            amount,
            type,
            totalSessions,
            remainingSessions: totalSessions,
            paymentCode
        });

        res.json(payment);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
