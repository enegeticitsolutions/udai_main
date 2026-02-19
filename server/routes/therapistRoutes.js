const express = require("express");
const router = express.Router();
const User = require("../models/User");

// ============================
// ADD THERAPIST
// ============================
router.post("/", async (req, res) => {
    try {
        const therapist = await User.create({
            ...req.body,
            role: "therapist"
        });
        res.json(therapist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// GET ALL THERAPISTS
// ============================
router.get("/", async (req, res) => {
    try {
        const therapists = await User.find({ role: "therapist" });
        res.json(therapists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// FILTER BY SPECIALIZATION
// ============================
router.get("/type/:type", async (req, res) => {
    try {
        const therapists = await User.find({
            role: "therapist",
            specialization: req.params.type
        });

        res.json(therapists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// GET SINGLE THERAPIST
// ============================
router.get("/:id", async (req, res) => {
    try {
        const therapist = await User.findById(req.params.id);
        if (!therapist) {
            return res.status(404).json({ error: "Therapist not found" });
        }
        res.json(therapist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// UPDATE THERAPIST DETAILS
// ============================
router.put("/:id", async (req, res) => {
    try {
        const therapist = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!therapist) {
            return res.status(404).json({ error: "Therapist not found" });
        }
        res.json(therapist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// DELETE THERAPIST
// ============================
router.delete("/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Therapist deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// SET ALL AVAILABILITY SLOTS
// ============================
router.put("/:id/availability", async (req, res) => {
    try {
        const { availability } = req.body;

        const therapist = await User.findByIdAndUpdate(
            req.params.id,
            { availability },
            { new: true }
        );

        if (!therapist) {
            return res.status(404).json({ error: "Therapist not found" });
        }

        res.json({
            message: "Availability updated",
            availability: therapist.availability
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// ADD SINGLE AVAILABILITY SLOT
// ============================
router.post("/:id/availability", async (req, res) => {
    try {
        const { day, date, start, end } = req.body;

        if (!day || !start || !end) {
            return res.status(400).json({ error: "day, start, and end are required" });
        }

        const therapist = await User.findById(req.params.id);
        if (!therapist) {
            return res.status(404).json({ error: "Therapist not found" });
        }

        therapist.availability.push({ day, date: date || "", start, end });
        await therapist.save();

        res.json({
            message: "Slot added",
            availability: therapist.availability
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// UPDATE A SINGLE AVAILABILITY SLOT
// ============================
router.patch("/:id/availability/:slotIndex", async (req, res) => {
    try {
        const therapist = await User.findById(req.params.id);
        if (!therapist) {
            return res.status(404).json({ error: "Therapist not found" });
        }

        const index = parseInt(req.params.slotIndex);
        if (index < 0 || index >= therapist.availability.length) {
            return res.status(400).json({ error: "Invalid slot index" });
        }

        // Merge the updated fields into the existing slot
        therapist.availability[index] = {
            ...therapist.availability[index].toObject(),
            ...req.body
        };
        await therapist.save();

        res.json({
            message: "Slot updated",
            availability: therapist.availability
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================
// REMOVE AVAILABILITY SLOT
// ============================
router.delete("/:id/availability/:slotIndex", async (req, res) => {
    try {
        const therapist = await User.findById(req.params.id);
        if (!therapist) {
            return res.status(404).json({ error: "Therapist not found" });
        }

        const index = parseInt(req.params.slotIndex);
        if (index < 0 || index >= therapist.availability.length) {
            return res.status(400).json({ error: "Invalid slot index" });
        }

        therapist.availability.splice(index, 1);
        await therapist.save();

        res.json({
            message: "Slot removed",
            availability: therapist.availability
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
