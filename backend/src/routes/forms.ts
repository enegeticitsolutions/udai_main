import { Router } from "express";
import { appendRecord } from "../lib/fileStore.js";
import {
  contactSchema,
  donationIntentSchema,
  eventRsvpSchema,
  therapistInquirySchema,
  volunteerSchema,
} from "../schemas.js";
import { getEvents, getTherapists } from "../services/contentService.js";
export const formsRouter = Router();

formsRouter.post("/contact", async (req, res, next) => {
  try {
    const payload = contactSchema.parse(req.body);
    const record = await appendRecord("contacts.json", payload);
    res.status(201).json({ success: true, message: "Contact message received", data: record });
  } catch (error) {
    next(error);
  }
});

formsRouter.post("/volunteers", async (req, res, next) => {
  try {
    const payload = volunteerSchema.parse(req.body);
    const record = await appendRecord("volunteers.json", payload);
    res.status(201).json({ success: true, message: "Volunteer application received", data: record });
  } catch (error) {
    next(error);
  }
});

formsRouter.post("/donations", async (req, res, next) => {
  try {
    const payload = donationIntentSchema.parse(req.body);
    const record = await appendRecord("donations.json", payload);
    res.status(201).json({ success: true, message: "Donation intent recorded", data: record });
  } catch (error) {
    next(error);
  }
});

formsRouter.post("/events/rsvp", async (req, res, next) => {
  try {
    const payload = eventRsvpSchema.parse(req.body);
    const events = await getEvents();
    const eventExists = events.some((event) => event.id === payload.eventId);

    if (!eventExists) {
      res.status(404).json({ success: false, message: "Event not found" });
      return;
    }

    const record = await appendRecord("event-rsvps.json", payload);
    res.status(201).json({ success: true, message: "RSVP submitted", data: record });
  } catch (error) {
    next(error);
  }
});

formsRouter.post("/therapists/inquiries", async (req, res, next) => {
  try {
    const payload = therapistInquirySchema.parse(req.body);
    const therapists = await getTherapists();
    const therapistExists = therapists.some((therapist) => therapist.id === payload.therapistId);

    if (!therapistExists) {
      res.status(404).json({ success: false, message: "Therapist not found" });
      return;
    }

    const record = await appendRecord("therapist-inquiries.json", payload);
    res.status(201).json({ success: true, message: "Therapist request submitted", data: record });
  } catch (error) {
    next(error);
  }
});
