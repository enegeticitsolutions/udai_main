import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI ?? "",
  mongoDbName: process.env.MONGODB_DB_NAME ?? "udai",
  projectRoot,
  backendDataDir: path.resolve(projectRoot, "src", "data"),
  frontendDataDir: path.resolve(projectRoot, "..", "frontend", "src", "app", "data"),
  storageDir: path.resolve(projectRoot, "storage"),
};
