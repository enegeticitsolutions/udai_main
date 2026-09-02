import { Router } from "express";
import { handleMsg91PaymentWebhook } from "../controllers/msg91PaymentWebhookController.js";
export const msg91PaymentRouter = Router();
// POST /api/msg91/payment-webhook
msg91PaymentRouter.post("/payment-webhook", handleMsg91PaymentWebhook);
// Also support direct POST /payment-webhook or root POST /
msg91PaymentRouter.post("/", handleMsg91PaymentWebhook);
// Verification ping (GET)
msg91PaymentRouter.get("/payment-webhook", (_req, res) => {
    res.status(200).json({ success: true, message: "MSG91 Payment Webhook endpoint is active" });
});
export default msg91PaymentRouter;
