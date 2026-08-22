import dotenv from "dotenv";

dotenv.config();

function required(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5009),
  corsOrigins: String(process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  webhookApiKey: required("WEBHOOK_API_KEY"),
  dbDriver: process.env.DB_DRIVER ?? "mongodb",
  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/msg91_bridge"),
  mongoDbName: process.env.MONGODB_DB_NAME ?? "udai",
};
