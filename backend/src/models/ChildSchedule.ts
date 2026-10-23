import mongoose, { Document, Schema } from "mongoose";

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface IRecurringSlot {
  day_of_week: DayOfWeek;
  start_time: string; // e.g. "10:00"
  end_time: string;   // e.g. "10:45"
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  therapy_name?: string;
  therapy_type?: string;
  serviceId?: string;
  session_name?: string;
  sessionName?: string;
  therapist_id?: string;
  therapistId?: string;
  therapist_name?: string;
}

export interface IChildSchedule extends Document {
  child_name: string;
  parent_phone: string;
  therapist_id?: string;
  therapy_type?: string;
  recurring_slots: IRecurringSlot[];
  sessions?: IRecurringSlot[];
  status: "ACTIVE" | "PAUSED";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringSlotSchema = new Schema<IRecurringSlot>(
  {
    day_of_week: {
      type: String,
      required: true,
    },
    dayOfWeek: { type: String },
    start_time: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: { type: String, trim: true },
    end_time: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: { type: String, trim: true },
    therapy_name: { type: String, trim: true },
    therapy_type: { type: String, trim: true },
    serviceId: { type: String, trim: true },
    session_name: { type: String, trim: true },
    sessionName: { type: String, trim: true },
    therapist_id: { type: String, trim: true },
    therapistId: { type: String, trim: true },
    therapist_name: { type: String, trim: true },
  },
  { _id: false }
);

const ChildScheduleSchema = new Schema<IChildSchedule>(
  {
    child_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    parent_phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    therapist_id: {
      type: String,
      trim: true,
      default: "",
    },
    therapy_type: {
      type: String,
      trim: true,
      default: "",
    },
    recurring_slots: {
      type: [RecurringSlotSchema],
      validate: {
        validator: function (v: IRecurringSlot[]) {
          if (!Array.isArray(v) || v.length < 1 || v.length > 25) return false;
          // Ensure no duplicate day + time slots for the same child
          const uniqueKeys = new Set(v.map((s) => `${s.day_of_week || s.dayOfWeek}_${s.start_time || s.startTime}`));
          return uniqueKeys.size === v.length;
        },
        message: "recurring_slots must contain between 1 and 25 unique slots.",
      },
      required: true,
    },
    sessions: {
      type: [RecurringSlotSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED"],
      default: "ACTIVE",
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "childSchedules",
  }
);

// Compound index for fast phone lookup with status
ChildScheduleSchema.index({ parent_phone: 1, status: 1 });
ChildScheduleSchema.index({ therapist_id: 1, status: 1 });

export const ChildScheduleModel =
  (mongoose.models.ChildSchedule as mongoose.Model<IChildSchedule>) ||
  mongoose.model<IChildSchedule>("ChildSchedule", ChildScheduleSchema);
