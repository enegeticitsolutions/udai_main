import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();
  const allowedOrigins = config.corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);

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

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "UDAI backend API",
      docs: {
        health: "/api/health",
        content: "/api/content/*",
        forms: "/api/forms/*",
      },
    });
  });

  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
