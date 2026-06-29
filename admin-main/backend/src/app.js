import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "node:path";
import { config } from "./config.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();
  const allowedOrigins = config.allowedOrigins.length > 0 ? config.allowedOrigins : [config.corsOrigin];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
    }),
  );
  app.use(express.json());
  app.use(morgan("dev"));
  app.use("/uploads", express.static(config.sharedUploadDir));

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "UDAI standalone admin backend",
      docs: {
        admin: "/api/admin/*",
      },
    });
  });

  app.use("/api/admin", adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });

  return app;
}
