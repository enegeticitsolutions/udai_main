import { Router } from "express";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema, sendOtpSchema, verifySignupSchema } from "../schemas.js";
import { DUPLICATE_ACCOUNT_MESSAGE, findExistingSignupUser, loginUser, requestPasswordReset, requestSignupVerification, resetPasswordWithOtp, sendOtp, verifySignupOtp } from "../services/userService.js";

export const authRouter = Router();

authRouter.post("/signup", async (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);
    const existingUser = await findExistingSignupUser(payload);

    if (existingUser) {
      res.status(400).json({
        message: DUPLICATE_ACCOUNT_MESSAGE,
      });
      return;
    }

    await requestSignupVerification(payload);
    res.json({
      success: true,
      message: "Signup OTP sent successfully",
      data: {
        email: payload.email.trim().toLowerCase(),
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/signup/verify", async (req, res, next) => {
  try {
    const payload = verifySignupSchema.parse(req.body);
    const data = await verifySignupOtp(payload);
    res.status(201).json({
      success: true,
      message: "Signup verified successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const data = await loginUser(payload);
    res.json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/send-otp", async (req, res, next) => {
  try {
    const payload = sendOtpSchema.parse(req.body);
    await sendOtp(payload.identifier);
    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(payload.email);
    res.json({
      success: true,
      message: "Password reset OTP sent successfully",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    await resetPasswordWithOtp(payload);
    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
});
