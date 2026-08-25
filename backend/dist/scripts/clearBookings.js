import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
async function clearBookings() {
    console.log("=== Clearing All Appointment & Webhook Data ===");
    // 1. Clear storage/appointments.json
    const jsonPath = path.join(config.storageDir, "appointments.json");
    try {
        await fs.writeFile(jsonPath, JSON.stringify([], null, 2), "utf-8");
        console.log("✅ Cleared storage/appointments.json");
    }
    catch (err) {
        console.warn("⚠️ Could not clear appointments.json:", err.message);
    }
    // 2. Clear MongoDB collections if connected
    try {
        await connectMongoDb();
        if (isMongoConnected()) {
            const db = getMongoDb();
            const apptResult = await db.collection("appointments").deleteMany({});
            console.log(`✅ Cleared MongoDB 'appointments' collection (${apptResult.deletedCount} items removed)`);
            const webhookResult = await WebhookMessage.deleteMany({});
            console.log(`✅ Cleared MongoDB 'webhookmessages' collection (${webhookResult.deletedCount} items removed)`);
        }
        else {
            console.log("⚠️ MongoDB not connected; JSON file cleared.");
        }
    }
    catch (dbErr) {
        console.error("❌ Failed to clear MongoDB collections:", dbErr.message);
    }
    console.log("=== All Bookings Cleared Successfully ===");
    process.exit(0);
}
clearBookings().catch((err) => {
    console.error("Error clearing bookings:", err);
    process.exit(1);
});
