import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarDays, CreditCard, Landmark, QrCode, Smartphone } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import type { TherapistAvailabilityResponse, TherapistInquiry } from "../types/api";

type Stage = "form" | "payment" | "methods";
type PaymentMethod = "qr" | "upi" | "netbanking" | "card";

const departmentOptions = [
  "Occupational Therapy",
  "Special Education",
  "Speech Therapy",
  "Physical Therapy",
  "Remedial Support",
  "Counselling / Home Programme",
];

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

function todayValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function maxDateValue() {
  const d = new Date();
  d.setDate(d.getDate() + 4); // Today + 4 days = 5 days total
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNext5Days() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
    const formattedDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    days.push({
      isoDate,
      dayLabel,
      formattedDate,
      buttonLabel: `${dayLabel} (${formattedDate})`,
    });
  }
  return days;
}

function isWithinNext5Days(dateStr: string) {
  if (!dateStr) return false;
  const minD = todayValue();
  const maxD = maxDateValue();
  return dateStr >= minD && dateStr <= maxD;
}

function formatDisplayDate(value: string) {
  if (!value) return "N/A";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function Appointment() {
  const [searchParams] = useSearchParams();
  const prefillDepartment = searchParams.get("department") || "";

  const [stage, setStage] = useState<Stage>("form");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [availability, setAvailability] = useState<TherapistAvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [form, setForm] = useState({
    department: prefillDepartment,
    appointmentDate: todayValue(),
    appointmentTime: "",
    childName: "",
    age: "",
    referredBy: "",
    majorConcerns: "",
    enquirySource: "Given by Tanu",
  });
  const [error, setError] = useState("");

  const next5Days = useMemo(() => getNext5Days(), []);

  const selectedSlot = useMemo(
    () => availability?.slots.find((slot) => slot.time === form.appointmentTime) ?? null,
    [availability, form.appointmentTime],
  );

  const canContinue = useMemo(() => {
    return (
      form.department.trim().length >= 2 &&
      form.childName.trim().length >= 2 &&
      Number(form.age) > 0 &&
      form.referredBy.trim().length >= 2 &&
      form.majorConcerns.trim().length >= 5 &&
      form.enquirySource.length > 0 &&
      form.appointmentDate.trim().length > 0 &&
      isWithinNext5Days(form.appointmentDate) &&
      form.appointmentTime.trim().length > 0 &&
      Boolean(selectedSlot?.isAvailable)
    );
  }, [form, selectedSlot?.isAvailable]);

  const bookingAmount = 100;
  const sessionAmount = 800;

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      if (!form.department.trim() || !form.appointmentDate.trim()) {
        setAvailability(null);
        setAvailabilityError("");
        return;
      }

      try {
        setAvailabilityLoading(true);
        const nextAvailability = await apiGet<TherapistAvailabilityResponse>(
          `/forms/therapists/availability?department=${encodeURIComponent(form.department.trim())}&date=${encodeURIComponent(form.appointmentDate.trim())}`,
        );

        if (!active) return;

        setAvailability(nextAvailability);
        setAvailabilityError("");

        if (
          form.appointmentTime &&
          !nextAvailability.slots.some((slot) => slot.time === form.appointmentTime && slot.isAvailable)
        ) {
          updateField("appointmentTime", "");
        }
      } catch (availabilityFetchError) {
        if (!active) return;
        setAvailability(null);
        setAvailabilityError(
          availabilityFetchError instanceof Error
            ? availabilityFetchError.message
            : "Unable to load available slots.",
        );
      } finally {
        if (active) {
          setAvailabilityLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      active = false;
    };
  }, [form.department, form.appointmentDate]);

  async function handleContinueToPayment() {
    if (!canContinue) {
      setError("Please complete all required fields and choose an available time slot.");
      return;
    }

    setError("");
    setIsSubmitting(true);

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
        paymentMethod: "card",
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
      };

      await apiPost<TherapistInquiry>("/forms/therapists/inquiries", payload);

      const origin = window.location.origin;
      const callbackUrl = `${origin}/donation-success?type=appointment&dept=${encodeURIComponent(form.department)}&date=${form.appointmentDate}&time=${form.appointmentTime}`;

      let res: any = null;
      try {
        res = await apiPost<any>("/payments/create-payment-link", {
          amount: bookingAmount,
          customerName: form.childName.trim(),
          purpose: `Therapist Booking Fee (Non-refundable) - ${form.department}`,
          category: "appointment",
          callbackUrl,
        });
      } catch (linkErr) {
        console.warn("Payment link creation fallback:", linkErr);
      }

      if (res?.paymentLinkUrl || res?.short_url) {
        window.location.href = res.paymentLinkUrl || res.short_url;
        return;
      }

      try {
        const orderRes = await apiPost<any>("/payments/create-order", {
          amount: bookingAmount,
          receipt: `appt_${Date.now()}`,
          notes: {
            department: form.department,
            childName: form.childName,
            appointmentDate: form.appointmentDate,
            appointmentTime: form.appointmentTime,
          },
        });

        const scriptLoaded = await loadRazorpayScript();
        if (scriptLoaded && window.Razorpay && orderRes?.order?.id) {
          const rzp = new window.Razorpay({
            key: orderRes.keyId || "rzp_test_fallback",
            amount: bookingAmount * 100,
            currency: "INR",
            name: "UDAI Rehab",
            description: `Appointment Booking Fee - ${form.department}`,
            order_id: orderRes.order.id,
            prefill: {
              name: form.childName.trim(),
            },
            theme: {
              color: "#24396f",
            },
            handler: function () {
              window.location.href = callbackUrl;
            },
            modal: {
              ondismiss: function () {
                setIsSubmitting(false);
              },
            },
          });
          rzp.open();
          return;
        }
      } catch (orderErr) {
        console.warn("Order creation fallback:", orderErr);
      }

      setStage("payment");
    } catch (err: any) {
      console.error("Payment initialization error:", err);
      setError(err?.message || "Unable to initiate Razorpay payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
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

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#2b1b15]">Department</label>
                <select
                  value={form.department}
                  onChange={(e) => {
                    updateField("department", e.target.value);
                    updateField("appointmentTime", "");
                  }}
                  className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm outline-none"
                >
                  <option value="">Select department</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#2b1b15]">Preferred Date (DD/MM/YYYY)</label>
                  <input
                    type="date"
                    min={todayValue()}
                    max={maxDateValue()}
                    value={form.appointmentDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const minD = todayValue();
                      const maxD = maxDateValue();
                      const finalVal = val < minD || val > maxD ? minD : val;
                      updateField("appointmentDate", finalVal);
                      updateField("appointmentTime", "");
                    }}
                    className="mt-1 w-full rounded-lg border border-[#ddd8d1] px-3 py-3 text-sm font-medium outline-none focus:border-[#2f5597]"
                  />
                  <div className="mt-1.5 text-xs font-semibold text-[#2f5597]">
                    Select from next 5 available days
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#2b1b15]">Available Slot</label>
                  <button
                    type="button"
                    onClick={() => setSlotPickerOpen(true)}
                    className="mt-1 flex w-full items-center justify-between rounded-lg border border-[#ddd8d1] bg-white px-3 py-3 text-left text-sm outline-none transition hover:border-[#2f5597] hover:bg-[#f8fbff]"
                    disabled={availabilityLoading || Boolean(availabilityError) || !availability?.slots.length}
                  >
                    <span className={form.appointmentTime ? "text-[#2b1b15]" : "text-[#8c8179]"}>
                      {selectedSlot?.label || "Choose available slot"}
                    </span>
                    <span className="text-xs font-semibold text-[#2f5597]">
                      {form.appointmentTime ? "Change slot" : "Open"}
                    </span>
                  </button>
                  <div className="mt-2 text-xs text-[#6f6460]">
                    {selectedSlot
                      ? selectedSlot.isAvailable
                        ? "Slot available"
                        : "Slot booked"
                      : "Pick a slot to continue."}
                  </div>
                </div>
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

            {error ? <div className="mt-3 text-sm font-semibold text-[#b91c1c]">{error}</div> : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-[#ef3c32] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#da2f26] disabled:opacity-50 shadow-md"
              >
                {isSubmitting ? "Redirecting to Razorpay..." : "Continue to Payment (Pay ₹100)"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#e4dcd4] bg-white p-5 shadow-[0_10px_26px_rgba(41,29,22,0.06)]">
              <h3 className="text-lg font-semibold text-[#24396f]">Booking Summary</h3>
              <div className="mt-3 space-y-2 text-sm text-[#4b4744]">
                <div className="flex justify-between">
                  <span>Department</span>
                  <span>{form.department || "Not selected"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preferred date</span>
                  <span>{formatDisplayDate(form.appointmentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preferred time</span>
                  <span>{selectedSlot?.label || form.appointmentTime || "Not selected"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Booking fee (non refundable)</span>
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
                <div className="flex justify-between text-sm text-[#6f6460]">
                  <span>Remaining fee</span>
                  <span>₹{sessionAmount - bookingAmount}</span>
                </div>
              </div>
              <div className="mt-4 text-xs text-[#6f6460] bg-[#f8f6f3] p-3 rounded-xl border border-[#ece4dd] leading-relaxed">
                💡 Fill in your details and click <strong>&quot;Continue to Payment&quot;</strong> to proceed directly to Razorpay for the ₹100 booking fee.
              </div>
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
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const active = selectedMethod === method.id;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setSelectedMethod(method.id);
                          payNow(method.id);
                        }}
                        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${active ? "border-[#2f5597] bg-[#f3f6ff]" : "border-[#e4dcd4] bg-[#f9fafc]"
                          }`}
                        disabled={isSubmitting}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2f5597]">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="font-semibold text-[#2b1b15]">{method.title}</div>
                            <div className="text-sm text-[#6f6460]">{method.description}</div>
                          </div>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2f5597] shadow-sm">
                          {isSubmitting && active ? "Processing..." : "Pay Now"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {slotPickerOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
            onClick={() => setSlotPickerOpen(false)}
            role="presentation"
          >
            <div
              className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-[0_24px_70px_rgba(16,24,40,0.24)]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Available slots"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d36f47]">
                    Available Slots
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-[#24396f]">
                    Select a slot for {form.appointmentDate || "your chosen date"}
                  </h3>
                  <p className="mt-1 text-sm text-[#6f6460]">
                    Choose only from available slots. Fully booked times stay disabled.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSlotPickerOpen(false)}
                  className="rounded-full border border-[#ddd8d1] px-3 py-2 text-sm font-semibold text-[#4b4744] transition hover:bg-[#f8f6f3]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4">
                {availabilityLoading ? (
                  <div className="rounded-2xl border border-dashed border-[#cfd8ea] bg-[#f8fbff] p-6 text-sm text-[#6f6460]">
                    Loading available slots...
                  </div>
                ) : availabilityError ? (
                  <div className="rounded-2xl border border-dashed border-[#f0b7b1] bg-[#fff6f5] p-6 text-sm text-[#b91c1c]">
                    {availabilityError}
                  </div>
                ) : availability?.slots?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {availability.slots.map((slot) => {
                      const active = form.appointmentTime === slot.time;
                      const availableLabel =
                        slot.availableCount > 0
                          ? `${slot.availableCount} therapist${slot.availableCount > 1 ? "s" : ""} available`
                          : "Fully booked";

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => {
                            if (!slot.isAvailable) return;
                            updateField("appointmentTime", slot.time);
                            setSlotPickerOpen(false);
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${active
                            ? "border-[#2f5597] bg-[#eef3ff]"
                            : slot.isAvailable
                              ? "border-[#dbe5ff] bg-white hover:border-[#2f5597] hover:bg-[#f8fbff]"
                              : "cursor-not-allowed border-[#ebe4dc] bg-[#f8f6f3] opacity-70"
                            }`}
                          disabled={!slot.isAvailable}
                        >
                          <div className="text-sm font-semibold text-[#24396f]">{slot.label}</div>
                          <div className="mt-1 text-xs text-[#6f6460]">
                            {availableLabel}
                          </div>
                          <div className="mt-3 inline-flex rounded-full bg-[#f3f6ff] px-3 py-1 text-xs font-semibold text-[#2f5597]">
                            {active ? "Selected" : slot.isAvailable ? "Tap to choose" : "Unavailable"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#cfd8ea] bg-[#f8fbff] p-6 text-sm text-[#6f6460]">
                    Select department and date to view available slots.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
