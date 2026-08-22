import mongoose from "mongoose";

export interface ITherapistSlot {
  _id?: any;
  slotId: string;
  therapistId: string;
  therapistName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00 AM"
  status: "available" | "booked" | "unavailable";
  createdAt?: Date;
  updatedAt?: Date;
}

const TherapistSlotSchema = new mongoose.Schema<ITherapistSlot>(
  {
    slotId: { type: String, required: true },
    therapistId: { type: String, required: true },
    therapistName: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ["available", "booked", "unavailable"], default: "available" },
  },
  {
    timestamps: true,
    collection: "therapist_slots",
  }
);

TherapistSlotSchema.index({ therapistId: 1, date: 1, time: 1 }, { unique: true });
TherapistSlotSchema.index({ date: 1, status: 1 });

export const TherapistSlotModel = mongoose.model<ITherapistSlot>("TherapistSlot", TherapistSlotSchema);
