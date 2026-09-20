import mongoose from "mongoose";
/**
 * WebhookMessage — flexible schema to capture any incoming MSG91 webhook payload.
 * `strict: false` allows storing arbitrary fields beyond `rawData`.
 */
const WebhookMessageSchema = new mongoose.Schema({
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
    session_frequency: { type: String, default: "" },
    totalSessions: { type: Number, default: 1 },
    sessionSchedule: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sessionScheduleText: { type: String, default: "" },
    feeCharged: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
}, { strict: false, collection: "webhookmessages" });
export const WebhookMessage = mongoose.model("WebhookMessage", WebhookMessageSchema);
