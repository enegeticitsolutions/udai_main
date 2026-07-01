import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const allowedOrigins = new Set([
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_ORIGIN,
    process.env.ADMIN_ORIGIN,
]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean));
if ((process.env.NODE_ENV ?? "development") === "development") {
    [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5191",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5191",
    ].forEach((origin) => allowedOrigins.add(origin));
}
export const config = {
    env: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 4000),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    allowedOrigins: Array.from(allowedOrigins),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    mongoUri: process.env.MONGODB_URI ?? "",
    mongoDbName: process.env.MONGODB_DB_NAME ?? "udai",
    projectRoot,
    backendDataDir: path.resolve(projectRoot, "src", "data"),
    frontendDataDir: path.resolve(projectRoot, "..", "frontend", "src", "app", "data"),
    storageDir: path.resolve(projectRoot, "storage"),
    publicUploadBaseUrl: (process.env.PUBLIC_UPLOAD_BASE_URL ?? process.env.PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, ""),
    jwtSecret: process.env.JWT_SECRET || "default_jwt_secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabaseAnon: process.env.SUPABASE_ANON ?? "",
    supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    supabaseBucketName: "product",
};
