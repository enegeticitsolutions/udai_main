import { Router } from "express";
import { MongoServerError } from "mongodb";
import { ZodError } from "zod";
import { saveMsg91Appointment } from "../services/msg91AppointmentService.js";

const msg91BookingRouter = Router();

/**
 * Backward-compatible alias for older MSG91 bot flow nodes.
 * New integrations should call POST /api/webhooks/msg91.
 */
msg91BookingRouter.post("/", async (req, res) => {
  console.info("[MSG91 legacy booking] Incoming payload:", JSON.stringify(req.body));
  try {
    const { appointment, duplicate } = await saveMsg91Appointment(req.body);
    res.status(duplicate ? 200 : 201).json({
      success: true,
      data: appointment,
      message: duplicate ? "Duplicate booking already recorded" : "Booking saved successfully",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn("[MSG91 legacy booking] Validation failed:", error.flatten());
      res.status(422).json({ success: false, message: "Invalid booking payload", errors: error.flatten().fieldErrors });
      return;
    }

    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(200).json({ success: true, message: "Duplicate booking already recorded" });
      return;
    }

    console.error("[MSG91 legacy booking] Database save failed:", error);
    res.status(500).json({ success: false, message: "Failed to save booking" });
  }
});

export default msg91BookingRouter;
