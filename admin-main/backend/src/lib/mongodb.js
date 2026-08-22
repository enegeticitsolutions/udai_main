import { MongoClient } from "mongodb";
import { config } from "../config.js";

let client;
let db;

export async function connectMongoDb() {
  if (db || !config.mongoUri) {
    return db;
  }

  if (!client) {
    client = new MongoClient(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
  }

  await client.connect();
  db = client.db(config.mongoDbName);
  return db;
}

export function isMongoConnected() {
  return Boolean(db);
}

export function getMongoDb() {
  if (!db) {
    throw new Error("MongoDB is not connected");
  }

  return db;
}
