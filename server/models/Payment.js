const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

    paymentCode: {
        type: String,
        unique: true
    },

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    type: {
        type: String,
        enum: ["package", "per-session"],
        default: "per-session"
    },

    totalSessions: {
        type: Number,
        default: 0
    },

    sessionsUsed: {
        type: Number,
        default: 0
    },

    remainingSessions: {
        type: Number,
        default: 0
    },

    paymentStatus: {
        type: String,
        enum: ["pending", "paid"],
        default: "paid"
    },

    date: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
