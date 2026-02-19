const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({

    patientCode: {
        type: String,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    age: {
        type: Number,
        required: true
    },

    parentName: String,

    phone: {
        type: String,
        required: true
    },

    concerns: String,

    referredBy: String,

    enquirySource: String

}, { timestamps: true });

module.exports = mongoose.model("Patient", patientSchema);
