import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
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
