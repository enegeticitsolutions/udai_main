import mongoose from "mongoose";

/**
 * WeeklyScheduleEntry — defines when a therapist works on a given day of week.
 */
export interface IWeeklyScheduleEntry {
  /** 0 = Sunday, 1 = Monday, …, 6 = Saturday */
  day: number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  lunchStart: string; // "HH:MM"  — blocked during this window
  lunchEnd: string;   // "HH:MM"
}

export interface ITherapist {
  _id?: any;
  name: string;
  department: string;
  role?: string;
  image?: string;
  summary?: string;
  experience?: string;
  active: boolean;
  /**
   * Weekly working schedule. Empty array = therapist works no days (fully inactive).
   * Default: Mon–Fri 09:00–17:00, lunch 13:00–14:00.
   */
  weeklySchedule: IWeeklyScheduleEntry[];
  createdAt?: Date;
  updatedAt?: Date;
}

const WeeklyScheduleEntrySchema = new mongoose.Schema<IWeeklyScheduleEntry>(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    lunchStart: { type: String, required: true },
    lunchEnd: { type: String, required: true },
  },
  { _id: false }
);

const TherapistSchema = new mongoose.Schema<ITherapist>(
  {
    name: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, default: "" },
    image: { type: String, default: "" },
    summary: { type: String, default: "" },
    experience: { type: String, default: "" },
    active: { type: Boolean, default: true },
    weeklySchedule: { type: [WeeklyScheduleEntrySchema], default: [] },
  },
  {
    timestamps: true,
    collection: "therapists",
  }
);

/** Index for fast department + active lookups */
TherapistSchema.index({ department: 1, active: 1 });

export const TherapistModel = mongoose.model<ITherapist>("TherapistModel", TherapistSchema);

/**
 * Default Mon–Fri schedule used when seeding therapists without explicit schedules.
 */
export const DEFAULT_WEEKLY_SCHEDULE: IWeeklyScheduleEntry[] = [1, 2, 3, 4, 5].map((day) => ({
  day,
  startTime: "09:00",
  endTime: "17:00",
  lunchStart: "13:00",
  lunchEnd: "14:00",
}));
