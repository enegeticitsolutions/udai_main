import { Router } from "express";
import { body, matchedData, validationResult } from "express-validator";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import { mapMsg91Payload } from "../services/payloadMapper.js";

export function createMsg91WebhookRouter(repository) {
  const router = Router();

  // Sabhi incoming requests ke liye ngrok warning bypass automatically set karne ke liye layer
  router.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
  });

  router.post(
    "/msg91-webhook",
    apiKeyAuth,
    [
      body("phone").optional({ checkFalsy: true }).isString().trim().isLength({ min: 8, max: 32 }),
      body("user_phone").optional({ checkFalsy: true }).isString().trim().isLength({ min: 8, max: 32 }),
      body("message").optional({ checkFalsy: true }).isString().trim().isLength({ min: 1, max: 4000 }),
      body("responseBody").optional({ checkFalsy: true }).isString().trim().isLength({ min: 1, max: 4000 }),
      body("user_message").optional({ checkFalsy: true }).isString().trim().isLength({ min: 1, max: 4000 }),
      body("transactionId").optional({ checkFalsy: true }).isString().trim().isLength({ min: 3, max: 160 }),
      body("msg91TransactionId").optional({ checkFalsy: true }).isString().trim().isLength({ min: 3, max: 160 }),
      body("transaction_id").optional({ checkFalsy: true }).isString().trim().isLength({ min: 3, max: 160 }),
      body("age").optional({ checkFalsy: true }).isInt({ min: 0, max: 120 })
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

        // Live database validation safety check
        if (payload.transactionId && req.body.eventName !== 'replied') {
          payload.transactionId = `${payload.transactionId}_${Date.now()}`;
        }

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

  // Verification routes for GET pings
  router.get("/msg91-webhook", (req, res) => {
    return res.status(200).json({ success: true, message: "MSG91 Webhook Endpoint Active (GET)" });
  });

  router.get("/test-webhook", (req, res) => {
    return res.status(200).json({ success: true, message: "Test Webhook Endpoint Active (GET)" });
  });

  // ------------ TEST ROUTE ------------
  router.post("/test-webhook", async (req, res) => {
    try {
      console.log("--- MSG91 RAW PAYLOAD ---");
      console.log(JSON.stringify(req.body, null, 2));

      const mapped = mapMsg91Payload(req.body);

      // MongoDB E11000 Duplicate Key Error bypass injection
      if (mapped.transactionId) {
        mapped.transactionId = `${mapped.transactionId}_${Date.now()}`;
      }

      console.log("--- MAPPED PAYLOAD ---");
      console.log(mapped);

      const missing = [];
      if (!mapped.phone) missing.push("phone (customerNumber)");
      if (!mapped.message) missing.push("message (content)");
      if (!mapped.transactionId) missing.push("transactionId (requestId/uuid)");

      if (missing.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Cannot save: missing required fields after mapping: ${missing.join(", ")}`,
          rawPayload: req.body,
          mappedPayload: mapped,
        });
      }

      const record = await repository.create(mapped);

      return res.status(201).json({
        success: true,
        message: "MSG91 webhook data recorded successfully!",
        data: {
          id: record.id,
          phone: record.phone,
          transactionId: record.transactionId,
          eventName: req.body.eventName,
          receivedAt: record.createdAt,
        }
      });
    } catch (error) {
      console.error("Webhook Save Error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}