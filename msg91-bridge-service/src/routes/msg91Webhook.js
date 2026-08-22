import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import { mapMsg91Payload } from "../services/payloadMapper.js";

const msg91WebhookRouter = Router();

msg91WebhookRouter.post("/", apiKeyAuth, async (req, res, next) => {
  try {
    const payload = mapMsg91Payload(req.body);

    const errors = [];
    if (!payload.phone || payload.phone.length < 8 || payload.phone.length > 32) {
      errors.push("Phone number must be between 8 and 32 characters");
    }
    if (!payload.message || payload.message.length > 4000) {
      errors.push("Message is required and must not exceed 4000 characters");
    }
    if (!payload.transactionId || payload.transactionId.length < 3 || payload.transactionId.length > 160) {
      errors.push("Transaction ID must be between 3 and 160 characters");
    }

    const age = payload.userDetails?.age;
    if (age !== undefined && age !== null) {
      if (!Number.isInteger(age) || age < 0 || age > 120) {
        errors.push("Age must be an integer between 0 and 120");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${errors.join("; ")}`,
        errors,
      });
    }

    const record = await req.repository.create(payload);

    return res.status(201).json({
      success: true,
      message: "MSG91 chatbot data recorded",
      data: {
        id: record.id ?? record._id ?? "recorded",
        transactionId: record.transactionId,
        receivedAt: record.createdAt ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default msg91WebhookRouter;