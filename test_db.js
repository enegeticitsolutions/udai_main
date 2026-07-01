const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const path = require("path");

// Load backend .env file explicitly
dotenv.config({ path: path.resolve("backend", ".env") });

console.log("========================================");
console.log("🔍 SERVER DATABASE DIAGNOSTICS");
console.log("========================================");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "udai";

console.log("1. Loaded Environment Variables from backend/.env:");
console.log("   MONGODB_URI    :", uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, "//USER:***@") : "⚠️  NOT SET!");
console.log("   MONGODB_DB_NAME:", dbName);

if (!uri) {
  console.log("\n❌ ERROR: MONGODB_URI is missing in backend/.env!");
  console.log("Please copy the MONGODB_URI from your local .env to the server's backend/.env.");
  process.exit(1);
}

async function run() {
  let client;
  try {
    console.log("\n2. Attempting connection to MongoDB...");
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log("✅ Connection SUCCESS!");

    const db = client.db(dbName);
    
    // Check collections
    const collections = await db.listCollections().toArray();
    console.log(`\n3. Collections found in database '${dbName}':`);
    if (collections.length === 0) {
      console.log("   ⚠️  No collections found! Is this the correct database name?");
    } else {
      collections.forEach(col => console.log("   -", col.name));
    }

    // Check therapists collection count
    const therapistsCollection = db.collection("therapists");
    const count = await therapistsCollection.countDocuments();
    console.log(`\n4. Documents in 'therapists' collection: ${count}`);

    if (count > 0) {
      const sampleDocs = await therapistsCollection.find({}).limit(3).toArray();
      console.log("   Sample records from database:");
      sampleDocs.forEach(doc => {
        console.log(`     - Name: ${doc.name} | Active: ${doc.active ?? doc.isActive ?? 'not set'} | ID: ${doc.id ?? doc._id}`);
      });
    } else {
      console.log("   ⚠️  Collection is EMPTY!");
      console.log("   This means the backend is connecting to a database/cluster that has no data.");
      console.log("   Please check if the server's backend/.env is pointing to the same Atlas DB as your local machine.");
    }

  } catch (error) {
    console.error("\n❌ MongoDB Connection Error:", error);
  } finally {
    if (client) {
      await client.close();
    }
    console.log("\n========================================");
  }
}

run();
