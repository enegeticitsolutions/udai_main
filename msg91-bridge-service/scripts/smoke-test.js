import { createServer } from "node:http";
import { createApp } from "../src/app.js";
import { MemoryChatbotSubmissionRepository } from "../src/repositories/MemoryChatbotSubmissionRepository.js";

const repository = new MemoryChatbotSubmissionRepository();
const app = createApp({ repository });
const server = createServer(app);

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
const health = await healthResponse.json();

if (!healthResponse.ok || health.status !== "ok") {
  throw new Error("Health check failed");
}

const webhookResponse = await fetch(`http://127.0.0.1:${port}/api/v1/msg91-webhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    phone: "+919999999999",
    message: "Child needs speech therapy support",
    transactionId: `smoke-${Date.now()}`,
    name: "Test Child",
    age: 7,
    parentName: "Test Parent",
    problem: "Speech delay",
  }),
});
const webhook = await webhookResponse.json();

if (webhookResponse.status !== 201 || !webhook.success) {
  throw new Error(`Webhook check failed: ${JSON.stringify(webhook)}`);
}

await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
console.log("Smoke test passed: server initialized and webhook accepted a payload.");
