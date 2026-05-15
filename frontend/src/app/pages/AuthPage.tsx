import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, signup, sendOtp } = useAuth();
  
  const defaultMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [submitting, setSubmitting] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");

  const redirect = searchParams.get("redirect") || "/new-arrivals";

  async function handleSendOtp() {
    if (!identifier) {
      toast.error("Please enter your email or phone number first");
      return;
    }
    setSubmitting(true);
    try {
      await sendOtp(identifier);
      setOtpSent(true);
      toast.success("OTP sent successfully! Check your email or phone.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setSubmitting(false);
          return;
        }
        await signup({ name, email, phone, password });
        toast.success("Account created successfully!");
        navigate(redirect);
      } else {
        await login({
          identifier,
          ...(useOtp ? { otp } : { password })
        });
        toast.success("Welcome back!");
        navigate(redirect);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f8f3ef] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[1.5rem] bg-white p-8 shadow-[0_12px_24px_rgba(48,32,22,0.07)]">
        <div>
          <h2 className="text-center text-3xl font-semibold tracking-tight text-[#2b1b15]">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </h2>
          <p className="mt-2 text-center text-sm text-[#776a66]">
            {mode === "login" ? "Or " : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setUseOtp(false);
                setOtpSent(false);
              }}
              className="font-medium text-[#2f5597] hover:text-[#264882]"
            >
              {mode === "login" ? "create a new account" : "sign in instead"}
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {mode === "signup" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Full Name</label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Mobile Number</label>
                  <Input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Email address</label>
                  <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Password</label>
                  <Input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Confirm Password</label>
                  <Input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Email or Mobile Number</label>
                  <Input required value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Email or Phone" />
                </div>
                
                {useOtp ? (
                  otpSent && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">One-Time Password (OTP)</label>
                      <Input required value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" />
                    </div>
                  )
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Password</label>
                    <Input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setUseOtp(!useOtp);
                      setOtpSent(false);
                    }}
                    className="text-sm font-medium text-[#2f5597] hover:text-[#264882]"
                  >
                    {useOtp ? "Login with password instead" : "Login with OTP instead"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {mode === "login" && useOtp && !otpSent ? (
              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={submitting}
                className="w-full rounded-full bg-[#2b1b15] py-6 text-base font-semibold text-white hover:bg-[#4a362e]"
              >
                {submitting ? "Sending..." : "Send OTP"}
              </Button>
            ) : null}

            <Button
              type="submit"
              disabled={submitting || (mode === "login" && useOtp && !otpSent)}
              className="w-full rounded-full bg-[#2f5597] py-6 text-base font-semibold text-white shadow-[0_10px_20px_rgba(47,85,151,0.22)] hover:bg-[#264882]"
            >
              {submitting ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
