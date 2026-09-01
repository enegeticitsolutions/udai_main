import { useState } from "react";
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  X,
  Sparkles,
  Phone,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiPost } from "../lib/api";
import { getImageUrl } from "../lib/imageUtils";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

type CauseKey = "meal" | "future" | "healthcare" | "education" | "general";

interface CauseOption {
  key: CauseKey;
  title: string;
  shortTitle: string;
  defaultPurpose: string;
  description: string;
  image: string;
  badge: string;
  color: string;
  bgColor: string;
  accentBg: string;
  borderColor: string;
  tagColor: string;
}

const CAUSES: CauseOption[] = [
  {
    key: "meal",
    title: "Nourish a Mind: The Mid Day Meal Initiative",
    shortTitle: "Mid Day Meals",
    defaultPurpose: "Mid-Day Meal Initiative",
    description: "A warm, balanced meal ensures children stay focused and healthy.",
    image: "/images/afterschool.png",
    badge: "Nutrition & Care",
    color: "#c95b38",
    bgColor: "bg-[#fff4df]",
    accentBg: "bg-[#c95b38] hover:bg-[#b94e30]",
    borderColor: "border-[#ead9be]",
    tagColor: "bg-[#f5e3cc] text-[#8c3f25]",
  },
  {
    key: "future",
    title: "Empower a Child: Invest in Their Future",
    shortTitle: "Empower a Child",
    defaultPurpose: "Empower a Child: Future Support",
    description: "Your donation provides immediate relief and long term support for children in need.",
    image: "/images/involved.png",
    badge: "Holistic Development",
    color: "#df4d4d",
    bgColor: "bg-[#dceffd]",
    accentBg: "bg-[#df4d4d] hover:bg-[#cf4141]",
    borderColor: "border-[#b6d8f2]",
    tagColor: "bg-[#cce6fa] text-[#1b5e8c]",
  },
  {
    key: "healthcare",
    title: "Heal & Care: Therapy & Healthcare",
    shortTitle: "Therapy & Health",
    defaultPurpose: "Therapy & Healthcare Support",
    description: "Fund specialized therapy, rehabilitation, and long-term medical care for children.",
    image: "/images/healthcare.png",
    badge: "Rehabilitation",
    color: "#2e7d32",
    bgColor: "bg-[#e6f4ea]",
    accentBg: "bg-[#2e7d32] hover:bg-[#1b5e20]",
    borderColor: "border-[#c2e2cc]",
    tagColor: "bg-[#d0eed8] text-[#1e6124]",
  },
  {
    key: "education",
    title: "Build Skills: Digital & Special Education",
    shortTitle: "Special Education",
    defaultPurpose: "Digital & Special Education Support",
    description: "Empower students with practical technology skills, tools, and vocational training.",
    image: "/images/digital.png",
    badge: "Vocational Skills",
    color: "#7b1fa2",
    bgColor: "bg-[#f3e5f5]",
    accentBg: "bg-[#7b1fa2] hover:bg-[#4a148c]",
    borderColor: "border-[#e1bee7]",
    tagColor: "bg-[#e6cef0] text-[#581575]",
  },
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export function DonationSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCause, setSelectedCause] = useState<CauseKey>("meal");
  const [amount, setAmount] = useState<number | "custom">(1000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pan: "",
    purpose: "Mid-Day Meal Initiative",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeCause = CAUSES.find((c) => c.key === selectedCause) || CAUSES[0];

  const effectiveAmount =
    amount === "custom" ? Number(customAmount) : Number(amount);

  const openDonationModal = (causeKey?: CauseKey) => {
    const targetKey = causeKey || "meal";
    const causeObj = CAUSES.find((c) => c.key === targetKey) || CAUSES[0];
    setSelectedCause(targetKey);
    setFormData((prev) => ({
      ...prev,
      purpose: causeObj.defaultPurpose,
    }));
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSelectCause = (key: CauseKey) => {
    setSelectedCause(key);
    const causeObj = CAUSES.find((c) => c.key === key);
    if (causeObj) {
      setFormData((prev) => ({
        ...prev,
        purpose: causeObj.defaultPurpose,
      }));
    }
  };

  const handleDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
      setFeedback("Please enter a valid donation amount.");
      return;
    }

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setFeedback("Please enter your full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setFeedback("Please enter a valid email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);

      const cleanPhone = formData.phone
        ? formData.phone.replace(/\D/g, "").slice(-10)
        : "";

      const res = await apiPost<any>("/payments/razorpay/create-payment-link", {
        amount: effectiveAmount,
        customerName: formData.name.trim(),
        customerEmail: formData.email.trim(),
        customerPhone: cleanPhone,
        purpose: formData.purpose.trim() || activeCause.defaultPurpose,
        donationCategory: selectedCause,
        callbackUrl: `${window.location.origin}/donation-success`,
        pan: formData.pan.trim(),
      });

      const linkUrl =
        res?.short_url || res?.paymentLinkUrl || res?.data?.short_url;

      if (!linkUrl) {
        throw new Error(
          res?.message || "Failed to create Razorpay Payment Link."
        );
      }

      window.location.href = linkUrl;
    } catch (err) {
      setIsSubmitting(false);
      setFeedback(
        err instanceof Error
          ? err.message
          : "Unable to initiate payment. Please try again."
      );
    }
  };

  return (
    <section
      id="donate"
      className="scroll-mt-32 bg-white pt-20 pb-16 sm:pt-24 sm:pb-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Single Donate Now Button in Right Corner */}
        <div className="mb-10 flex flex-col items-center justify-between gap-4 border-b border-[#ebdcd0] pb-6 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fdf2ea] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#c95b38]">
              <Sparkles className="h-3.5 w-3.5" />
              Make A Difference Today
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#17120f] sm:text-4xl">
              Choose Your Impact
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#665e57] sm:text-base">
              Every contribution helps provide therapeutic care, nutritious meals,
              education, and vocational training for special children.
            </p>
          </div>

          {/* Unified Donate Now Button (Right Corner) */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => openDonationModal()}
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#c95b38] px-7 py-3.5 text-base font-semibold text-white shadow-[0_12px_24px_rgba(201,91,56,0.28)] transition hover:bg-[#b94e30] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Heart className="h-5 w-5 fill-white text-white" />
              <span>Donate Now</span>
            </button>
          </div>
        </div>

        {/* 4 Cards Grid - Clean, without individual buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch"
        >
          {CAUSES.map((cause) => (
            <article
              key={cause.key}
              onClick={() => openDonationModal(cause.key)}
              className={`group flex flex-col justify-between overflow-hidden rounded-2xl ${cause.bgColor} p-4 sm:p-5 shadow-[0_12px_30px_rgba(0,0,0,0.06)] border ${cause.borderColor} transition hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 cursor-pointer`}
            >
              <div>
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={getImageUrl(cause.image)}
                    alt={cause.title}
                    className="h-44 w-full object-cover transition duration-500 group-hover:scale-105 shadow-sm"
                  />
                  <span
                    className={`absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cause.tagColor} shadow-sm backdrop-blur-md`}
                  >
                    {cause.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold leading-snug text-[#17120f] sm:text-2xl min-h-[56px] flex items-center">
                  {cause.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#3f332c] sm:text-base">
                  {cause.description}
                </p>
              </div>

              {/* Bottom Info on each card */}
              <div className={`mt-5 border-t ${cause.borderColor} pt-4 flex flex-col items-center gap-1.5 text-center text-[11px] text-[#2f4350]`}>
                <div className="flex items-center gap-1.5 font-medium text-[#2f6c3e]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>80G Tax Benefits Available</span>
                </div>
                <p className="text-[11px] text-[#5c524c]">
                  Click card to support this cause
                </p>
              </div>
            </article>
          ))}
        </motion.div>

        {/* Global Assistance and Tax Benefits Footer */}
        <div className="mt-10 rounded-2xl border border-[#eadcd2] bg-[#faf6f2] p-5 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f4ea] text-[#2e7d32]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#17120f]">
                All Donations are Eligible for 50% Tax Deduction under Section 80G
              </p>
              <p className="text-xs text-[#6e635c]">
                Instant 80G receipts will be delivered directly to your email address.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[#4a3e38] sm:mt-0">
            <a
              href="tel:+919899681972"
              className="inline-flex items-center gap-1.5 hover:text-[#c95b38] transition"
            >
              <Phone className="h-3.5 w-3.5 text-[#c95b38]" />
              <span>+91 9899681972</span>
            </a>
            <span className="text-[#d0c2b7]">|</span>
            <a
              href="mailto:info@udairehab.org"
              className="inline-flex items-center gap-1.5 hover:text-[#c95b38] transition"
            >
              <Mail className="h-3.5 w-3.5 text-[#c95b38]" />
              <span>info@udairehab.org</span>
            </a>
          </div>
        </div>
      </div>

      {/* Unified Donation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-[#ebdcd0] max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#f0e4db] px-6 py-4 bg-[#faf6f2]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdf2ea] text-[#c95b38]">
                    <Heart className="h-5 w-5 fill-[#c95b38]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#17120f]">
                      Make a Contribution
                    </h3>
                    <p className="text-xs text-[#70645c]">
                      Empowering differently-abled children & youth
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-full p-1.5 text-[#736861] hover:bg-[#ebdcd0] hover:text-[#17120f] transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form
                onSubmit={handleDonateSubmit}
                className="overflow-y-auto p-6 space-y-5 flex-1"
              >
                {/* Cause Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#665a52] mb-2">
                    Select Cause / Program
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CAUSES.map((cause) => {
                      const isSelected = selectedCause === cause.key;
                      return (
                        <button
                          key={cause.key}
                          type="button"
                          onClick={() => handleSelectCause(cause.key)}
                          className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center text-xs font-semibold transition border ${
                            isSelected
                              ? `border-[#c95b38] bg-[#fff5f0] text-[#c95b38] ring-2 ring-[#c95b38]/20 shadow-sm`
                              : "border-[#e6d8ce] bg-white text-[#4a3e38] hover:bg-[#faf6f2]"
                          }`}
                        >
                          <span>{cause.shortTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#665a52] mb-2">
                    Choose Donation Amount (₹)
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = amount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setAmount(amt);
                            setCustomAmount("");
                            setFeedback(null);
                          }}
                          className={`rounded-xl py-2.5 text-center text-sm font-bold transition border ${
                            isSelected
                              ? "border-[#c95b38] bg-[#c95b38] text-white shadow-md"
                              : "border-[#e6d8ce] bg-white text-[#4a3e38] hover:bg-[#faf6f2]"
                          }`}
                        >
                          ₹{amt.toLocaleString("en-IN")}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Input */}
                  <div className="mt-3">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8a7b72]">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Or enter custom amount in Rupees"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setAmount("custom");
                          setFeedback(null);
                        }}
                        className="pl-8 bg-white border-[#ebdcd0] focus:border-[#c95b38]"
                      />
                    </div>
                  </div>
                </div>

                {/* Donor Details */}
                <div className="space-y-3 pt-1 border-t border-[#f0e4db]">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#665a52]">
                    Donor Details (For 80G Tax Receipt)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Input
                        type="text"
                        placeholder="Full Name *"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        required
                        className="bg-white border-[#ebdcd0]"
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email Address *"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        required
                        className="bg-white border-[#ebdcd0]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Input
                        type="tel"
                        placeholder="Phone Number (optional)"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="bg-white border-[#ebdcd0]"
                      />
                    </div>
                    <div>
                      <Input
                        type="text"
                        placeholder="PAN Card No. (optional for 80G)"
                        value={formData.pan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            pan: e.target.value.toUpperCase(),
                          }))
                        }
                        className="bg-white border-[#ebdcd0]"
                      />
                    </div>
                  </div>

                  <div>
                    <Textarea
                      placeholder="Add a message or dedication (optional)"
                      rows={2}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      className="bg-white border-[#ebdcd0]"
                    />
                  </div>
                </div>

                {/* Error/Feedback message */}
                {feedback && (
                  <div className="rounded-xl border border-[#f5c2c7] bg-[#f8d7da] px-3.5 py-2.5 text-xs font-medium text-[#842029]">
                    {feedback}
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || effectiveAmount <= 0}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c95b38] py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#b94e30] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      "Connecting to Razorpay..."
                    ) : (
                      <>
                        <span>
                          Proceed to Donate ₹
                          {effectiveAmount > 0
                            ? effectiveAmount.toLocaleString("en-IN")
                            : "0"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-[#786b62]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#2e7d32]" />
                    <span>
                      100% Secure Transaction via Razorpay | 80G Tax Exemption
                    </span>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
