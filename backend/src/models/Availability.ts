import mongoose from "mongoose";

export interface IAvailability {
  _id?: any;
  therapistName: string;
  department: string;
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  updatedAt?: Date;
}

const AvailabilitySchema = new mongoose.Schema<IAvailability>(
  {
    therapistName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "availabilities" }
);

// Compound unique index: { therapistName: 1, date: 1 }
AvailabilitySchema.index({ therapistName: 1, date: 1 }, { unique: true });
AvailabilitySchema.index({ department: 1, date: 1 });
AvailabilitySchema.index({ date: 1 });

export const AvailabilityModel = mongoose.model<IAvailability>("Availability", AvailabilitySchema);
