import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
// 1. CHANGE: Direct default import kiya hai bina curly braces {} ke
import msg91WebhookRouter from "./routes/msg91Webhook.js";

export function createApp({ repository }) {
  const app = express();
  app.set("trust proxy", 1);

  // NGROK BYPASS MIDDLEWARE
  app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
  });

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

  // 2. CHANGE: Repository ko request mein attach kar diya taaki agar services ko zaroorat ho toh use kar sakein
  app.use((req, _res, next) => {
    req.repository = repository;
    next();
  });

  // 3. CHANGE: Router object ko bina call kiye seedhe clean paths par mount kar diya
  app.use("/api/v1/msg91-webhook", msg91WebhookRouter);
  app.use("/webhook", msg91WebhookRouter); 

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}