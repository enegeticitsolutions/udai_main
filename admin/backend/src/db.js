import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "udai";

if (!uri) {
  throw new Error("MONGODB_URI is not set for admin backend");
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
});

let db;

export async function connectDb() {
  if (db) return db;
  await client.connect();
  db = client.db(dbName);
  return db
}

export async function closeDb() {
  if (client) {
    await client.close();
  }
}
