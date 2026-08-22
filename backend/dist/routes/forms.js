import { Router } from "express";
import { appendRecord } from "../lib/fileStore.js";
import { contactSchema, donationIntentSchema, eventRsvpSchema, orderSchema, therapistInquirySchema, volunteerSchema, } from "../schemas.js";
import { getEvents } from "../services/contentService.js";
import { getDepartmentAvailability, reserveDepartmentTherapist } from "../services/appointmentAvailabilityService.js";
import { getDonationConfirmationTemplate, sendEmail } from "../services/emailService.js";
export const formsRouter = Router();
formsRouter.post("/contact", async (req, res, next) => {
    try {
        const payload = contactSchema.parse(req.body);
        const record = await appendRecord("contacts.json", payload);
        res.status(201).json({ success: true, message: "Contact message received", data: record });
    }
    catch (error) {
        next(error);
    }
});
formsRouter.post("/volunteers", async (req, res, next) => {
    try {
        const payload = volunteerSchema.parse(req.body);
        const record = await appendRecord("volunteers.json", payload);
        res.status(201).json({ success: true, message: "Volunteer application received", data: record });
    }
    catch (error) {
        next(error);
    }
});
formsRouter.post("/donations", async (req, res, next) => {
    try {
        const payload = donationIntentSchema.parse(req.body);
        const transactionId = `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const record = await appendRecord("donations.json", {
            ...payload,
            transactionId,
            date: new Date().toISOString(),
        });
        // Send confirmation email
        const emailHtml = getDonationConfirmationTemplate({
            donorName: payload.name,
            transactionId,
            amount: payload.amount,
            date: new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
        });
        // Send confirmation email (non-blocking)
        sendEmail({
            to: payload.email,
            subject: "Thank You for Investing in Their Future | Donation Confirmation - UDAI",
            html: emailHtml,
        }).catch(err => console.error("Background email sending error:", err));
        res.status(201).json({ success: true, message: "Donation recorded successfully. A confirmation email has been sent to your address.", data: record });
    }
    catch (error) {
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
    }
    catch (error) {
        next(error);
    }
});
formsRouter.post("/therapists/inquiries", async (req, res, next) => {
    try {
        const payload = therapistInquirySchema.parse(req.body);
        const assignedTherapist = await reserveDepartmentTherapist(payload.department, payload.appointmentDate, payload.appointmentTime);
        if (!assignedTherapist) {
            res.status(409).json({
                success: false,
                message: "Selected slot is fully booked. Please choose another available time.",
            });
            return;
        }
        const enrichedRecord = await appendRecord("therapist-inquiries.json", {
            ...payload,
            assignedTherapist: assignedTherapist.name,
            assignmentMode: "Auto-assigned",
            assignmentNote: "Slot reserved",
        });
        res.status(201).json({ success: true, message: "Therapist request submitted", data: enrichedRecord });
    }
    catch (error) {
        next(error);
    }
});
formsRouter.get("/therapists/availability", async (req, res, next) => {
    try {
        const department = String(req.query.department ?? "").trim();
        const date = String(req.query.date ?? "").trim();
        if (!department || !date) {
            res.status(400).json({ success: false, message: "department and date are required" });
            return;
        }
        const slots = await getDepartmentAvailability(department, date);
        res.json({ success: true, data: { department, date, slots } });
    }
    catch (error) {
        next(error);
    }
});
formsRouter.post("/orders", async (req, res, next) => {
    try {
        const payload = orderSchema.parse(req.body);
        const orderNumber = `ORD-${Date.now()}`;
        const record = await appendRecord("orders.json", {
            ...payload,
            orderNumber,
        });
        res.status(201).json({ success: true, message: "Order recorded successfully", data: record });
    }
    catch (error) {
        next(error);
    }
});
