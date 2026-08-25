import Razorpay from "razorpay";
import { config } from "../config.js";
export function getRazorpayInstance() {
    const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "dummy_key";
    const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
    if (keyId === "dummy_key" || keySecret === "dummy_secret") {
        console.warn("⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in environment.");
    }
    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}
export const razorpay = getRazorpayInstance();
