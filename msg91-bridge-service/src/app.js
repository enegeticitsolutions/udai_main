import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createMsg91WebhookRouter } from "./routes/msg91Webhook.js";

export function createApp({ repository }) {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ success: true, status: "ok" });
  });

  // Mount at /api/v1 → handles /api/v1/test-webhook, /api/v1/msg91-webhook
  // Mount at /api/v1/msg91-webhook → handles /api/v1/msg91-webhook/test-webhook (MSG91 compatibility)
  const webhookRouter = createMsg91WebhookRouter(repository);
  app.use("/api/v1", webhookRouter);
  app.use("/api/v1/msg91-webhook", webhookRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
