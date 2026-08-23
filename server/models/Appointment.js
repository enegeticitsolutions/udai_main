const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({

    appointmentCode: {
        type: String,
        unique: true
    },

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },

    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    sessionType: {
        type: String,
        required: true
    },

    date: {
        type: String,
        required: true
    },

    time: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["booked", "completed", "cancelled", "rescheduled"],
        default: "booked"
    },

    paymentStatus: {
        type: String,
        enum: ["pending", "paid"],
        default: "pending"
    },

    cancellationReason: String

}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
