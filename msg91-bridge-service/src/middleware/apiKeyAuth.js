import { env } from "../config/env.js";

export function apiKeyAuth(req, res, next) {
  if (!env.webhookApiKey && env.nodeEnv !== "production") {
    return next();
  }

  const receivedKey = String(req.header("x-api-key") ?? "").trim();
  if (!receivedKey || receivedKey !== env.webhookApiKey) {
    return res.status(401).json({
      success: false,
      message: "Invalid or missing API key",
    });
  }

  return next();
}
