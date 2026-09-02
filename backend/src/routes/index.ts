import { Router } from "express";
import { adminRouter } from "./admin.js";
import { contentRouter } from "./content.js";
import { formsRouter } from "./forms.js";
import { paymentsRouter } from "./payments.js";
import { authRouter } from "./auth.js";
import { userRouter } from "./user.js";
import whatsappRouter from "./whatsapp.js";
import webhookRouter from "./webhook.js";
import msg91BookingRouter from "./msg91Booking.js";
import msg91WebhookRouter from "./msg91Webhook.js";
import bookingRouter from "./booking.js";
import therapistsRouter from "./therapists.js";
import appointmentRouter from "./appointment.js";
import msg91PaymentRouter from "./msg91PaymentWebhook.js";
import { isMongoConnected } from "../lib/mongodb.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "UDAI backend is running",
    timestamp: new Date().toISOString(),
    database: {
      mongo: isMongoConnected() ? "connected" : "disconnected",
    },
  });
});

apiRouter.use("/content", contentRouter);
apiRouter.use("/forms", formsRouter);
apiRouter.use("/payments/razorpay", paymentsRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/razorpay", paymentsRouter);
apiRouter.use("/", paymentsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/whatsapp", whatsappRouter);
apiRouter.use("/webhook", webhookRouter);
apiRouter.use("/msg91-booking", msg91BookingRouter);
apiRouter.use("/webhooks/msg91", msg91WebhookRouter);
apiRouter.use("/msg91", msg91PaymentRouter);
apiRouter.use("/booking", bookingRouter);
apiRouter.use("/therapists", therapistsRouter);
apiRouter.use("/appointments", appointmentRouter);
