import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

type AuthMode = "login" | "signup" | "forgot";
type ForgotStep = "email" | "reset";

const duplicateSignupMessage = "An account with this email or mobile number already exists.";
const duplicateSignupToast = "Account already exists! Please sign in instead.";

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, signup, verifySignupOtp, sendOtp, requestPasswordReset, resetPassword } = useAuth();

  const defaultMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [submitting, setSubmitting] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [signupOtpOpen, setSignupOtpOpen] = useState(false);
  const [signupOtp, setSignupOtp] = useState("");
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");

  const redirect = searchParams.get("redirect") || "/new-arrivals";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setUseOtp(false);
    setOtpSent(false);
    setOtp("");
    setForgotStep("email");
    setSignupOtpOpen(false);
    setSignupOtp("");
    setPendingSignupEmail("");
  }

  async function handleSendOtp() {
    if (!identifier.trim()) {
      toast.error("Please enter your email or phone number first");
      return;
    }

    setSubmitting(true);
    try {
      await sendOtp(identifier);
      setOtpSent(true);
      toast.success("OTP sent successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(event: React.FormEvent) {
    event.preventDefault();

    if (forgotStep === "email") {
      if (!forgotEmail.trim()) {
        toast.error("Please enter your email address");
        return;
      }

      setSubmitting(true);
      try {
        await requestPasswordReset(forgotEmail);
        setForgotStep("reset");
        toast.success("Password reset OTP sent to your email.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to send password reset OTP");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        email: forgotEmail,
        otp: resetOtp,
        password: newPassword,
      });
      toast.success("Password reset successfully. Please log in.");
      setIdentifier(forgotEmail);
      setPassword("");
      switchMode("login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }

        await signup({ name, email, phone: phone.trim(), password });
        setPendingSignupEmail(email.trim().toLowerCase());
        setSignupOtp("");
        setSignupOtpOpen(true);
        toast.success("Verification OTP sent to your email.");
        return;
      }

      await login({
        identifier,
        ...(useOtp ? { otp } : { password }),
      });
      toast.success("Welcome back!");
      navigate(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      const isDuplicateSignup =
        mode === "signup" &&
        (message === duplicateSignupMessage ||
          message.includes("E11000") ||
          message.toLowerCase().includes("duplicate key"));
      toast.error(isDuplicateSignup ? duplicateSignupToast : message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifySignupOtp(event: React.FormEvent) {
    event.preventDefault();

    if (!pendingSignupEmail) {
      toast.error("Please submit the signup form again.");
      setSignupOtpOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      await verifySignupOtp({
        email: pendingSignupEmail,
        otp: signupOtp,
      });
      toast.success("Account verified and created successfully!");
      setSignupOtpOpen(false);
      navigate(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify signup OTP";
      toast.error(message === "OTP does not matched." ? "OTP does not matched." : message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendSignupOtp() {
    setSubmitting(true);
    try {
      await signup({ name, email, phone: phone.trim(), password });
      setSignupOtp("");
      setPendingSignupEmail(email.trim().toLowerCase());
      toast.success("A new verification OTP has been sent.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend signup OTP";
      toast.error(message === duplicateSignupMessage ? duplicateSignupToast : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f8f3ef] px-3 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-[1rem] bg-white p-5 shadow-[0_12px_24px_rgba(48,32,22,0.07)] sm:space-y-8 sm:rounded-[1.5rem] sm:p-8">
        <div>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-[#2b1b15] sm:text-3xl">
            {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create a new account" : "Reset your password"}
          </h2>
          <p className="mt-2 text-center text-sm leading-6 text-[#776a66]">
            {mode === "login" ? "Or " : mode === "signup" ? "Already have an account? " : "Remembered your password? "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="font-medium text-[#2f5597] hover:text-[#264882]"
            >
              {mode === "login" ? "create a new account" : "sign in instead"}
            </button>
          </p>
        </div>

        {mode === "forgot" ? (
          <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Email address</label>
                <Input
                  required
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={forgotStep === "reset"}
                />
              </div>

              {forgotStep === "reset" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">OTP</label>
                    <Input
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">New Password</label>
                    <Input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Confirm Password</label>
                    <Input
                      required
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(event) => setNewPasswordConfirm(event.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#2f5597] py-6 text-base font-semibold text-white shadow-[0_10px_20px_rgba(47,85,151,0.22)] hover:bg-[#264882]"
            >
              {submitting ? "Please wait..." : forgotStep === "email" ? "Send OTP" : "Reset Password"}
            </Button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={mode === "signup" && signupOtpOpen ? handleVerifySignupOtp : handleSubmit}>
            <div className="space-y-4">
              {mode === "signup" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Full Name</label>
                    <Input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="John Doe"
                      disabled={signupOtpOpen}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Mobile Number</label>
                    <Input
                      required
                      name="phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="10-digit number"
                      disabled={signupOtpOpen}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Email address</label>
                    <Input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={signupOtpOpen}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-[#2b1b15]">Email OTP</label>
                      {signupOtpOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSignupOtpOpen(false);
                            setSignupOtp("");
                          }}
                          disabled={submitting}
                          className="shrink-0 text-xs font-semibold text-[#776a66] hover:text-[#2b1b15] disabled:opacity-60"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                    <Input
                      required={signupOtpOpen}
                      autoFocus={signupOtpOpen}
                      inputMode="numeric"
                      maxLength={6}
                      value={signupOtp}
                      onChange={(event) => setSignupOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                    />
                    <p className="mt-2 text-xs leading-5 text-[#776a66]">
                      {signupOtpOpen ? `OTP sent to ${pendingSignupEmail}.` : "Click Create Account to receive an OTP on your email, then enter it here."}
                    </p>
                    {signupOtpOpen ? (
                      <button
                        type="button"
                        onClick={handleResendSignupOtp}
                        disabled={submitting}
                        className="mt-3 text-sm font-medium text-[#2f5597] hover:text-[#264882] disabled:opacity-60"
                      >
                        Resend OTP
                      </button>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Password</label>
                    <Input
                      required
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      disabled={signupOtpOpen}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Confirm Password</label>
                    <Input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      disabled={signupOtpOpen}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Email or Mobile Number</label>
                    <Input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Email or Phone" />
                  </div>

                  {useOtp ? (
                    otpSent ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-[#2b1b15]">One Time Password</label>
                        <Input
                          required
                          inputMode="numeric"
                          value={otp}
                          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Enter 6-digit OTP"
                        />
                      </div>
                    ) : null
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#2b1b15]">Password</label>
                      <Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-sm font-medium text-[#2f5597] hover:text-[#264882]"
                    >
                      Forgot Password?
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUseOtp(!useOtp);
                        setOtpSent(false);
                        setOtp("");
                      }}
                      className="text-sm font-medium text-[#2f5597] hover:text-[#264882]"
                    >
                      {useOtp ? "Login with password" : "Login with OTP"}
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
                disabled={submitting || (mode === "login" && useOtp && !otpSent) || (mode === "signup" && signupOtpOpen && signupOtp.length !== 6)}
                className="w-full rounded-full bg-[#2f5597] py-6 text-base font-semibold text-white shadow-[0_10px_20px_rgba(47,85,151,0.22)] hover:bg-[#264882]"
              >
                {submitting ? "Please wait..." : mode === "login" ? "Sign In" : mode === "signup" && signupOtpOpen ? "Verify & Create Account" : "Create Account"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
