import mongoose from "mongoose";
const TherapistUnavailabilitySchema = new mongoose.Schema({
    therapistId: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ["full", "partial"], required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    reason: { type: String, default: "" },
}, {
    timestamps: true,
    collection: "therapistUnavailability",
});
/** Fast lookup by therapistId + date */
TherapistUnavailabilitySchema.index({ therapistId: 1, date: 1 });
export const TherapistUnavailability = mongoose.model("TherapistUnavailability", TherapistUnavailabilitySchema);
