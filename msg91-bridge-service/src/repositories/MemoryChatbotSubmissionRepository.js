import { randomUUID } from "node:crypto";
import { ChatbotSubmissionRepository } from "./ChatbotSubmissionRepository.js";

export class MemoryChatbotSubmissionRepository extends ChatbotSubmissionRepository {
  constructor() {
    super();
    this.records = new Map();
  }

  async create(submission) {
    if (this.records.has(submission.transactionId)) {
      const error = new Error("Duplicate transaction ID");
      error.statusCode = 409;
      error.publicMessage = "MSG91 transaction ID already exists";
      throw error;
    }

    const record = {
      id: randomUUID(),
      ...submission,
      createdAt: new Date().toISOString(),
    };
    this.records.set(submission.transactionId, record);
    return record;
  }
}
