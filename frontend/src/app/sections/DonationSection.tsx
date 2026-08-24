import { useCallback, useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Heart,
  Landmark,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { motion } from "motion/react";
import { apiGet, apiPost } from "../lib/api";
import { getImageUrl } from "../lib/imageUtils";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on?: (event: string, callback: (response: any) => void) => void;
    };
  }
}

type DonationType = "one-time" | "monthly";
type DonationStage = "amount" | "details" | "payment";
type PaymentMethod = "qr" | "upi" | "netbanking" | "card";
type DonationCategory = "meal" | "future";
type AmountOption = { amount: number | null; meals?: number };

type DynamicQrCodeData = {
  id: string;
  status: string;
  imageUrl: string;
  imageContent?: string;
  amount: number;
  currency: string;
  localOrderId: string;
  orderNumber: string;
  isFallback?: boolean;
};

type RazorpayCreateResponse = {
  order: any;
  razorpay: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
  };
};

const mealAmountOptions: AmountOption[] = [
  { amount: 1000, meals: 5 },
  { amount: 1500, meals: 12 },
  { amount: 2000, meals: 25 },
  { amount: 5000, meals: 50 },
  { amount: null },
];

const futureAmountOptions: AmountOption[] = [
  { amount: 1000 },
  { amount: 2000 },
  { amount: 3000 },
  { amount: 4000 },
  { amount: 5000 },
  { amount: null },
];

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window !== "undefined" && typeof (window as any).Razorpay !== "undefined") {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getInitialPaymentForm() {
  return {
    upiId: "",
    bank: "",
    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  };
}

function DonationPanel({
  category,
  options,
  defaultAmount,
  allowMonthly = false,
  accentClass,
  selectedClass,
}: {
  category: DonationCategory;
  options: AmountOption[];
  defaultAmount: number;
  allowMonthly?: boolean;
  accentClass: string;
  selectedClass: string;
}) {
  const [donationType, setDonationType] = useState<DonationType>(allowMonthly ? "monthly" : "one-time");
  const [stage, setStage] = useState<DonationStage>("amount");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(defaultAmount);
  const [customAmount, setCustomAmount] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    purpose: category === "meal" ? "Mid-Day Meal Initiative" : "Monthly support",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveAmount = selectedAmount ?? Number(customAmount);
  const amountLabel = effectiveAmount > 0 ? `₹${effectiveAmount}` : "";
  const donationLabel = `${amountLabel}${donationType === "monthly" ? " Monthly" : ""}`;
  const purpose =
    category === "meal"
      ? "Mid-Day Meal Initiative"
      : donationType === "monthly"
        ? "Monthly support"
        : "One-time donation";
  const actionLabel =
    category === "meal"
      ? `Donate ${amountLabel || "Custom Amount"} for Meals`
      : `Donate ${donationLabel || "Custom Amount"}`;

  function isValidAmount(amount: number) {
    return Number.isFinite(amount) && amount > 0;
  }

  function selectDonationType(nextType: DonationType) {
    setDonationType(nextType);
    setSelectedAmount(defaultAmount);
    setCustomAmount("");
    setFormData((current) => ({ ...current, purpose: nextType === "monthly" ? "Monthly support" : "One-time donation" }));
    setFeedback(null);
  }

  function continueDonation() {
    if (!isValidAmount(effectiveAmount)) {
      setFeedback("Please enter a valid donation amount.");
      return;
    }

    setFeedback(null);
    setStage("details");
  }

  function validateDetails() {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setFeedback("Please enter your full name (at least 2 characters).");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setFeedback("Please enter a valid email address.");
      return false;
    }

    return true;
  }

  async function handleDonateClick() {
    try {
      if (!isValidAmount(effectiveAmount)) {
        setFeedback("Please enter a valid donation amount.");
        return;
      }
      if (!validateDetails()) {
        return;
      }

      setIsSubmitting(true);
      setFeedback(null);

      const cleanPhone = formData.phone ? formData.phone.replace(/\D/g, "").slice(-10) : "";
      const res = await apiPost<any>("/payments/razorpay/create-payment-link", {
        amount: effectiveAmount,
        customerName: formData.name.trim(),
        customerEmail: formData.email.trim(),
        customerPhone: cleanPhone,
        purpose: formData.purpose.trim() || purpose,
        donationCategory: category,
        callbackUrl: `${window.location.origin}/donation-success`,
      });

      const linkUrl = res?.short_url || res?.paymentLinkUrl || res?.data?.short_url;

      if (!linkUrl) {
        throw new Error(res?.message || "Failed to create Razorpay Payment Link.");
      }

      window.location.href = linkUrl;
    } catch (err) {
      setIsSubmitting(false);
      setFeedback(err instanceof Error ? err.message : "Unable to initiate payment link.");
    }
  }

  return (
    <div className="w-full flex flex-col justify-between">
      <div>
        {allowMonthly ? (
          <div className="flex rounded-full bg-white/70 p-1 text-xs font-semibold text-[#54463e] border border-[#e4d7c5]">
            <button
              type="button"
              onClick={() => selectDonationType("one-time")}
              className={`flex-1 rounded-full py-1.5 transition ${donationType === "one-time" ? "bg-[#54463e] text-white shadow-sm" : ""}`}
            >
              One-time
            </button>
            <button
              type="button"
              onClick={() => selectDonationType("monthly")}
              className={`flex-1 rounded-full py-1.5 transition ${donationType === "monthly" ? "bg-[#54463e] text-white shadow-sm" : ""}`}
            >
              Monthly
            </button>
          </div>
        ) : null}
      </div>

      {stage === "amount" ? (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
            {options.map((option) => {
              const label = option.amount === null ? "Custom" : `₹${option.amount}`;
              const isSelected = option.amount === null ? selectedAmount === null : selectedAmount === option.amount;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(option.amount);
                    if (option.amount !== null) setCustomAmount("");
                    setFeedback(null);
                  }}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    isSelected ? selectedClass : "border-transparent bg-white text-[#20242a] shadow-sm hover:bg-[#fff8f0]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {selectedAmount === null ? (
            <Input
              type="number"
              min="1"
              step="1"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder="Enter custom donation amount"
              className="mt-3 border-transparent bg-white"
            />
          ) : null}

          <button
            type="button"
            onClick={continueDonation}
            className={`mt-4 w-full rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(201,91,56,0.22)] transition ${accentClass}`}
          >
            {actionLabel}
          </button>
        </div>
      ) : null}

      {stage === "details" ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl bg-[#fff6f1] px-4 py-2.5 text-xs text-[#5e5048]">
            Selected donation: <span className="font-semibold text-[#2b1b15]">{actionLabel.replace("Donate ", "")}</span>
          </div>
          <Input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" />
          <Input type="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" />
          <Input type="tel" value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} placeholder="Mobile number (optional)" />
          <Input value={formData.purpose} onChange={(event) => setFormData((current) => ({ ...current, purpose: event.target.value }))} placeholder="Purpose" />
          <Textarea value={formData.message} onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))} placeholder="Message (optional)" rows={2} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStage("amount")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#bdd8ed] bg-white/50 px-4 py-2.5 text-xs font-semibold text-[#334a5c] transition hover:bg-white">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={handleDonateClick}
              disabled={isSubmitting}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-white transition disabled:opacity-70 ${accentClass}`}
            >
              {isSubmitting ? "Redirecting to Razorpay..." : "Donate Now"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-medium ${
            feedback.toLowerCase().includes("thank you") || feedback.toLowerCase().includes("completed") || feedback.toLowerCase().includes("recorded")
              ? "border-[#bddcc3] bg-[#edf8ef] text-[#2f6c3e]"
              : "border-[#f5c2c7] bg-[#f8d7da] text-[#842029]"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col items-center gap-2 text-center text-[11px] text-[#2f4350]">
        <div className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-[#2f6c3e]" /><span>80G Tax Benefits Available</span></div>
        <p className="leading-4">For assistance, contact us at:<br /><strong>+91 9899681972</strong> | <strong>info@udairehab.org</strong></p>
      </div>
    </div>
  );
}

export function DonationSection() {
  return (
    <section id="donate" className="scroll-mt-32 bg-white pt-24 pb-10 sm:pt-28 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight text-[#17120f] sm:text-4xl">Choose Your Impact</h2>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {/* COLUMN 1 */}
          <article className="flex flex-col justify-between overflow-hidden rounded-2xl bg-[#fff4df] p-4 shadow-[0_18px_34px_rgba(72,49,25,0.12)] sm:p-5">
            <div>
              <img src={getImageUrl("/images/afterschool.png")} alt="Children supported by UDAI programs" className="h-44 w-full rounded-xl object-cover shadow-[0_10px_22px_rgba(45,31,20,0.14)]" />
              <h3 className="mt-4 text-xl font-semibold leading-tight text-[#17120f] sm:mt-5 sm:text-2xl min-h-[56px] flex items-center">Nourish a Mind: The Mid Day Meal Initiative</h3>
              <p className="mt-3 text-sm leading-6 text-[#3f332c] sm:text-base sm:leading-7">A warm, balanced meal ensures children stay focused and healthy.</p>
            </div>
            <div className="mt-5 border-t border-[#ead9be] pt-5">
              <DonationPanel category="meal" options={mealAmountOptions} defaultAmount={1000} accentClass="bg-[#c95b38] hover:bg-[#b94e30]" selectedClass="border-[#c95b38] bg-white text-[#c95b38] shadow-sm" />
            </div>
          </article>

          {/* COLUMN 2 */}
          <article className="flex flex-col justify-between overflow-hidden rounded-2xl bg-[#dceffd] p-4 shadow-[0_18px_34px_rgba(28,69,100,0.12)] sm:p-5">
            <div>
              <img src={getImageUrl("/images/involved.png")} alt="Children learning together" className="h-44 w-full rounded-xl object-cover shadow-[0_10px_22px_rgba(28,69,100,0.14)]" />
              <h3 className="mt-4 text-xl font-semibold leading-tight text-[#17120f] sm:mt-5 sm:text-2xl min-h-[56px] flex items-center">Empower a Child: Invest in Their Future</h3>
              <p className="mt-3 text-sm leading-6 text-[#252525] sm:text-base sm:leading-7">Your donation provides immediate relief and long term support for children in need.</p>
            </div>
            <div className="mt-5 border-t border-[#b6d8f2] pt-5">
              <DonationPanel category="future" options={futureAmountOptions} defaultAmount={1000} allowMonthly accentClass="bg-[#df4d4d] hover:bg-[#cf4141]" selectedClass="border-[#d2a885] bg-[#fff1df] text-[#8b4d34] shadow-sm" />
            </div>
          </article>

          {/* COLUMN 3 */}
          <article className="flex flex-col justify-between overflow-hidden rounded-2xl bg-[#e6f4ea] p-4 shadow-[0_18px_34px_rgba(30,75,45,0.12)] sm:p-5">
            <div>
              <img src={getImageUrl("/images/healthcare.png")} alt="Healthcare and therapy support" className="h-44 w-full rounded-xl object-cover shadow-[0_10px_22px_rgba(30,75,45,0.14)]" />
              <h3 className="mt-4 text-xl font-semibold leading-tight text-[#17120f] sm:mt-5 sm:text-2xl min-h-[56px] flex items-center">Heal & Care: Therapy & Healthcare</h3>
              <p className="mt-3 text-sm leading-6 text-[#253f2c] sm:text-base sm:leading-7">Fund specialized therapy, rehabilitation, and long-term medical care for children.</p>
            </div>
            <div className="mt-5 border-t border-[#c2e2cc] pt-5">
              <DonationPanel category="future" options={futureAmountOptions} defaultAmount={1000} allowMonthly accentClass="bg-[#2e7d32] hover:bg-[#1b5e20]" selectedClass="border-[#2e7d32] bg-white text-[#2e7d32] shadow-sm" />
            </div>
          </article>

          {/* COLUMN 4 */}
          <article className="flex flex-col justify-between overflow-hidden rounded-2xl bg-[#f3e5f5] p-4 shadow-[0_18px_34px_rgba(75,30,90,0.12)] sm:p-5">
            <div>
              <img src={getImageUrl("/images/digital.png")} alt="Digital literacy and skill building" className="h-44 w-full rounded-xl object-cover shadow-[0_10px_22px_rgba(75,30,90,0.14)]" />
              <h3 className="mt-4 text-xl font-semibold leading-tight text-[#17120f] sm:mt-5 sm:text-2xl min-h-[56px] flex items-center">Build Skills: Digital & Special Education</h3>
              <p className="mt-3 text-sm leading-6 text-[#3b2545] sm:text-base sm:leading-7">Empower students with practical technology skills, tools, and vocational training.</p>
            </div>
            <div className="mt-5 border-t border-[#e1bee7] pt-5">
              <DonationPanel category="future" options={futureAmountOptions} defaultAmount={1000} allowMonthly accentClass="bg-[#7b1fa2] hover:bg-[#4a148c]" selectedClass="border-[#7b1fa2] bg-white text-[#7b1fa2] shadow-sm" />
            </div>
          </article>
        </motion.div>
      </div>
    </section>
  );
}
