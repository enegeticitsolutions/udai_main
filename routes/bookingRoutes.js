const express = require('express');
const router = express.Router();
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

// Helper function: Next 5 days generate karne ke liye (YYYY-MM-DD)
const getNext5Days = () => {
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// 1. API: Selected service ke liye agle 5 dino me se available dates fetch karna
// GET /api/booking/available-dates?service=Physical Therapy
router.get('/available-dates', async (req, res) => {
  try {
    const { service } = req.query;
    if (!service) {
      return res.status(400).json({ success: false, message: 'Service is required' });
    }

    const next5Days = getNext5Days();

    const availableDates = await Slot.find({
      service_id: service,
      date: { $in: next5Days },
      is_booked: false
    }).distinct('date');

    // MSG91 dynamic list friendly format
    const formattedDates = availableDates.map(d => ({
      id: d,
      title: d,
      description: `Available: ${d}`
    }));

    return res.status(200).json({
      success: true,
      data: formattedDates,
      dates: availableDates
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. API: Selected service aur date ke liye available time slots fetch karna
// GET /api/booking/available-slots?service=Physical Therapy&date=2026-08-25
router.get('/available-slots', async (req, res) => {
  try {
    const { service, date } = req.query;
    if (!service || !date) {
      return res.status(400).json({ success: false, message: 'Service and date are required' });
    }

    const availableSlots = await Slot.find({
      service_id: service,
      date: date,
      is_booked: false
    }).select('time_slot _id');

    const formattedSlots = availableSlots.map(s => ({
      id: s.time_slot,
      title: s.time_slot,
      description: 'Available'
    }));

    return res.status(200).json({
      success: true,
      data: formattedSlots,
      slots: availableSlots.map(s => s.time_slot)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. API: Final booking save karna aur slot block karna
// POST /api/booking/confirm-booking
router.post('/confirm-booking', async (req, res) => {
  try {
    const {
      child_name,
      child_age,
      parent_name,
      concern,
      service,
      appointment_date,
      appointment_time,
      phone_number
    } = req.body;

    const slot = await Slot.findOneAndUpdate(
      {
        service_id: service,
        date: appointment_date,
        time_slot: appointment_time,
        is_booked: false
      },
      { is_booked: true },
      { new: true }
    );

    if (!slot) {
      return res.status(400).json({
        success: false,
        message: 'Selected slot is no longer available.'
      });
    }

    const newBooking = await Booking.create({
      child_name,
      child_age,
      parent_name,
      concern,
      service,
      appointment_date,
      appointment_time,
      phone_number: phone_number || 'N/A'
    });

    return res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      booking_id: newBooking._id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
