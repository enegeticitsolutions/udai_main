import { Router } from "express";
import { handlePaymentWebhook } from "../controllers/paymentWebhookController.js";

export const paymentWebhookRouter = Router();

// POST /api/payment-webhook
paymentWebhookRouter.post("/", handlePaymentWebhook);
paymentWebhookRouter.post("/payment-webhook", handlePaymentWebhook);

// GET /api/payment-webhook (Health ping)
paymentWebhookRouter.get("/", (_req, res) => {
  res.status(200).json({ success: true, message: "Payment webhook endpoint is active" });
});
paymentWebhookRouter.get("/payment-webhook", (_req, res) => {
  res.status(200).json({ success: true, message: "Payment webhook endpoint is active" });
});

export default paymentWebhookRouter;
