import mongoose from "mongoose";

/**
 * WebhookMessage — flexible schema to capture any incoming MSG91 webhook payload.
 * `strict: false` allows storing arbitrary fields beyond `rawData`.
 */
const WebhookMessageSchema = new mongoose.Schema(
  {
    rawData: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { strict: false, collection: "webhookmessages" }
);

export const WebhookMessage = mongoose.model("WebhookMessage", WebhookMessageSchema);
