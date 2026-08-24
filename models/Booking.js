const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  child_name: { type: String, required: true },
  child_age: { type: String, required: true },
  parent_name: { type: String, required: true },
  concern: { type: String, required: true },
  service: { type: String, required: true },
  appointment_date: { type: String, required: true },
  appointment_time: { type: String, required: true },
  phone_number: { type: String, required: true },
  status: { type: String, default: 'CONFIRMED' }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
