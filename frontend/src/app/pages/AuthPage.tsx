import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  User,
  Mail,
  Phone,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";
type LoginMethod = "password" | "otp";
type ForgotStep = "email" | "reset";

const duplicateSignupMessage = "An account with this email or mobile number already exists.";
const duplicateSignupToast = "An account with this email or mobile number already exists! Please sign in.";

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, signup, verifySignupOtp, sendOtp, requestPasswordReset, resetPassword } = useAuth();

  const defaultMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [submitting, setSubmitting] = useState(false);

  // Signup states
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupResendTimer, setSignupResendTimer] = useState(0);

  // Login states
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginResendTimer, setLoginResendTimer] = useState(0);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [forgotResendTimer, setForgotResendTimer] = useState(0);

  // Password visibility
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const redirect = searchParams.get("redirect") || "/new-arrivals";

  // Listen to mode query parameter changes
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup" || urlMode === "login") {
      setMode(urlMode);
    }
  }, [searchParams]);

  // Countdown timers for OTP resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (signupResendTimer > 0) {
      interval = setInterval(() => setSignupResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [signupResendTimer]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loginResendTimer > 0) {
      interval = setInterval(() => setLoginResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loginResendTimer]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (forgotResendTimer > 0) {
      interval = setInterval(() => setForgotResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [forgotResendTimer]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setSignupOtpSent(false);
    setSignupOtp("");
    setLoginOtpSent(false);
    setLoginOtp("");
    setForgotStep("email");
  }

  // --- SIGNUP OTP SENDING ---
  async function handleSendSignupOtp() {
    if (!signupName.trim()) {
      toast.error("Please enter your Full Name.");
      return;
    }
    if (!signupPhone.trim() || signupPhone.trim().length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!signupPassword) {
      toast.error("Please create a password.");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        name: signupName.trim(),
        phone: signupPhone.trim(),
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
      });
      setSignupOtpSent(true);
      setSignupResendTimer(60);
      toast.success("OTP sent to " + signupEmail.trim() + "! Please enter it below.");
      setTimeout(() => otpInputRef.current?.focus(), 150);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send verification OTP";
      const isDuplicate = message === duplicateSignupMessage || message.toLowerCase().includes("already exists");
      toast.error(isDuplicate ? duplicateSignupToast : message);
    } finally {
      setSubmitting(false);
    }
  }

  // --- SIGNUP VERIFY & SUBMIT ---
  async function handleSignupSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!signupOtpSent) {
      await handleSendSignupOtp();
      return;
    }

    if (!signupOtp.trim() || signupOtp.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }

    setSubmitting(true);
    try {
      await verifySignupOtp({
        email: signupEmail.trim().toLowerCase(),
        otp: signupOtp.trim(),
      });
      toast.success("Account created successfully! Welcome to UDAI.");
      navigate(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify OTP";
      toast.error(message === "OTP does not matched." ? "Invalid OTP. Please check the code and try again." : message);
    } finally {
      setSubmitting(false);
    }
  }

  // --- LOGIN OTP SENDING ---
  async function handleSendLoginOtp() {
    if (!loginIdentifier.trim() || !loginIdentifier.includes("@")) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setSubmitting(true);
    try {
      await sendOtp(loginIdentifier.trim().toLowerCase());
      setLoginOtpSent(true);
      setLoginResendTimer(60);
      toast.success("Login OTP sent to " + loginIdentifier.trim() + "!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  }

  // --- LOGIN SUBMIT ---
  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (loginMethod === "otp" && !loginOtpSent) {
      await handleSendLoginOtp();
      return;
    }

    if (loginMethod === "otp" && (!loginOtp.trim() || loginOtp.trim().length !== 6)) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }

    setSubmitting(true);
    try {
      await login({
        identifier: loginIdentifier.trim(),
        ...(loginMethod === "otp" ? { otp: loginOtp.trim() } : { password: loginPassword }),
      });
      toast.success("Welcome back!");
      navigate(redirect);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- FORGOT PASSWORD SUBMIT ---
  async function handleForgotSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (forgotStep === "email") {
      if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
        toast.error("Please enter your registered email address.");
        return;
      }

      setSubmitting(true);
      try {
        await requestPasswordReset(forgotEmail.trim());
        setForgotStep("reset");
        setForgotResendTimer(60);
        toast.success("Password reset OTP sent to your email.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to send password reset OTP");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        email: forgotEmail.trim(),
        otp: resetOtp.trim(),
        password: newPassword,
      });
      toast.success("Password reset successfully! Please sign in with your new password.");
      setLoginIdentifier(forgotEmail.trim());
      setLoginPassword("");
      switchMode("login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-[#fdfbf9] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgba(43,27,21,0.08)] border border-[#ede6df] sm:p-8">
        
        {/* TOP MODE TOGGLE TABS */}
        {mode !== "forgot" ? (
          <div className="mb-6 flex rounded-xl bg-[#f4ece4] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                mode === "login"
                  ? "bg-white text-[#2b1b15] shadow-sm"
                  : "text-[#776a66] hover:text-[#2b1b15]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                mode === "signup"
                  ? "bg-white text-[#2b1b15] shadow-sm"
                  : "text-[#776a66] hover:text-[#2b1b15]"
              }`}
            >
              Create Account
            </button>
          </div>
        ) : null}

        {/* HEADER TITLE */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#2b1b15] sm:text-3xl">
            {mode === "login"
              ? "Welcome Back"
              : mode === "signup"
              ? "Create Your Account"
              : "Reset Password"}
          </h2>
          {mode === "login" ? (
            <p className="mt-1.5 text-sm text-[#776a66]">
              Sign in to manage bookings, orders & profile
            </p>
          ) : mode === "forgot" ? (
            <p className="mt-1.5 text-sm text-[#776a66]">
              Enter your registered email to receive a reset code
            </p>
          ) : null}
        </div>

        {/* ========================================================= */}
        {/* ===================== SIGNUP FORM ======================= */}
        {/* ========================================================= */}
        {mode === "signup" && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                <User className="h-3.5 w-3.5 text-[#2f5597]" /> Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                disabled={signupOtpSent}
                className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] px-3 text-sm focus:border-[#2f5597] focus:bg-white"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                <Phone className="h-3.5 w-3.5 text-[#2f5597]" /> Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-medium text-[#776a66]">+91</span>
                <Input
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  disabled={signupOtpSent}
                  className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] pl-12 pr-3 text-sm focus:border-[#2f5597] focus:bg-white"
                />
              </div>
            </div>

            {/* Email Address + Inline Send OTP Button */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                  <Mail className="h-3.5 w-3.5 text-[#2f5597]" /> Email Address <span className="text-red-500">*</span>
                </label>
                {signupOtpSent ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSignupOtpSent(false);
                      setSignupOtp("");
                    }}
                    className="text-xs font-semibold text-[#2f5597] hover:underline"
                  >
                    Change Email
                  </button>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Input
                  required
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={signupOtpSent}
                  className="h-11 flex-1 rounded-lg border-[#d9cec5] bg-[#faf7f4] px-3 text-sm focus:border-[#2f5597] focus:bg-white"
                />
                {!signupOtpSent ? (
                  <Button
                    type="button"
                    onClick={handleSendSignupOtp}
                    disabled={submitting || !signupEmail.includes("@")}
                    className="h-11 shrink-0 rounded-lg bg-[#2f5597] px-4 text-xs font-semibold text-white hover:bg-[#25467e] disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Send OTP"}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* OTP FILL SECTION (Highlighted) */}
            <div
              className={`rounded-xl border p-4 transition-all duration-300 ${
                signupOtpSent
                  ? "border-[#2f5597]/40 bg-[#f4f7fc] shadow-sm"
                  : "border-dashed border-[#d9cec5] bg-[#faf7f4]/60"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2b1b15]">
                  <KeyRound className="h-4 w-4 text-[#2f5597]" /> Email OTP Code <span className="text-red-500">*</span>
                </label>
                {signupOtpSent && signupResendTimer > 0 ? (
                  <span className="text-xs font-medium text-[#776a66]">
                    Resend in <span className="font-semibold text-[#2f5597]">{signupResendTimer}s</span>
                  </span>
                ) : signupOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendSignupOtp}
                    disabled={submitting}
                    className="flex items-center gap-1 text-xs font-semibold text-[#2f5597] hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend OTP
                  </button>
                ) : null}
              </div>

              <Input
                ref={otpInputRef}
                required={signupOtpSent}
                inputMode="numeric"
                maxLength={6}
                value={signupOtp}
                onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={signupOtpSent ? "Enter 6-digit OTP code" : "Click 'Send OTP' above to receive code"}
                disabled={!signupOtpSent}
                className={`h-12 w-full rounded-lg text-center font-bold transition-all ${
                  signupOtpSent
                    ? "border-[#2f5597] bg-white text-[#1e293b] text-xl tracking-[0.3em] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-[#2f5597]/20 focus:border-[#2f5597]"
                    : "border-dashed border-gray-300 bg-gray-50 text-gray-400 text-sm tracking-normal placeholder:text-xs placeholder:font-normal placeholder:tracking-normal"
                }`}
              />

              {signupOtpSent ? (
                <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="leading-snug">
                    OTP sent to <strong className="font-semibold text-emerald-950 underline decoration-emerald-300 underline-offset-2 break-all">{signupEmail}</strong>. Check inbox or spam folder.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-[#776a66]">
                  💡 Fill your details & click 'Send OTP' to verify your email.
                </p>
              )}
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                  <Lock className="h-3.5 w-3.5 text-[#2f5597]" /> Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    required
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    disabled={signupOtpSent}
                    className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] pr-10 text-sm focus:border-[#2f5597] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#776a66] hover:text-[#2b1b15]"
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                  <Lock className="h-3.5 w-3.5 text-[#2f5597]" /> Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    required
                    type={showSignupConfirmPassword ? "text" : "password"}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    disabled={signupOtpSent}
                    className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] pr-10 text-sm focus:border-[#2f5597] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#776a66] hover:text-[#2b1b15]"
                  >
                    {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Passwords match status */}
            {signupPassword && signupConfirmPassword && (
              <p
                className={`text-xs font-medium ${
                  signupPassword === signupConfirmPassword ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {signupPassword === signupConfirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}

            {/* ACTION BUTTON */}
            <div className="pt-2">
              {!signupOtpSent ? (
                <Button
                  type="button"
                  onClick={handleSendSignupOtp}
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2f5597] text-sm font-bold text-white shadow-md transition-all hover:bg-[#25467e] disabled:opacity-60"
                >
                  {submitting ? "Sending OTP..." : (
                    <>
                      <Send className="h-4 w-4" /> Send OTP to Email
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting || signupOtp.length !== 6}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2f5597] text-sm font-bold text-white shadow-md transition-all hover:bg-[#25467e] disabled:opacity-50"
                >
                  {submitting ? "Verifying Account..." : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Verify OTP & Create Account
                    </>
                  )}
                </Button>
              )}
            </div>

            <p className="text-center text-xs text-[#776a66]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold text-[#2f5597] hover:underline"
              >
                Sign in here
              </button>
            </p>
          </form>
        )}

        {/* ========================================================= */}
        {/* ====================== LOGIN FORM ======================= */}
        {/* ========================================================= */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Login Type Switch: Password vs OTP */}
            <div className="flex justify-center gap-4 border-b border-[#eee5dd] pb-3">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("password");
                  setLoginOtpSent(false);
                  setLoginOtp("");
                }}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all ${
                  loginMethod === "password"
                    ? "border-b-2 border-[#2f5597] text-[#2f5597]"
                    : "text-[#776a66] hover:text-[#2b1b15]"
                }`}
              >
                Login with Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("otp");
                  setLoginOtpSent(false);
                  setLoginOtp("");
                }}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all ${
                  loginMethod === "otp"
                    ? "border-b-2 border-[#2f5597] text-[#2f5597]"
                    : "text-[#776a66] hover:text-[#2b1b15]"
                }`}
              >
                Login with OTP
              </button>
            </div>

            {/* Identifier: Email or Mobile */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                  {loginMethod === "otp" ? (
                    <>
                      <Mail className="h-3.5 w-3.5 text-[#2f5597]" /> Registered Email Address <span className="text-red-500">*</span>
                    </>
                  ) : (
                    <>
                      <User className="h-3.5 w-3.5 text-[#2f5597]" /> Email or Mobile Number <span className="text-red-500">*</span>
                    </>
                  )}
                </label>
                {loginMethod === "otp" && loginOtpSent ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginOtpSent(false);
                      setLoginOtp("");
                    }}
                    className="text-xs font-semibold text-[#2f5597] hover:underline"
                  >
                    Change Email
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Input
                  required
                  type={loginMethod === "otp" ? "email" : "text"}
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={loginMethod === "otp" ? "you@example.com" : "e.g. user@example.com or 9876543210"}
                  disabled={loginMethod === "otp" && loginOtpSent}
                  className="h-11 flex-1 rounded-lg border-[#d9cec5] bg-[#faf7f4] px-3 text-sm focus:border-[#2f5597] focus:bg-white"
                />
                {loginMethod === "otp" && !loginOtpSent ? (
                  <Button
                    type="button"
                    onClick={handleSendLoginOtp}
                    disabled={submitting || !loginIdentifier.trim() || !loginIdentifier.includes("@")}
                    className="h-11 shrink-0 rounded-lg bg-[#2f5597] px-4 text-xs font-semibold text-white hover:bg-[#25467e] disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Send OTP"}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Password Login Mode */}
            {loginMethod === "password" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                    <Lock className="h-3.5 w-3.5 text-[#2f5597]" /> Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs font-medium text-[#2f5597] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    required
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] pr-10 text-sm focus:border-[#2f5597] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#776a66] hover:text-[#2b1b15]"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* OTP Login Mode */}
            {loginMethod === "otp" && (
              <div
                className={`rounded-xl border p-4 transition-all duration-300 ${
                  loginOtpSent
                    ? "border-[#2f5597]/40 bg-[#f4f7fc] shadow-sm"
                    : "border-dashed border-[#d9cec5] bg-[#faf7f4]/60"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2b1b15]">
                    <KeyRound className="h-4 w-4 text-[#2f5597]" /> One-Time Password (OTP) <span className="text-red-500">*</span>
                  </label>
                  {loginOtpSent && loginResendTimer > 0 ? (
                    <span className="text-xs font-medium text-[#776a66]">
                      Resend in <span className="font-semibold text-[#2f5597]">{loginResendTimer}s</span>
                    </span>
                  ) : loginOtpSent ? (
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={submitting}
                      className="flex items-center gap-1 text-xs font-semibold text-[#2f5597] hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className="h-3 w-3" /> Resend OTP
                    </button>
                  ) : null}
                </div>

                <Input
                  required={loginOtpSent}
                  inputMode="numeric"
                  maxLength={6}
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={loginOtpSent ? "Enter 6-digit OTP code" : "Click 'Send OTP' above first"}
                  disabled={!loginOtpSent}
                  className={`h-12 w-full rounded-lg text-center font-bold transition-all ${
                    loginOtpSent
                      ? "border-[#2f5597] bg-white text-[#1e293b] text-xl tracking-[0.3em] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-[#2f5597]/20 focus:border-[#2f5597]"
                      : "border-dashed border-gray-300 bg-gray-50 text-gray-400 text-sm tracking-normal placeholder:text-xs placeholder:font-normal placeholder:tracking-normal"
                  }`}
                />

                {loginOtpSent ? (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <p className="leading-snug">
                      OTP sent to <strong className="font-semibold text-emerald-950 underline decoration-emerald-300 underline-offset-2 break-all">{loginIdentifier}</strong>. Check inbox or spam folder.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-[#776a66]">
                    Enter your registered email and click 'Send OTP' to log in without a password.
                  </p>
                )}
              </div>
            )}

            {/* ACTION BUTTON */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting || (loginMethod === "otp" && loginOtpSent && loginOtp.length !== 6)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2f5597] text-sm font-bold text-white shadow-md transition-all hover:bg-[#25467e] disabled:opacity-60"
              >
                {submitting ? (
                  "Please wait..."
                ) : loginMethod === "otp" && !loginOtpSent ? (
                  <>
                    <Send className="h-4 w-4" /> Send OTP to Login
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" /> Sign In
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-[#776a66]">
              Don't have an account yet?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-semibold text-[#2f5597] hover:underline"
              >
                Create an account
              </button>
            </p>
          </form>
        )}

        {/* ========================================================= */}
        {/* ================== FORGOT PASSWORD ====================== */}
        {/* ========================================================= */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                  <Mail className="h-3.5 w-3.5 text-[#2f5597]" /> Registered Email <span className="text-red-500">*</span>
                </label>
                {forgotStep === "reset" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("email");
                      setResetOtp("");
                    }}
                    className="text-xs font-semibold text-[#2f5597] hover:underline"
                  >
                    Change Email
                  </button>
                ) : null}
              </div>
              <Input
                required
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={forgotStep === "reset"}
                className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] px-3 text-sm focus:border-[#2f5597] focus:bg-white"
              />
            </div>

            {forgotStep === "reset" && (
              <>
                {/* OTP Box */}
                <div className="rounded-xl border border-[#2f5597]/40 bg-[#f4f7fc] p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2b1b15]">
                      <KeyRound className="h-4 w-4 text-[#2f5597]" /> 6-Digit Reset Code <span className="text-red-500">*</span>
                    </label>
                    {forgotResendTimer > 0 ? (
                      <span className="text-xs font-medium text-[#776a66]">
                        Resend in <span className="font-semibold text-[#2f5597]">{forgotResendTimer}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleForgotSubmit}
                        disabled={submitting}
                        className="flex items-center gap-1 text-xs font-semibold text-[#2f5597] hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" /> Resend OTP
                      </button>
                    )}
                  </div>

                  <Input
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="h-12 w-full rounded-lg border-[#2f5597] bg-white text-center text-xl font-bold tracking-[0.3em] text-[#1e293b] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-[#2f5597]/20"
                  />
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <p className="leading-snug">
                      Reset code sent to <strong className="font-semibold text-emerald-950 underline decoration-emerald-300 underline-offset-2 break-all">{forgotEmail}</strong>. Please check your inbox.
                    </p>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                    <Lock className="h-3.5 w-3.5 text-[#2f5597]" /> New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      required
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] pr-10 text-sm focus:border-[#2f5597] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#776a66] hover:text-[#2b1b15]"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5a4c46]">
                    <Lock className="h-3.5 w-3.5 text-[#2f5597]" /> Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      required
                      type={showNewPasswordConfirm ? "text" : "password"}
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      className="h-11 rounded-lg border-[#d9cec5] bg-[#faf7f4] pr-10 text-sm focus:border-[#2f5597] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasswordConfirm(!showNewPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#776a66] hover:text-[#2b1b15]"
                    >
                      {showNewPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting || (forgotStep === "reset" && resetOtp.length !== 6)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2f5597] text-sm font-bold text-white shadow-md transition-all hover:bg-[#25467e] disabled:opacity-60"
              >
                {submitting ? "Processing..." : forgotStep === "email" ? "Send Reset Code" : "Reset Password"}
              </Button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-xs font-semibold text-[#2f5597] hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
