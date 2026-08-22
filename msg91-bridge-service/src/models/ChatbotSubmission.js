import mongoose from "mongoose";

const ChatbotSubmissionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    // MSG91 sends multiple events (sent, delivered, read) for same transactionId
    // We store each event separately here
    events: {
      type: [
        {
          eventName: { type: String, trim: true },
          statusCode: { type: String, trim: true },
          ts: { type: String, trim: true },
          _id: false,
        },
      ],
      default: [],
    },
    userDetails: {
      name: { type: String, trim: true },
      age: { type: Number, min: 0, max: 120 },
      parentName: { type: String, trim: true },
      problem: { type: String, trim: true },
    },
    source: {
      type: String,
      default: "msg91-webhook",
      trim: true,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ChatbotSubmission = mongoose.model("ChatbotSubmission", ChatbotSubmissionSchema);
