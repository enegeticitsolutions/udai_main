import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
async function cleanOrders() {
    console.log("🧹 Cleaning mock orders from MongoDB...");
    await connectMongoDb();
    if (isMongoConnected()) {
        const db = getMongoDb();
        const result = await db.collection("orders").deleteMany({
            $or: [
                { id: { $regex: /^ord_mock/i } },
                { id: { $regex: /^ord_past/i } },
                { orderNumber: { $regex: /^ORD-1789/i } },
                { customerName: "Aarav Sharma" },
                { customerName: "Priya Patel" },
                { customerName: "Vikram Sengupta" },
                { customerName: "Anita Sharma" },
                { customerName: "Rahul Verma" },
            ],
        });
        console.log(`✅ Deleted ${result.deletedCount} mock order(s) from MongoDB collection 'orders'.`);
    }
    else {
        console.warn("⚠️ MongoDB not connected.");
    }
    process.exit(0);
}
cleanOrders().catch((err) => {
    console.error("🚨 Error cleaning orders:", err);
    process.exit(1);
});
