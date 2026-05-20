import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { writeJsonFile } from "./lib/fileStore.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "./lib/mongodb.js";
import { therapists as seedTherapists, products as seedProducts } from "./data/seedData.js";

async function seedData() {
  const therapistsPath = path.join(config.storageDir, "therapists.json");
  await fs.mkdir(config.storageDir, { recursive: true });
  await writeJsonFile(therapistsPath, seedTherapists);

  const productsPath = path.join(config.storageDir, "products.json");
  await writeJsonFile(productsPath, seedProducts);

  try {
    await connectMongoDb();
  } catch (error) {
    console.warn("MongoDB connection failed. Saved data to backend storage only.");
    console.warn(error instanceof Error ? error.message : String(error));
    return;
  }

  if (!isMongoConnected()) {
    console.warn("MongoDB is not connected. Saved data to backend storage only.");
    return;
  }

  const now = new Date().toISOString();

  const therapistsCol = getMongoDb().collection("therapists");
  for (const therapist of seedTherapists) {
    await therapistsCol.updateOne(
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

  const productsCol = getMongoDb().collection("products");
  for (const product of seedProducts) {
    const filter = product.id ? { id: product.id } : { title: product.title };
    await productsCol.updateOne(
      filter,
      {
        $set: {
          ...product,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded ${seedProducts.length} products into MongoDB.`);
}

seedData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Data seeding failed", error);
    process.exit(1);
  });
