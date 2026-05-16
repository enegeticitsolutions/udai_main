import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send } from "lucide-react";
import { apiPost } from "../lib/api";

interface WhatsAppBookingFormProps {
  onClose: () => void;
}

export function WhatsAppBookingForm({ onClose }: WhatsAppBookingFormProps) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setStatus("loading");
    try {
      await apiPost("/whatsapp/book-appointment", { phone });
      setStatus("success");
      setTimeout(onClose, 3000);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Something went wrong");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
        >
          <X className="size-6" />
        </button>

        {status === "success" ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <Send className="size-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">Request Sent!</h3>
            <p className="mt-2 text-gray-600">
              Check your WhatsApp for a confirmation message from UDAI.
            </p>
          </div>
        ) : (
          <>
            <h3 className="mb-2 text-2xl font-semibold text-gray-900">Book via WhatsApp</h3>
            <p className="mb-6 text-gray-600">
              Enter your WhatsApp number to receive an official booking request from UDAI.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#ef3c32]/20"
                />
              </div>

              {status === "error" && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef3c32] py-3 font-semibold text-white transition hover:bg-[#da2f26] disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Send Booking Request"}
                <Send className="size-4" />
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
