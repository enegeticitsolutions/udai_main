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

const amountOptions = [500, 1000, 1500, 2000, 2500, null];

export function DonationSection() {
  const [donationType, setDonationType] = useState<DonationType>("monthly");
  const [stage, setStage] = useState<DonationStage>("amount");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qr");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    purpose: "Monthly support",
    message: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    upiId: "",
    bank: "",
    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveAmount = selectedAmount ?? Number(customAmount);
  const amountLabel = effectiveAmount > 0 ? `₹${effectiveAmount}` : "";
  const donationLabel = `${amountLabel}${donationType === "monthly" ? " Monthly" : " Now"}`;
  const amountTone = donationType === "monthly" ? "bg-[#fff3ed]" : "bg-[#fff6f1]";

  async function completeDonation() {
    try {
      if (!effectiveAmount || Number.isNaN(effectiveAmount) || effectiveAmount <= 0) {
        setFeedback("Please enter a valid amount.");
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

      if (paymentMethod === "card") {
        if (
          !paymentForm.cardName.trim() ||
          !paymentForm.cardNumber.trim() ||
          !paymentForm.cardExpiry.trim() ||
          !paymentForm.cardCvv.trim()
        ) {
          setFeedback("Please complete the card details.");
          return;
        }
      }

      setIsSubmitting(true);
      await apiPost("/forms/donations", {
        ...formData,
        amount: effectiveAmount,
        currency: "INR",
        purpose: formData.purpose || (donationType === "monthly" ? "Monthly support" : "One-time donation"),
        paymentMethod,
      });
      setFeedback("Donation recorded! A confirmation email with your 80G tax benefit details has been sent to " + formData.email);
      setStage("amount");
      setFormData({
        name: "",
        email: "",
        purpose: donationType === "monthly" ? "Monthly support" : "One-time donation",
        message: "",
      });
      setPaymentForm({
        upiId: "",
        bank: "",
        cardName: "",
        cardNumber: "",
        cardExpiry: "",
        cardCvv: "",
      });
      setCustomAmount("");
      setSelectedAmount(500);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Unable to submit donation");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="donate" className="scroll-mt-40 bg-[#f2f1ef] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-[620px] overflow-hidden rounded-[1.6rem] bg-white shadow-[0_20px_40px_rgba(56,39,28,0.12)]"
        >
          <div className="px-8 py-10 sm:px-14 sm:py-12">
            <div className="text-center">
              <Heart className="mx-auto h-10 w-10 text-[#d96d4b]" />
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[#2b1b15]">
                Invest in Their Future
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-8 text-[#7b6e68]">
                Your donation provides immediate relief and long-term support for children in need. Every rupee counts.
              </p>
            </div>

            <div className="mx-auto mt-8 flex w-full max-w-xs rounded-full bg-[#fff3ed] p-1">
              <button
                type="button"
                onClick={() => {
                  setDonationType("one-time");
                  setSelectedAmount(500);
                  setCustomAmount("");
                  setFormData((current) => ({ ...current, purpose: "One-time donation" }));
                  setFeedback(null);
                }}
                className={`flex-1 rounded-full px-5 py-2 text-xs font-semibold transition ${
                  donationType === "one-time"
                    ? "bg-white text-[#d96d4b] shadow-sm"
                    : "text-[#8f7f77]"
                }`}
              >
                Give Once
              </button>
              <button
                type="button"
                onClick={() => {
                  setDonationType("monthly");
                  setSelectedAmount(500);
                  setCustomAmount("");
                  setFormData((current) => ({ ...current, purpose: "Monthly support" }));
                  setFeedback(null);
                }}
                className={`flex-1 rounded-full px-5 py-2 text-xs font-semibold transition ${
                  donationType === "monthly"
                    ? "bg-white text-[#d96d4b] shadow-sm"
                    : "text-[#8f7f77]"
                }`}
              >
                Monthly
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#b99b8f]">
              <span>Step {stage === "amount" ? "1" : stage === "details" ? "2" : "3"} of 3</span>
              <span>{donationLabel || "Choose amount"}</span>
            </div>

            {stage === "amount" ? (
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-3">
                  {amountOptions.map((amount) => {
                    const label = amount === null ? "Custom" : `₹${amount}`;
                    const isSelected = amount !== null && selectedAmount === amount;

                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          if (amount === null) {
                            setSelectedAmount(null);
                            return;
                          }

                          setSelectedAmount(amount);
                          setCustomAmount("");
                        }}
                        className={`rounded-xl border px-4 py-4 text-sm font-semibold transition ${
                          isSelected
                            ? "border-[#f07b59] bg-[#fff6f1] text-[#d96d4b]"
                            : "border-[#e8e1db] text-[#8a7a72] hover:bg-[#faf7f5]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {selectedAmount === null ? (
                  <div className="mt-4">
                    <Input
                      type="number"
                      min="1"
                      value={customAmount}
                      onChange={(event) => setCustomAmount(event.target.value)}
                      placeholder="Enter custom amount"
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (selectedAmount === null && (!customAmount || Number(customAmount) <= 0)) {
                      setFeedback("Please enter a valid custom amount.");
                      return;
                    }

                    setFeedback(null);
                    setStage("details");
                  }}
                  className="mt-7 w-full rounded-full bg-[#ff4b57] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_24px_rgba(255,75,87,0.24)] transition hover:bg-[#f13f4b]"
                >
                  {`Donate ${donationLabel}`}
                </button>
              </div>
            ) : null}

            {stage === "details" ? (
              <div className="mt-6 space-y-4">
                <div className={`rounded-2xl ${amountTone} px-4 py-3 text-sm text-[#5e5048]`}>
                  Selected donation: <span className="font-semibold text-[#2b1b15]">{donationLabel}</span>
                </div>

                <Input
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Full name"
                />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email address"
                />
                <Input
                  value={formData.purpose}
                  onChange={(event) => setFormData((current) => ({ ...current, purpose: event.target.value }))}
                  placeholder="Purpose"
                />
                <Textarea
                  value={formData.message}
                  onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Message (optional)"
                  rows={4}
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStage("amount")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#ddd8d1] px-5 py-3 text-sm font-semibold text-[#5e5048] transition hover:bg-[#faf7f5]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
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
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#ff4b57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#f13f4b]"
                  >
                    Pay
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {stage === "payment" ? (
              <div className="mt-6 space-y-5">
                <div className={`rounded-2xl ${amountTone} px-4 py-3 text-sm text-[#5e5048]`}>
                  Ready to pay for <span className="font-semibold text-[#2b1b15]">{donationLabel}</span>
                </div>

                <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <TabsList className="grid h-auto w-full grid-cols-4 gap-2 rounded-[1.2rem] bg-[#f2ebe6] p-1">
                    <TabsTrigger value="qr" className="rounded-[0.9rem]">
                      QR
                    </TabsTrigger>
                    <TabsTrigger value="upi" className="rounded-[0.9rem]">
                      UPI
                    </TabsTrigger>
                    <TabsTrigger value="netbanking" className="rounded-[0.9rem]">
                      Net Banking
                    </TabsTrigger>
                    <TabsTrigger value="card" className="rounded-[0.9rem]">
                      Card
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="qr" className="mt-5">
                    <div className="rounded-[1.3rem] border border-[#ddd8d1] bg-[#fffaf8] p-5 text-center">
                      <div className="mx-auto flex size-44 items-center justify-center rounded-[1.25rem] bg-white shadow-[0_12px_24px_rgba(48,32,22,0.08)]">
                        <QrCode className="size-20 text-[#2f5597]" />
                      </div>
                      <p className="mt-4 text-sm leading-7 text-[#776a66]">
                        Scan this QR code from your banking app and complete the donation.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="upi" className="mt-5 space-y-4">
                    <div className="rounded-[1.3rem] border border-[#ddd8d1] bg-[#fffaf8] p-5">
                      <div className="flex items-center gap-3 text-[#2b1b15]">
                        <Smartphone className="h-5 w-5 text-[#2f5597]" />
                        <div>
                          <div className="font-semibold">Pay via UPI</div>
                          <div className="text-sm text-[#776a66]">Enter your UPI ID and continue.</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Input
                          value={paymentForm.upiId}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, upiId: event.target.value }))}
                          placeholder="yourname@upi"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="netbanking" className="mt-5 space-y-4">
                    <div className="rounded-[1.3rem] border border-[#ddd8d1] bg-[#fffaf8] p-5">
                      <div className="flex items-center gap-3 text-[#2b1b15]">
                        <Landmark className="h-5 w-5 text-[#2f5597]" />
                        <div>
                          <div className="font-semibold">Net Banking</div>
                          <div className="text-sm text-[#776a66]">Select your bank and continue.</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <select
                          value={paymentForm.bank}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, bank: event.target.value }))}
                          className="w-full rounded-xl border border-[#ddd8d1] bg-white px-4 py-3 text-sm outline-none"
                        >
                          <option value="">Select bank</option>
                          <option value="State Bank of India">State Bank of India</option>
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="Axis Bank">Axis Bank</option>
                        </select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="card" className="mt-5 space-y-4">
                    <div className="rounded-[1.3rem] border border-[#ddd8d1] bg-[#fffaf8] p-5">
                      <div className="flex items-center gap-3 text-[#2b1b15]">
                        <CreditCard className="h-5 w-5 text-[#2f5597]" />
                        <div>
                          <div className="font-semibold">Debit / Credit Card</div>
                          <div className="text-sm text-[#776a66]">Enter card details to proceed.</div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Input
                          value={paymentForm.cardName}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, cardName: event.target.value }))}
                          placeholder="Cardholder name"
                        />
                        <Input
                          value={paymentForm.cardNumber}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, cardNumber: event.target.value }))}
                          placeholder="Card number"
                        />
                        <Input
                          value={paymentForm.cardExpiry}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, cardExpiry: event.target.value }))}
                          placeholder="Expiry MM/YY"
                        />
                        <Input
                          value={paymentForm.cardCvv}
                          onChange={(event) => setPaymentForm((current) => ({ ...current, cardCvv: event.target.value }))}
                          placeholder="CVV"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStage("details")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#ddd8d1] px-5 py-3 text-sm font-semibold text-[#5e5048] transition hover:bg-[#faf7f5]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={completeDonation}
                    disabled={isSubmitting}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#ff4b57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#f13f4b] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Processing..." : "Complete Donation"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {feedback ? (
              <div className="mt-5 rounded-xl border border-[#bddcc3] bg-[#edf8ef] px-4 py-3 text-left text-sm text-[#2f6c3e]">
                {feedback}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col items-center justify-center gap-3 text-center text-xs text-[#a1938c]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2f6c3e]" />
                <span className="font-medium text-[#5e5048]">80G Tax Benefits Available</span>
              </div>
              <p className="max-w-xs leading-5">
                For assistance, contact us at:<br/>
                <strong>+91 - 9899681972</strong> | <strong>info@udairehab.org</strong>
              </p>
            </div>
          </div>


        </motion.div>
      </div>
    </section>
  );
}
