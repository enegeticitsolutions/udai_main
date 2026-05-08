import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { writeJsonFile } from "./lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "./lib/mongodb.js";
import { therapists as seedTherapists } from "./data/seedData.js";

async function seedTherapistsToMongo() {
  const storageFilePath = path.join(config.storageDir, "therapists.json");
  await fs.mkdir(config.storageDir, { recursive: true });
  await writeJsonFile(storageFilePath, seedTherapists);

  try {
    await connectMongoDb();
  } catch (error) {
    console.warn("MongoDB connection failed. Saved therapists to backend storage only.");
    console.warn(error instanceof Error ? error.message : String(error));
    return;
  }

  if (!isMongoConnected()) {
    console.warn("MongoDB is not connected. Saved therapists to backend storage only.");
    return;
  }

  const collection = getMongoDb().collection("therapists");
  const now = new Date().toISOString();

  for (const therapist of seedTherapists) {
    await collection.updateOne(
      { id: therapist.id },
      {
        $set: {
          ...therapist,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  console.log(`Seeded ${seedTherapists.length} therapists into MongoDB.`);
}

seedTherapistsToMongo()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Therapist seeding failed", error);
    process.exit(1);
  });
