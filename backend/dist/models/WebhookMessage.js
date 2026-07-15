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
    appointmentDate: { type: String, default: "" },
    appointmentTime: { type: String, default: "" },
    department: { type: String, default: "" },
    concern: { type: String, default: "" },
}, { strict: false, collection: "webhookmessages" });
export const WebhookMessage = mongoose.model("WebhookMessage", WebhookMessageSchema);
