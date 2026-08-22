import { env } from "../config/env.js";
import { MemoryChatbotSubmissionRepository } from "./MemoryChatbotSubmissionRepository.js";
import { MongoChatbotSubmissionRepository } from "./MongoChatbotSubmissionRepository.js";

export function createChatbotSubmissionRepository() {
  if (env.dbDriver === "memory") {
    return new MemoryChatbotSubmissionRepository();
  }

  if (env.dbDriver !== "mongodb") {
    throw new Error(`Unsupported DB_DRIVER: ${env.dbDriver}`);
  }

  return new MongoChatbotSubmissionRepository();
}
