import { useState } from "react";
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
import { apiPost } from "../lib/api";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

type DonationType = "one-time" | "monthly";
type DonationStage = "amount" | "details" | "payment";
type PaymentMethod = "qr" | "upi" | "netbanking" | "card";
type DonationCategory = "meal" | "future";
type AmountOption = { amount: number | null; meals?: number };

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
  title,
  description,
  options,
  defaultAmount,
  allowMonthly = false,
  accentClass,
  selectedClass,
}: {
  category: DonationCategory;
  title: string;
  description: string;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qr");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    purpose: category === "meal" ? "Mid-Day Meal Initiative" : "Monthly support",
    message: "",
  });
  const [paymentForm, setPaymentForm] = useState(getInitialPaymentForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveAmount = selectedAmount ?? Number(customAmount);
  const amountLabel = effectiveAmount > 0 ? `₹${effectiveAmount}` : "";
  const donationLabel = `${amountLabel}${donationType === "monthly" ? " Monthly" : ""}`;
  const selectedMeals = options.find((option) => option.amount === selectedAmount)?.meals;
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
  const requiresThousandMultiple = category === "future";

  function isValidAmount(amount: number) {
    return Number.isFinite(amount) && amount > 0 && (!requiresThousandMultiple || amount % 1000 === 0);
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
      setFeedback(requiresThousandMultiple ? "Please enter an amount in multiples of ₹1000." : "Please enter a valid custom amount.");
      return;
    }

    setFeedback(null);
    setStage("details");
  }

  async function completeDonation() {
    try {
      if (!isValidAmount(effectiveAmount)) {
        setFeedback(requiresThousandMultiple ? "Please enter an amount in multiples of ₹1000." : "Please enter a valid amount.");
        return;
      }

      if (paymentMethod === "upi" && !paymentForm.upiId.trim()) {
        setFeedback("Please enter your UPI ID.");
        return;
      }

      if (paymentMethod === "netbanking" && !paymentForm.bank.trim()) {
        setFeedback("Please select a bank.");
        return;
      }

      if (
        paymentMethod === "card" &&
        (!paymentForm.cardName.trim() ||
          !paymentForm.cardNumber.trim() ||
          !paymentForm.cardExpiry.trim() ||
          !paymentForm.cardCvv.trim())
      ) {
        setFeedback("Please complete the card details.");
        return;
      }

      setIsSubmitting(true);
      await apiPost("/forms/donations", {
        ...formData,
        amount: effectiveAmount,
        currency: "INR",
        purpose: formData.purpose || purpose,
        paymentMethod,
        donationCategory: category,
        campaignName:
          category === "meal"
            ? "Nourish a Mind: The Mid-Day Meal Initiative"
            : "Invest in Their Future",
        meals: category === "meal" ? selectedMeals : undefined,
      });
      setFeedback(`Donation recorded! A confirmation email has been sent to ${formData.email}`);
      setStage("amount");
      setSelectedAmount(defaultAmount);
      setCustomAmount("");
      setFormData({
        name: "",
        email: "",
        purpose,
        message: "",
      });
      setPaymentForm(getInitialPaymentForm());
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to submit donation");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="text-center">
        <Heart className="mx-auto h-7 w-7 text-[#a66a45]" strokeWidth={1.8} />
        <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#17120f]">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-xs font-medium leading-5 text-[#30343a]">{description}</p>
      </div>

      {allowMonthly ? (
        <div className="mx-auto mt-4 flex w-full max-w-[320px] rounded-full bg-[#ffe8c7] p-1 shadow-inner">
          {(["one-time", "monthly"] as DonationType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => selectDonationType(type)}
              className={`flex-1 rounded-full px-4 py-2 text-[11px] font-semibold transition ${
                donationType === type ? "bg-white text-[#8b4d34] shadow-sm" : "text-[#8f6f52]"
              }`}
            >
              {type === "one-time" ? "Give Once" : "Monthly"}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-[#74777d]">
        <span>Step {stage === "amount" ? "1" : stage === "details" ? "2" : "3"} of 3</span>
        <span>{donationLabel || "Choose amount"}</span>
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
              min={requiresThousandMultiple ? "1000" : "1"}
              step={requiresThousandMultiple ? "1000" : "1"}
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder={requiresThousandMultiple ? "Enter amount, e.g. 1000" : "Enter custom amount"}
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
          <Input value={formData.purpose} onChange={(event) => setFormData((current) => ({ ...current, purpose: event.target.value }))} placeholder="Purpose" />
          <Textarea value={formData.message} onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))} placeholder="Message (optional)" rows={3} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStage("amount")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#bdd8ed] bg-white/50 px-4 py-2.5 text-xs font-semibold text-[#334a5c] transition hover:bg-white">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.name.trim() || !formData.email.trim()) {
                  setFeedback("Please fill in your name and email.");
                  return;
                }
                setFeedback(null);
                setStage("payment");
              }}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-white transition ${accentClass}`}
            >
              Pay <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {stage === "payment" ? (
        <div className="mt-3 space-y-3">
          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-[1.2rem] bg-white/60 p-1 text-xs min-[420px]:grid-cols-4">
              <TabsTrigger value="qr">QR</TabsTrigger>
              <TabsTrigger value="upi">UPI</TabsTrigger>
              <TabsTrigger value="netbanking">Bank</TabsTrigger>
              <TabsTrigger value="card">Card</TabsTrigger>
            </TabsList>
            <TabsContent value="qr" className="mt-3">
              <div className="rounded-xl border border-[#ddd8d1] bg-[#fffaf8] p-3 text-center">
                <QrCode className="mx-auto size-14 text-[#2f5597]" />
                <p className="mt-2 text-xs text-[#776a66]">Scan from your banking app.</p>
              </div>
            </TabsContent>
            <TabsContent value="upi" className="mt-3">
              <div className="rounded-xl border border-[#ddd8d1] bg-[#fffaf8] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Smartphone className="h-4 w-4 text-[#2f5597]" /> Pay via UPI</div>
                <Input className="mt-3" value={paymentForm.upiId} onChange={(event) => setPaymentForm((current) => ({ ...current, upiId: event.target.value }))} placeholder="yourname@upi" />
              </div>
            </TabsContent>
            <TabsContent value="netbanking" className="mt-3">
              <div className="rounded-xl border border-[#ddd8d1] bg-[#fffaf8] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Landmark className="h-4 w-4 text-[#2f5597]" /> Net Banking</div>
                <select value={paymentForm.bank} onChange={(event) => setPaymentForm((current) => ({ ...current, bank: event.target.value }))} className="mt-3 w-full rounded-xl border border-[#ddd8d1] bg-white px-3 py-2 text-xs outline-none">
                  <option value="">Select bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                </select>
              </div>
            </TabsContent>
            <TabsContent value="card" className="mt-3">
              <div className="rounded-xl border border-[#ddd8d1] bg-[#fffaf8] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4 text-[#2f5597]" /> Debit / Credit Card</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input value={paymentForm.cardName} onChange={(event) => setPaymentForm((current) => ({ ...current, cardName: event.target.value }))} placeholder="Cardholder name" />
                  <Input value={paymentForm.cardNumber} onChange={(event) => setPaymentForm((current) => ({ ...current, cardNumber: event.target.value }))} placeholder="Card number" />
                  <Input value={paymentForm.cardExpiry} onChange={(event) => setPaymentForm((current) => ({ ...current, cardExpiry: event.target.value }))} placeholder="Expiry MM/YY" />
                  <Input value={paymentForm.cardCvv} onChange={(event) => setPaymentForm((current) => ({ ...current, cardCvv: event.target.value }))} placeholder="CVV" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStage("details")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#bdd8ed] bg-white/50 px-4 py-2.5 text-xs font-semibold text-[#334a5c] transition hover:bg-white">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button type="button" onClick={completeDonation} disabled={isSubmitting} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-white transition disabled:opacity-70 ${accentClass}`}>
              {isSubmitting ? "Processing..." : "Complete"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? <div className="mt-3 rounded-xl border border-[#bddcc3] bg-[#edf8ef] px-3 py-2 text-xs text-[#2f6c3e]">{feedback}</div> : null}

      <div className="mt-4 flex flex-col items-center gap-2 text-center text-[11px] text-[#2f4350]">
        <div className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-[#2f6c3e]" /><span>80G Tax Benefits Available</span></div>
        <p className="leading-4">For assistance, contact us at:<br /><strong>+91 - 9899681972</strong> | <strong>info@udairehab.org</strong></p>
      </div>
    </div>
  );
}

