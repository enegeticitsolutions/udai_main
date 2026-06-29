import { MongoClient, Db } from "mongodb";
import { config } from "../config.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongoDb() {
  if (db) {
    return db;
  }

  if (!config.mongoUri) {
    return null;
  }

  if (config.mongoUri.includes("<") || config.mongoUri.includes(">")) {
    throw new Error("MONGODB_URI still contains placeholder text. Replace <db_password> with your real MongoDB password.");
  }

  try {
    console.log("Attempting to connect to MongoDB using URI from .env...");
    client = new MongoClient(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(config.mongoDbName);
    console.log("SUCCESS: Connected to MongoDB database:", config.mongoDbName);
    return db;
  } catch (error) {
    console.error("FAILED to connect to MongoDB:", error);
    throw error;
  }
}

export function getMongoDb() {
  if (!db) {
    throw new Error("MongoDB has not been connected yet");
  }

  return db;
}

export function isMongoConnected() {
  return db !== null;
}

export async function closeMongoDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
