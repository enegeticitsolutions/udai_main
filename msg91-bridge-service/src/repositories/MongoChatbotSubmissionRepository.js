import { ChatbotSubmissionRepository } from "./ChatbotSubmissionRepository.js";
import { ChatbotSubmission } from "../models/ChatbotSubmission.js";

export class MongoChatbotSubmissionRepository extends ChatbotSubmissionRepository {
  async create(submission) {
    try {
      const eventEntry = {
        eventName: submission.rawPayload?.eventName ?? "",
        statusCode: String(submission.rawPayload?.statusCode ?? ""),
        ts: submission.rawPayload?.ts ?? new Date().toISOString(),
      };

      // Upsert: if same transactionId exists, just push the new event.
      // If not, create a new document.
      const document = await ChatbotSubmission.findOneAndUpdate(
        { transactionId: submission.transactionId },
        {
          $setOnInsert: {
            phone: submission.phone,
            message: submission.message,
            transactionId: submission.transactionId,
            userDetails: submission.userDetails,
            source: submission.source,
            rawPayload: submission.rawPayload,
          },
          $push: { events: eventEntry },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      return {
        id: document._id.toString(),
        phone: document.phone,
        transactionId: document.transactionId,
        eventName: eventEntry.eventName,
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
