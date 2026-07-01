import { createApp } from "./app.js";
import { config } from "./config.js";
import { ensureStorageDir } from "./lib/fileStore.js";
import { closeMongoDb, connectMongoDb } from "./lib/mongodb.js";
async function bootstrap() {
    // Print startup diagnostics for production debugging
    const rawUri = process.env.MONGODB_URI ?? "";
    const maskedUri = rawUri
        ? rawUri.replace(/\/\/([^:]+):([^@]+)@/, "//USER:***@")
        : "(not set - will use file fallback)";
    console.log("=== UDAI Backend Starting ===");
    console.log(`  NODE_ENV       : ${process.env.NODE_ENV ?? "development"}`);
    console.log(`  PORT           : ${config.port}`);
    console.log(`  MONGODB_URI    : ${maskedUri}`);
    console.log(`  MONGODB_DB_NAME: ${config.mongoDbName}`);
    console.log("================================");
    await ensureStorageDir();
    const mongoDb = await connectMongoDb();
    if (!mongoDb) {
        console.warn("⚠️  MongoDB NOT connected - MONGODB_URI missing or connection failed. Therapists will return empty.");
    }
    else {
        console.log(`✅ MongoDB connected to database: ${config.mongoDbName}`);
    }
    const app = createApp();
    app.listen(config.port, () => {
        console.log(`🚀 UDAI backend listening on http://localhost:${config.port}`);
    });
}
bootstrap().catch((error) => {
    console.error("Failed to start backend", error);
    closeMongoDb().catch(() => {
        // Ignore cleanup errors during startup failure.
    });
    process.exit(1);
});
