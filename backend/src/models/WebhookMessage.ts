import mongoose from "mongoose";

export interface IWebhookMessage {
  _id?: any;
  rawData: any;
  receivedAt?: Date;
  phone?: string;
  childName?: string;
  parentName?: string;
  age?: string;
  firstSession?: string;
  isFirstSession?: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
  department?: string;
  concern?: string;
  /** ID of the assigned therapist (TherapistModel._id as string) */
  assignedTherapistId?: string;
  /** Display name of the assigned therapist */
  assignedTherapist?: string;
  /** Booking status: pending | confirmed | cancelled */
  status?: string;
  /** Origin of the booking: whatsapp | form | admin */
  bookingSource?: string;
  paymentUrl?: string;
  razorpayPaymentLinkId?: string;
  paymentStatus?: string;
}

/**
 * WebhookMessage — flexible schema to capture any incoming MSG91 webhook payload.
 * `strict: false` allows storing arbitrary fields beyond `rawData`.
 */
const WebhookMessageSchema = new mongoose.Schema<IWebhookMessage>(
  {
    rawData: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now },
    phone: { type: String, default: "" },
    childName: { type: String, default: "" },
    parentName: { type: String, default: "" },
    age: { type: String, default: "" },
    firstSession: { type: String, default: "" },
    isFirstSession: { type: Boolean, default: true },
    appointmentDate: { type: String, default: "" },
    appointmentTime: { type: String, default: "" },
    department: { type: String, default: "" },
    concern: { type: String, default: "" },
    assignedTherapistId: { type: String, default: "" },
    assignedTherapist: { type: String, default: "" },
    status: { type: String, default: "pending" },
    bookingSource: { type: String, default: "" },
    paymentUrl: { type: String, default: "" },
    razorpayPaymentLinkId: { type: String, default: "" },
    paymentStatus: { type: String, default: "pending" },
  },
  { strict: false, collection: "webhookmessages" }
);

export const WebhookMessage = mongoose.model<IWebhookMessage>("WebhookMessage", WebhookMessageSchema);