export function DonationSection() {
  return (
    <section id="donate" className="scroll-mt-40 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-center text-3xl font-semibold tracking-tight text-[#17120f] sm:text-4xl">Choose Your Impact</h2>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="grid gap-6 lg:grid-cols-2">
          <article className="overflow-hidden rounded-2xl bg-[#fff4df] p-3 shadow-[0_18px_34px_rgba(72,49,25,0.12)] sm:p-5">
            <div className="grid gap-5 md:grid-cols-[0.95fr_1fr] lg:grid-cols-1 xl:grid-cols-[0.95fr_1fr]">
              <div>
                <img src="/images/afterschool.png" alt="Children supported by UDAI programs" className="h-40 w-full rounded-xl object-cover shadow-[0_10px_22px_rgba(45,31,20,0.14)] sm:h-48" />
                <h3 className="mt-4 text-xl font-semibold leading-tight text-[#17120f] sm:mt-5 sm:text-2xl">Nourish a Mind: The Mid-Day Meal Initiative</h3>
                <p className="mt-3 text-sm leading-6 text-[#3f332c] sm:text-base sm:leading-7">A warm, balanced meal ensures children stay focused and healthy.</p>

              </div>
              <div className="border-[#ead9be] md:border-l md:pl-5 lg:border-l-0 lg:pl-0 xl:border-l xl:pl-5">
                <DonationPanel category="meal" title="Mid-Day Meal Initiative" description="Support balanced meals for children in need." options={mealAmountOptions} defaultAmount={1000} accentClass="bg-[#c95b38] hover:bg-[#b94e30]" selectedClass="border-[#c95b38] bg-white text-[#c95b38] shadow-sm" />
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl bg-[#dceffd] p-3 shadow-[0_18px_34px_rgba(28,69,100,0.12)] sm:p-5">
            <div className="grid gap-5 md:grid-cols-[0.95fr_1fr] lg:grid-cols-1 xl:grid-cols-[0.95fr_1fr]">
              <div>
                <img src="/images/involved.png" alt="Children learning together" className="h-40 w-full rounded-xl object-cover shadow-[0_10px_22px_rgba(28,69,100,0.14)] sm:h-48" />
                <h3 className="mt-4 text-xl font-semibold leading-tight text-[#17120f] sm:mt-5 sm:text-3xl">Empower a Child: Invest in Their Future</h3>
                <p className="mt-3 text-sm leading-6 text-[#252525] sm:text-base sm:leading-7">Your donation provides immediate relief and long-term support for children in need.</p>
              </div>
              <DonationPanel category="future" title="Invest in Their Future" description="Every rupee counts toward long-term support for children in need." options={futureAmountOptions} defaultAmount={1000} allowMonthly accentClass="bg-[#df4d4d] hover:bg-[#cf4141]" selectedClass="border-[#d2a885] bg-[#fff1df] text-[#8b4d34] shadow-sm" />
            </div>
          </article>
        </motion.div>
      </div>
    </section>
  );
}
