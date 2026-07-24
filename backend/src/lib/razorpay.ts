import Razorpay from "razorpay";
import { config } from "../config.js";

export function getRazorpayInstance(): Razorpay {
  const keyId = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";

  if (!keyId || !keySecret) {
    console.warn("⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in environment.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export const razorpay = getRazorpayInstance();
