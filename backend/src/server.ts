import { createApp } from "./app.js";
import { config } from "./config.js";
import { ensureStorageDir } from "./lib/fileStore.js";
import { closeMongoDb, connectMongoDb } from "./lib/mongodb.js";

async function bootstrap() {
  await ensureStorageDir();
  const mongoDb = await connectMongoDb();
  if (!mongoDb) {
    console.warn("MongoDB connection skipped because MONGODB_URI is not set");
  } else {
    console.log(`MongoDB connected to database: ${config.mongoDbName}`);
  }

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`UDAI backend listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  closeMongoDb().catch(() => {
    // Ignore cleanup errors during startup failure.
  });
  process.exit(1);
});
