import mongoose from "mongoose";

/**
 * TherapistUnavailability — records when a therapist is unavailable.
 *
 * type "full"    → entire day blocked
 * type "partial" → only startTime–endTime blocked on that day
 */
export interface ITherapistUnavailability {
  _id?: any;
  /** References TherapistModel._id (stored as string for flexibility) */
  therapistId: string;
  /** YYYY-MM-DD */
  date: string;
  type: "full" | "partial";
  /** Only used when type = "partial" */
  startTime?: string; // "HH:MM"
  endTime?: string;   // "HH:MM"
  reason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TherapistUnavailabilitySchema = new mongoose.Schema<ITherapistUnavailability>(
  {
    therapistId: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ["full", "partial"], required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    reason: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "therapistUnavailability",
  }
);

/** Fast lookup by therapistId + date */
TherapistUnavailabilitySchema.index({ therapistId: 1, date: 1 });

export const TherapistUnavailability = mongoose.model<ITherapistUnavailability>(
  "TherapistUnavailability",
  TherapistUnavailabilitySchema
);
