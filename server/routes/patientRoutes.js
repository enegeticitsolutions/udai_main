const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");

// CREATE PATIENT
const { getNextId } = require("../utils/idGenerator");

router.post("/", async (req, res) => {
    try {

        const patientCode = await getNextId("patient", "PAT");

        const patient = await Patient.create({
            ...req.body,
            patientCode
        });

        res.json(patient);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET ALL PATIENTS
router.get("/", async (req, res) => {
    try {
        const patients = await Patient.find();
        res.json(patients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
