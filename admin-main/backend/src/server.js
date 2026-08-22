import { createApp } from "./app.js";
import { config } from "./config.js";

async function bootstrap() {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Standalone admin backend running on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start standalone admin backend", error);
  process.exit(1);
});
