const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const User = require("../models/User");

const getNext5Days = () => {
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

// 1. Available Dates
router.get("/available-dates", async (req, res) => {
  try {
    const next5Days = getNext5Days();
    const dateOptions = next5Days.map(date => ({
      id: date,
      title: date,
      description: `Slots for ${date}`
    }));

    return res.status(200).json({
      success: true,
      data: dateOptions,
      dates: next5Days
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Available Slots
router.get("/available-slots", async (req, res) => {
  try {
    const service = req.query.service || req.query.department;
    const date = req.query.date || req.query.appointmentDate;

    const allSlots = [
      "10:00 AM",
      "11:30 AM",
      "02:00 PM",
      "03:30 PM",
      "05:00 PM"
    ];

    const bookedAppointments = await Appointment.find({
      date: date,
      sessionType: service,
      status: { $ne: "cancelled" }
    }).select("time");

    const bookedTimes = bookedAppointments.map(a => a.time);
    const available = allSlots.filter(slot => !bookedTimes.includes(slot));

    const slotOptions = available.map(slot => ({
      id: slot,
      title: slot,
      description: "Available"
    }));

    return res.status(200).json({
      success: true,
      data: slotOptions,
      slots: available
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Book Appointment (Supports both camelCase & snake_case)
router.post("/book", async (req, res) => {
  try {
    const child_name = req.body.childName || req.body.child_name;
    const child_age = req.body.age || req.body.child_age;
    const parent_name = req.body.parentName || req.body.parent_name;
    const concern = req.body.concern || req.body.concern_of_child;
    const service = req.body.department || req.body.service;
    const appointment_date = req.body.appointmentDate || req.body.appointment_date;
    const appointment_time = req.body.appointmentTime || req.body.appointment_time;
    const phone_number = req.body.customerNumber || req.body.phone_number || "N/A";

    let therapist = await User.findOne({
      role: "therapist",
      specialization: service,
      status: "active"
    });

    if (!therapist) {
      therapist = await User.findOne({ role: "therapist" });
    }

    const patient = await Patient.create({
      name: child_name || "Guest Child",
      age: Number(child_age) || 0,
      parentName: parent_name || "N/A",
      phone: phone_number,
      concerns: concern || "General",
      enquirySource: "WhatsApp MSG91"
    });

    const appointment = await Appointment.create({
      patientId: patient._id,
      therapistId: therapist ? therapist._id : patient._id,
      sessionType: service || "General",
      date: appointment_date,
      time: appointment_time,
      status: "booked"
    });

    return res.status(200).json({
      success: true,
      message: "Appointment booked successfully!",
      booking_id: appointment._id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
