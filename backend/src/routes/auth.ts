import { Router } from "express";
import { loginSchema, signupSchema, sendOtpSchema } from "../schemas.js";
import { loginUser, signupUser, sendOtp } from "../services/userService.js";

export const authRouter = Router();

authRouter.post("/signup", async (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);
    const data = await signupUser(payload);
    res.status(201).json({
      success: true,
      message: "Signup successful",
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
