import { Router } from "express";
import { sendWhatsAppMessage } from "../services/whatsappService.js";

const router = Router();

// Endpoint for booking appointment via WhatsApp
router.post("/book-appointment", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number is required" });
  }

  // Use the 'udai' template as provided in the user's curl command
  const result = await sendWhatsAppMessage({
    to: phone,
    templateName: "udai",
    languageCode: "en"
  });

  if (result.success) {
    res.json({ success: true, message: "WhatsApp message sent successfully", data: result.data });
  } else {
    res.status(500).json({ success: false, message: result.error });
  }
});

export default router;
