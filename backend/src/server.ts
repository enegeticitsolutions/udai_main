import { createApp } from "./app.js";
import { config } from "./config.js";
import { ensureStorageDir } from "./lib/fileStore.js";

async function bootstrap() {
  await ensureStorageDir();

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`UDAI backend listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
