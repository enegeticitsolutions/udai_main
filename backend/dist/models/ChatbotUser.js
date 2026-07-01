import mongoose, { Schema } from "mongoose";
const ChatbotUserSchema = new Schema({
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: "" },
    age: { type: String, default: "" },
    doctor: { type: String, default: "" },
    step: {
        type: String,
        enum: ["ask_name", "ask_age", "ask_doctor", "completed"],
        default: "ask_name",
    },
}, { timestamps: true });
export const ChatbotUser = mongoose.model("ChatbotUser", ChatbotUserSchema);
