import mongoose, { Document, Schema } from "mongoose";

// Step tracking for chatbot conversation flow
export type ChatStep = "ask_name" | "ask_age" | "ask_doctor" | "completed";

export interface IChatbotUser extends Document {
  phone: string;      // WhatsApp phone number (e.g., "919876543210")
  name: string;       // Collected from user
  age: string;        // Collected from user
  doctor: string;     // Preferred doctor/department
  step: ChatStep;     // Current conversation step
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotUserSchema = new Schema<IChatbotUser>(
  {
    phone:  { type: String, required: true, unique: true, trim: true },
    name:   { type: String, default: "" },
    age:    { type: String, default: "" },
    doctor: { type: String, default: "" },
    step:   {
      type: String,
      enum: ["ask_name", "ask_age", "ask_doctor", "completed"],
      default: "ask_name",
    },
  },
  { timestamps: true }
);

export const ChatbotUser = mongoose.model<IChatbotUser>("ChatbotUser", ChatbotUserSchema);
