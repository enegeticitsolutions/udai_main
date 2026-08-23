const express = require("express");
const router = express.Router();

const { getSession, updateSession, resetSession } = require("../utils/sessionStore");
const { sendMessage } = require("../services/whatsappService");

const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const User = require("../models/User");


// ======================
// VERIFY WEBHOOK
// ======================
router.get("/", (req, res) => {
    const VERIFY_TOKEN = "12345";

    if (
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === VERIFY_TOKEN
    ) {
        return res.send(req.query["hub.challenge"]);
    }

    res.sendStatus(403);
});


// ======================
// MAIN BOT LOGIC
// ======================
router.post("/", async (req, res) => {
    try {
        const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!message) return res.sendStatus(200);

        const phone = message.from;
        const text = message.text?.body?.trim();

        let session = getSession(phone);

        console.log("User:", phone, "Step:", session.step, "Text:", text);

        // ======================
        // START
        // ======================
        if (!session.step || session.step === "start") {
            await sendMessage(phone, "Welcome!\n1. Book Appointment\n2. Support");
            updateSession(phone, { step: "menu" });
        }

        // ======================
        // MENU
        // ======================
        else if (session.step === "menu") {
            if (text === "1") {
                await sendMessage(phone, "Enter Child Name:");
                updateSession(phone, { step: "name" });
            } else {
                await sendMessage(phone, "Invalid option. Type 1");
            }
        }

        // ======================
        // NAME
        // ======================
        else if (session.step === "name") {
            updateSession(phone, { name: text, step: "age" });
            await sendMessage(phone, "Enter Age:");
        }

        // ======================
        // AGE
        // ======================
        else if (session.step === "age") {
            updateSession(phone, { age: text, step: "therapy" });

            await sendMessage(
                phone,
                "Select Therapy:\n1. OT\n2. Speech\n3. Special Education\n4. Yoga\n5. Counselling"
            );
        }

        // ======================
        // THERAPY SELECTION
        // ======================
        else if (session.step === "therapy") {
            const therapyMap = {
                "1": "OT",
                "2": "Speech",
                "3": "Special Education",
                "4": "Yoga",
                "5": "Counselling"
            };

            const selectedTherapy = therapyMap[text];

            if (!selectedTherapy) {
                return await sendMessage(phone, "Invalid option. Select 1-5");
            }

            const therapists = await User.find({
                role: "therapist",
                specialization: selectedTherapy,
                status: "active"
            });

            if (therapists.length === 0) {
                return await sendMessage(phone, "No therapist available for this type");
            }

            updateSession(phone, {
                therapy: selectedTherapy,
                therapists: therapists,
                step: "therapist"
            });

            let msg = "Select Therapist:\n";
            therapists.forEach((t, i) => {
                msg += `${i + 1}. ${t.name}\n`;
            });

            await sendMessage(phone, msg);
        }

        // ======================
        // THERAPIST SELECTION
        // ======================
        else if (session.step === "therapist") {
            const index = parseInt(text) - 1;

            if (!session.therapists[index]) {
                return await sendMessage(phone, "Invalid selection");
            }

            const therapist = session.therapists[index];

            updateSession(phone, {
                therapistId: therapist._id,
                therapistName: therapist.name,
                step: "time"
            });

            await sendMessage(
                phone,
                "Select Time Slot:\n1. 10:00 AM\n2. 11:00 AM\n3. 12:00 PM\n4. 2:00 PM\n5. 3:00 PM"
            );
        }

        // ======================
        // TIME SELECTION
        // ======================
        else if (session.step === "time") {
            const timeMap = {
                "1": "10:00 AM",
                "2": "11:00 AM",
                "3": "12:00 PM",
                "4": "2:00 PM",
                "5": "3:00 PM"
            };

            const selectedTime = timeMap[text];

            if (!selectedTime) {
                return await sendMessage(phone, "Invalid time selection");
            }

            updateSession(phone, {
                time: selectedTime,
                step: "confirm"
            });

            await sendMessage(
                phone,
                `Confirm Booking:\nName: ${session.name}\nAge: ${session.age}\nTherapy: ${session.therapy}\nTherapist: ${session.therapistName}\nTime: ${selectedTime}\n\nReply YES to confirm`
            );
        }

        // ======================
        // CONFIRM BOOKING
        // ======================
        else if (session.step === "confirm") {

            if (text.toLowerCase() === "yes") {

                const today = new Date().toISOString().split("T")[0];

                // CHECK SLOT CONFLICT
                const existing = await Appointment.findOne({
                    therapistId: session.therapistId,
                    date: today,
                    time: session.time,
                    status: "booked"
                });

                if (existing) {
                    return await sendMessage(
                        phone,
                        "❌ Slot already booked. Please restart and choose another time."
                    );
                }

                // CREATE PATIENT
                const patient = await Patient.create({
                    name: session.name,
                    age: session.age,
                    phone: phone,
                    concerns: session.therapy,
                    enquirySource: "WhatsApp"
                });

                // CREATE APPOINTMENT
                const appointment = await Appointment.create({
                    patientId: patient._id,
                    therapistId: session.therapistId,
                    sessionType: session.therapy,
                    date: today,
                    time: session.time
                });

                await sendMessage(
                    phone,
                    `✅ Appointment Confirmed!\nID: ${appointment._id}\nTherapist: ${session.therapistName}\nTime: ${session.time}`
                );

                resetSession(phone);

            } else {
                await sendMessage(phone, "Cancelled. Type Hi to restart");
                resetSession(phone);
            }
        }

        // ======================
        // FALLBACK
        // ======================
        else {
            await sendMessage(phone, "Type Hi to start again");
            resetSession(phone);
        }

        res.sendStatus(200);

    } catch (err) {
        console.log("Error:", err);
        res.sendStatus(500);
    }
});

module.exports = router;
