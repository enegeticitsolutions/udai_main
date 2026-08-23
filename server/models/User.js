const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: String,
    password: String,

    role: {
        type: String,
        enum: ["admin", "therapist", "parent"],
        default: "therapist"
    },

    specialization: {
        type: String,
        enum: [
            "OT",
            "Special Educator",
            "Speech Therapist",
            "Yoga / Physical Therapist",
            "Remedial / Academic Support",
            "Counselling / Home Programme"
        ]
    },

    availability: [
        {
            day: String,
            date: String,
            start: String,
            end: String
        }
    ],

    status: {
        type: String,
        default: "active"
    }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
