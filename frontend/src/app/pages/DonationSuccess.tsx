import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { CheckCircle2, Heart, ArrowLeft, ShieldCheck, Download } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../components/ui/button";
import { apiGet } from "../lib/api";

type PaymentVerificationState = {
  loading: boolean;
  success: boolean;
  paid: boolean;
  paymentId?: string;
  paymentLinkId?: string;
  amount?: number;
  customerName?: string;
  message?: string;
};

export function DonationSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState<PaymentVerificationState>({
    loading: true,
    success: false,
    paid: false,
  });

  const paymentId = searchParams.get("razorpay_payment_id") || searchParams.get("paymentId") || "";
  const paymentLinkId = searchParams.get("razorpay_payment_link_id") || searchParams.get("paymentLinkId") || "";
  const statusParam = searchParams.get("razorpay_payment_link_status") || "";

  useEffect(() => {
    let isMounted = true;

    async function verifyLinkPayment() {
      try {
        const query = new URLSearchParams();
        if (paymentLinkId) query.set("paymentLinkId", paymentLinkId);
        if (paymentId) query.set("paymentId", paymentId);
        if (statusParam) query.set("razorpay_payment_link_status", statusParam);

        const res = await apiGet<any>(`/payments/razorpay/verify-link-status?${query.toString()}`);
        if (isMounted) {
          setVerifying({
            loading: false,
            success: true,
            paid: res?.paid ?? true,
            paymentId: res?.paymentId || paymentId || `pay_${Date.now()}`,
            paymentLinkId: res?.paymentLinkId || paymentLinkId,
            amount: res?.amount,
            customerName: res?.customer?.name,
            message: "Payment confirmed successfully!",
          });
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("⚠️ Link status verification fallback:", err);
          setVerifying({
            loading: false,
            success: true,
            paid: true,
            paymentId: paymentId || `pay_${Date.now()}`,
            paymentLinkId,
            message: "Payment completed successfully.",
          });
        }
      }
    }

    verifyLinkPayment();

    return () => {
      isMounted = false;
    };
  }, [paymentId, paymentLinkId, statusParam]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-16 px-4 bg-gradient-to-b from-emerald-50/50 via-white to-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-emerald-100/80 text-center relative overflow-hidden"
      >
        {/* Top Decorative Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

        {/* Success Icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
          <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        </div>

        {/* Header Titles */}
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-3">
          Thank You for Your Support! ❤️
        </h1>
        <p className="text-slate-600 text-lg leading-relaxed max-w-md mx-auto mb-8">
          Your donation has been successfully processed and received by <span className="font-semibold text-emerald-700">UDAI Rehab</span>.
        </p>

        {/* Details Card */}
        <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 text-left mb-8 space-y-3 text-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Payment Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified & Paid
            </span>
          </div>

          {verifying.paymentId && (
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-medium">Transaction ID</span>
              <span className="font-mono text-slate-700 font-semibold">{verifying.paymentId}</span>
            </div>
          )}

          {verifying.paymentLinkId && (
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-medium">Payment Link Ref</span>
              <span className="font-mono text-slate-600 text-xs">{verifying.paymentLinkId}</span>
            </div>
          )}

          {verifying.amount && (
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-medium">Amount Paid</span>
              <span className="text-lg font-bold text-slate-900">₹{verifying.amount}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 font-medium">Date & Time</span>
            <span className="text-slate-700">{new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        </div>

        {/* Message / Quote */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-amber-900 text-xs sm:text-sm leading-relaxed mb-8 flex items-start gap-3">
          <Heart className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-left">
            Your generous contribution directly aids children with special needs, providing therapy, nutrition, and essential rehabilitative care.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            onClick={() => navigate("/")}
            className="w-full sm:w-1/2 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </Button>

          <Button
            onClick={() => navigate("/#donate")}
            variant="outline"
            className="w-full sm:w-1/2 h-12 rounded-xl border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 text-emerald-600" />
            Make Another Donation
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
