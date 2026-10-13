import mongoose, { Document, Schema } from "mongoose";

export interface IRoutineBooking extends Document {
  bookingId: string;
  phoneNumber: string;
  parent_phone?: string;
  childName: string;
  child_name?: string;
  parentName?: string;
  selectedPackage: string; // e.g. "3 Days booking", "2 Days Booking", "1 Days Booking"
  package: string;
  selectedDays: string;    // e.g. "Monday, Wednesday, Friday"
  selected_days: string;
  booking_date: string;    // YYYY-MM-DD
  appointmentDate?: string;
  appointmentTime?: string;
  department?: string;
  therapy_type?: string;
  therapistName?: string;
  therapistId?: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  paymentStatus: "PAID" | "PENDING" | "FAILED";
  totalSessions: number;
  sessionSchedule?: Array<{
    sessionNumber: number;
    date: string;
    time: string;
    day: string;
  }>;
  feeCharged?: number;
  notes?: string;
  rawPayload?: any;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineBookingSchema = new Schema<IRoutineBooking>(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    parent_phone: {
      type: String,
      index: true,
      trim: true,
    },
    childName: {
      type: String,
      default: "Child",
      trim: true,
    },
    child_name: {
      type: String,
      trim: true,
    },
    parentName: {
      type: String,
      trim: true,
    },
    selectedPackage: {
      type: String,
      required: true,
      trim: true,
    },
    package: {
      type: String,
      required: true,
      trim: true,
    },
    selectedDays: {
      type: String,
      required: true,
      trim: true,
    },
    selected_days: {
      type: String,
      required: true,
      trim: true,
    },
    booking_date: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentDate: {
      type: String,
      trim: true,
    },
    appointmentTime: {
      type: String,
      default: "10:00",
      trim: true,
    },
    department: {
      type: String,
      default: "Occupational Therapy",
      trim: true,
    },
    therapy_type: {
      type: String,
      trim: true,
    },
    therapistName: {
      type: String,
      trim: true,
    },
    therapistId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: "CONFIRMED",
      index: true,
    },
    paymentStatus: {
      type: String,
      default: "PAID",
      index: true,
    },
    totalSessions: {
      type: Number,
      default: 1,
    },
    sessionSchedule: {
      type: [
        {
          sessionNumber: Number,
          date: String,
          time: String,
          day: String,
        },
      ],
      default: [],
    },
    feeCharged: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    rawPayload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: "routineBookings",
  }
);

RoutineBookingSchema.index({ phoneNumber: 1, createdAt: -1 });
RoutineBookingSchema.index({ booking_date: 1, status: 1 });

export const RoutineBookingModel =
  (mongoose.models.RoutineBooking as mongoose.Model<IRoutineBooking>) ||
  mongoose.model<IRoutineBooking>("RoutineBooking", RoutineBookingSchema);
