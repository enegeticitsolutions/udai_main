import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectMongo } from "./db/mongoose.js";
import { createChatbotSubmissionRepository } from "./repositories/index.js";

async function main() {
  if (env.dbDriver === "mongodb") {
    await connectMongo();
    console.log("MongoDB connected");
  }

  const repository = createChatbotSubmissionRepository();
  const app = createApp({ repository });

  app.listen(env.port, () => {
    console.log(`MSG91 bridge service listening on http://localhost:${env.port}`);
  });
}

main().catch((error) => {
  console.error("Failed to start MSG91 bridge service", error);
  process.exit(1);
});
