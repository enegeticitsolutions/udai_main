import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarDays, CreditCard, Landmark, QrCode, Smartphone } from "lucide-react";
import { apiPost } from "../lib/api";
import type { TherapistInquiry } from "../types/api";

type Stage = "form" | "payment" | "methods";
type PaymentMethod = "qr" | "upi" | "netbanking" | "card";

const paymentMethods: Array<{
  id: PaymentMethod;
  title: string;
  description: string;
  icon: typeof QrCode;
}> = [
  {
    id: "qr",
    title: "QR",
    description: "Scan the QR code to pay ₹100 booking fee.",
    icon: QrCode,
  },
  {
    id: "upi",
    title: "UPI",
    description: "Pay via UPI app for the booking fee.",
    icon: Smartphone,
  },
  {
    id: "netbanking",
    title: "Net Banking",
    description: "Complete payment via your bank portal.",
    icon: Landmark,
  },
  {
    id: "card",
    title: "Debit / Credit Card",
    description: "Pay booking fee with your card.",
    icon: CreditCard,
  },
];

export function Appointment() {
  const [searchParams] = useSearchParams();
  const prefillDepartment = searchParams.get("department") || "";

  const [stage, setStage] = useState<Stage>("form");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    department: prefillDepartment,
    childName: "",
    age: "",
    referredBy: "",
    majorConcerns: "",
    enquirySource: "Given by Tanu",
  });
  const [error, setError] = useState("");

  const canContinue = useMemo(() => {
    return (
      form.childName.trim().length >= 2 &&
      Number(form.age) > 0 &&
      form.referredBy.trim().length >= 2 &&
      form.majorConcerns.trim().length >= 5 &&
      form.enquirySource.length > 0
    );
  }, [form]);

  const bookingAmount = 100;
  const sessionAmount = 800;

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goToPayment() {
    if (!canContinue) {
      setError("Please complete all required fields.");
      return;
    }
    setError("");
    setStage("payment");
  }

  async function payNow(paymentMethod: PaymentMethod) {
    if (!canContinue) {
      setError("Please complete all required fields before payment.");
      setStage("form");
      return;
    }

    setError("");
    setIsSubmitting(true);
    setSelectedMethod(paymentMethod);
    setSuccessMessage("");

    try {
      const payload: Omit<TherapistInquiry, "id" | "createdAt"> = {
        department: form.department.trim(),
        childName: form.childName.trim(),
        age: Number(form.age),
        referredBy: form.referredBy.trim(),
        majorConcerns: form.majorConcerns.trim(),
        enquirySource: form.enquirySource as "Given by Tanu" | "Direct",
        requestType: "contact",
        bookingAmount,
        sessionAmount,
        paymentMethod,
      };

      await apiPost<TherapistInquiry>("/forms/therapists/inquiries", payload);
      setSuccessMessage("Your booking details have been saved successfully.");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : "Unable to save booking.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-[#f3f6ff] py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d36f47]">
            Appointment
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-[#24396f] sm:text-4xl">Book a Therapist</h1>
          <p className="mt-2 text-sm text-[#6f6460]">
            Fill the enquiry details. Booking fee ₹{bookingAmount} (non-refundable). Per session fee ₹{sessionAmount}.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-[#e4dcd4] bg-white p-6 shadow-[0_10px_26px_rgba(41,29,22,0.06)]">
            <h2 className="text-xl font-semibold text-[#24396f]">Enquiry Details Recorded</h2>
            <p className="mt-1 text-sm text-[#6f6460]">
              Child’s Name, Age, Referred By, Major Concerns, Enquiry Source (Given by Tanu / Direct)
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#2b1b15]">Department</label>
                <input
                  value={form.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  placeholder="Speech Therapy"
                  className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm outline-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#2b1b15]">Child’s Name</label>
                  <input
                    value={form.childName}
                    onChange={(e) => updateField("childName", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2b1b15]">Age</label>
                  <input
                    type="number"
                    min="1"
                    value={form.age}
                    onChange={(e) => updateField("age", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#2b1b15]">Referred By</label>
                <input
                  value={form.referredBy}
                  onChange={(e) => updateField("referredBy", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2b1b15]">Major Concerns</label>
                <textarea
                  rows={3}
                  value={form.majorConcerns}
                  onChange={(e) => updateField("majorConcerns", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#2b1b15]">Enquiry Source</label>
                <select
                  value={form.enquirySource}
                  onChange={(e) => updateField("enquirySource", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm outline-none"
                >
                  <option>Given by Tanu</option>
                  <option>Direct</option>
                </select>
              </div>
            </div>

            {error ? <div className="mt-3 text-sm text-[#b91c1c]">{error}</div> : null}

            <div className="mt-5 flex gap-3">
              <button
                onClick={goToPayment}
                className="inline-flex items-center justify-center rounded-full bg-[#2f5597] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#264882]"
              >
                Continue to Payment
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#e4dcd4] bg-white p-5 shadow-[0_10px_26px_rgba(41,29,22,0.06)]">
              <h3 className="text-lg font-semibold text-[#24396f]">Booking Summary</h3>
              <div className="mt-3 space-y-2 text-sm text-[#4b4744]">
                <div className="flex justify-between">
                  <span>Booking fee (non-refundable)</span>
                  <span>₹{bookingAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Session fee</span>
                  <span>₹{sessionAmount}</span>
                </div>
                <div className="flex justify-between font-semibold text-[#2b1b15]">
                  <span>Total per session</span>
                  <span>₹{sessionAmount}</span>
                </div>
              </div>
              {stage === "payment" ? (
                <button
                  onClick={() => setStage("methods")}
                  className="mt-4 w-full rounded-full bg-[#ef3c32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#da2f26]"
                >
                  Pay Booking Fee ₹{bookingAmount}
                </button>
              ) : (
                <div className="mt-4 text-sm text-[#6f6460]">
                  Fill the form to proceed to payment.
                </div>
              )}
            </div>

            {stage === "methods" ? (
              <div className="rounded-2xl border border-[#e4dcd4] bg-white p-5 shadow-[0_10px_26px_rgba(41,29,22,0.06)]">
                <h3 className="text-lg font-semibold text-[#24396f]">Choose Payment Method</h3>
                {successMessage ? (
                  <div className="mt-3 rounded-xl border border-[#c9e3cb] bg-[#f2fbf3] p-3 text-sm text-[#246b32]">
                    {successMessage}
                  </div>
                ) : null}
                {selectedMethod ? (
                  <div className="mt-3 rounded-xl border border-[#e4dcd4] bg-[#f9fafc] p-3 text-sm text-[#4b4744]">
                    <div className="font-semibold text-[#24396f]">
                      {paymentMethods.find((method) => method.id === selectedMethod)?.title}
                    </div>
                    <div className="mt-1">
                      Your ₹{bookingAmount} non-refundable booking fee has been recorded.
                    </div>
                    <div className="mt-1">
                      Total session amount: ₹{sessionAmount}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 space-y-3 text-sm text-[#4b4744]">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;

                    return (
                      <div
                        key={method.id}
                        className="flex flex-col gap-3 rounded-xl border border-[#e4dcd4] bg-[#f9fafc] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-5 w-5 text-[#2f5597]" />
                          <div>
                            <div className="font-semibold">{method.title}</div>
                            <div>{method.description}</div>
                            <div className="mt-1 text-xs text-[#7b706a]">
                              Booking fee ₹{bookingAmount} is non-refundable.
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => payNow(method.id)}
                          className="inline-flex items-center justify-center rounded-full bg-[#2f5597] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#264882] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting && selectedMethod === method.id ? "Saving..." : "Pay Now"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#e4dcd4] bg-white p-5 shadow-[0_10px_26px_rgba(41,29,22,0.06)]">
              <div className="flex items-center gap-3 text-[#24396f]">
                <CalendarDays className="h-5 w-5" />
                <div className="text-sm font-semibold">Team-based scheduling</div>
              </div>
              <p className="mt-2 text-sm text-[#6f6460]">
                Book by department. Our internal team will assign the right therapist based on availability and your child&apos;s needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
