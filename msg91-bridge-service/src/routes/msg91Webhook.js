import { Router } from "express";
import { body, matchedData, validationResult } from "express-validator";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import { mapMsg91Payload } from "../services/payloadMapper.js";

export function createMsg91WebhookRouter(repository) {
  const router = Router();

  router.post(
    "/msg91-webhook",
    apiKeyAuth,
    [
      body("phone")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 8, max: 32 })
        .withMessage("phone must be 8 to 32 characters"),
      body("user_phone")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 8, max: 32 })
        .withMessage("user_phone must be 8 to 32 characters"),
      body("message")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 1, max: 4000 })
        .withMessage("message must be 1 to 4000 characters"),
      body("responseBody")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 1, max: 4000 })
        .withMessage("responseBody must be 1 to 4000 characters"),
      body("user_message")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 1, max: 4000 })
        .withMessage("user_message must be 1 to 4000 characters"),
      body("transactionId")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 3, max: 160 })
        .withMessage("transactionId must be 3 to 160 characters"),
      body("msg91TransactionId")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 3, max: 160 })
        .withMessage("msg91TransactionId must be 3 to 160 characters"),
      body("transaction_id")
        .optional({ checkFalsy: true })
        .isString()
        .trim()
        .isLength({ min: 3, max: 160 })
        .withMessage("transaction_id must be 3 to 160 characters"),
      body("age")
        .optional({ checkFalsy: true })
        .isInt({ min: 0, max: 120 })
        .withMessage("age must be between 0 and 120"),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            success: false,
            message: "Invalid MSG91 webhook payload",
            errors: errors.array(),
          });
        }

        const payload = mapMsg91Payload({ ...req.body, ...matchedData(req, { locations: ["body"] }) });
        const missingFields = [];
        if (!payload.phone) missingFields.push("phone");
        if (!payload.message) missingFields.push("message");
        if (!payload.transactionId) missingFields.push("transactionId");

        if (missingFields.length > 0) {
          return res.status(422).json({
            success: false,
            message: `Missing required field(s): ${missingFields.join(", ")}`,
          });
        }

        const record = await repository.create(payload);
        return res.status(201).json({
          success: true,
          message: "MSG91 chatbot data recorded",
          data: {
            id: record.id,
            transactionId: record.transactionId,
            receivedAt: record.createdAt,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}
