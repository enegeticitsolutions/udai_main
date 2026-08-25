import mongoose from "mongoose";
const TherapistSlotSchema = new mongoose.Schema({
    slotId: { type: String, required: true },
    therapistId: { type: String, required: true },
    therapistName: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ["available", "booked", "unavailable"], default: "available" },
}, {
    timestamps: true,
    collection: "therapist_slots",
});
TherapistSlotSchema.index({ therapistId: 1, date: 1, time: 1 }, { unique: true });
TherapistSlotSchema.index({ date: 1, status: 1 });
export const TherapistSlotModel = mongoose.model("TherapistSlot", TherapistSlotSchema);
