import { ChatbotSubmissionRepository } from "./ChatbotSubmissionRepository.js";
import { ChatbotSubmission } from "../models/ChatbotSubmission.js";

export class MongoChatbotSubmissionRepository extends ChatbotSubmissionRepository {
  async create(submission) {
    try {
      const document = await ChatbotSubmission.create(submission);
      return {
        id: document._id.toString(),
        phone: document.phone,
        transactionId: document.transactionId,
        createdAt: document.createdAt,
      };
    } catch (error) {
      if (error?.code === 11000) {
        error.statusCode = 409;
        error.publicMessage = "MSG91 transaction ID already exists";
      }
      throw error;
    }
  }
}
