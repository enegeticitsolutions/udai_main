/**
 * therapists.ts — Therapist unavailability endpoints
 *
 * POST /api/therapists/unavailability
 * GET /api/therapists/unavailability
 * DELETE /api/therapists/unavailability/:id
 */

import { Router } from "express";
import { TherapistUnavailability } from "../models/TherapistUnavailability.js";
import mongoose from "mongoose";

const therapistsRouter = Router();

/**
 * POST /api/therapists/unavailability
 */
therapistsRouter.post("/unavailability", async (req, res) => {
  try {
    const { therapistId, date, type, startTime, endTime, reason } = req.body ?? {};

    if (!therapistId || !date || !type) {
      res.status(400).json({
        success: false,
        message: "therapistId, date, and type are required.",
      });
      return;
    }

    if (type !== "full" && type !== "partial") {
      res.status(400).json({
        success: false,
        message: "Type must be either 'full' or 'partial'.",
      });
      return;
    }

    const leave = await TherapistUnavailability.create({
      therapistId,
      date,
      type,
      startTime: type === "partial" ? startTime : "",
      endTime: type === "partial" ? endTime : "",
      reason: reason || "",
    });

    res.status(201).json({
      success: true,
      data: {
        id: leave._id.toString(),
        therapistId: leave.therapistId,
        date: leave.date,
        type: leave.type,
        startTime: leave.startTime,
        endTime: leave.endTime,
        reason: leave.reason,
      },
      message: "Unavailability recorded successfully.",
    });
  } catch (error) {
    console.error("[POST /api/therapists/unavailability] Error:", error);
    res.status(500).json({ success: false, message: "Failed to create unavailability record." });
  }
});

/**
 * GET /api/therapists/unavailability
 */
therapistsRouter.get("/unavailability", async (req, res) => {
  try {
    const { therapistId } = req.query;
    const filter = therapistId ? { therapistId: String(therapistId) } : {};

    const leaves = await TherapistUnavailability.find(filter).lean();
    const mapped = leaves.map((doc) => ({
      id: doc._id.toString(),
      therapistId: doc.therapistId,
      date: doc.date,
      type: doc.type,
      startTime: doc.startTime || "",
      endTime: doc.endTime || "",
      reason: doc.reason || "",
    }));

    res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (error) {
    console.error("[GET /api/therapists/unavailability] Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch unavailability records." });
  }
});

/**
 * DELETE /api/therapists/unavailability/:id
 */
therapistsRouter.delete("/unavailability/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid record ID." });
      return;
    }

    const result = await TherapistUnavailability.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Unavailability record not found." });
      return;
    }

    res.json({
      success: true,
      data: { id },
      message: "Unavailability record deleted successfully.",
    });
  } catch (error) {
    console.error("[DELETE /api/therapists/unavailability/:id] Error:", error);
    res.status(500).json({ success: false, message: "Failed to delete unavailability record." });
  }
});

export default therapistsRouter;
