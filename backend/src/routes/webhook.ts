import { Router } from "express";
import { handleWebhook, verifyWebhook } from "../controllers/webhookController.js";

const webhookRouter = Router();

// GET  /api/webhook  — verification ping (MSG91 / Meta)
webhookRouter.get("/", verifyWebhook);

// POST /api/webhook  — incoming WhatsApp messages
webhookRouter.post("/", handleWebhook);

export default webhookRouter;
