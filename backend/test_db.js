const { MongoClient } = require("./node_modules/mongodb");
const dotenv = require("./node_modules/dotenv");
const path = require("path");

// Load .env file in the current directory (since we are inside backend/)
dotenv.config({ path: path.resolve(".env") });

console.log("========================================");
console.log("🔍 BACKEND DIRECTORY DB DIAGNOSTICS");
console.log("========================================");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "udai";

console.log("1. Environment variables loaded from .env:");
console.log("   MONGODB_URI    :", uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, "//USER:***@") : "⚠️  NOT SET!");
console.log("   MONGODB_DB_NAME:", dbName);

if (!uri) {
  console.log("\n❌ ERROR: MONGODB_URI is not set in backend/.env!");
  process.exit(1);
}

async function run() {
  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log("✅ Database connection successful!");

    const db = client.db(dbName);
    const collection = db.collection("therapists");
    const count = await collection.countDocuments();
    console.log(`\n2. Number of therapists in database: ${count}`);

    if (count > 0) {
      const docs = await collection.find({}).toArray();
      console.log("3. Therapist List:");
      docs.forEach(doc => {
        console.log(`   - ID: ${doc.id ?? doc._id} | Name: ${doc.name} | Active: ${doc.active ?? doc.isActive ?? 'not set'}`);
      });
    } else {
      console.log("\n⚠️  Warning: Collection 'therapists' is EMPTY!");
    }
  } catch (error) {
    console.error("\n❌ MongoDB Error:", error);
  } finally {
    if (client) await client.close();
    console.log("========================================");
  }
}
run();
