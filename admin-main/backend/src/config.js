import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const allowedOrigins = new Set(
  [process.env.CORS_ORIGIN, process.env.FRONTEND_ORIGIN, process.env.ADMIN_ORIGIN]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean),
);

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5003),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5191",
  allowedOrigins: Array.from(allowedOrigins),
  mongoUri: process.env.MONGODB_URI ?? "",
  mongoDbName: process.env.MONGODB_DB_NAME ?? "udai",
  projectRoot,
  storageDir: path.resolve(projectRoot, "backend-storage"),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnon: process.env.SUPABASE_ANON ?? "",
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseBucketName: "product",
};
