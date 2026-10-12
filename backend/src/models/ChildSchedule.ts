import mongoose, { Document, Schema } from "mongoose";

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface IRecurringSlot {
  day_of_week: DayOfWeek;
  start_time: string; // e.g. "10:00"
  end_time: string;   // e.g. "10:45"
}

export interface IChildSchedule extends Document {
  child_name: string;
  parent_phone: string;
  therapist_id: string;
  therapy_type: string;
  recurring_slots: IRecurringSlot[];
  status: "ACTIVE" | "PAUSED";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringSlotSchema = new Schema<IRecurringSlot>(
  {
    day_of_week: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      required: true,
    },
    start_time: {
      type: String,
      required: true,
      trim: true,
    },
    end_time: {
      type: String,
      required: true,
      trim: true,
    },
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
      required: true,
      trim: true,
      index: true,
    },
    therapy_type: {
      type: String,
      required: true,
      trim: true,
    },
    recurring_slots: {
      type: [RecurringSlotSchema],
      validate: {
        validator: function (v: IRecurringSlot[]) {
          return Array.isArray(v) && v.length >= 1 && v.length <= 3;
        },
        message: "recurring_slots must contain between 1 and 3 slots.",
      },
      required: true,
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
