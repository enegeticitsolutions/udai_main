import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(2000),
});

export const volunteerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(30),
  interestArea: z.string().trim().min(2).max(120),
  availability: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(2000),
});

export const donationIntentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().trim().min(3).max(10).default("INR"),
  purpose: z.string().trim().min(2).max(120),
  message: z.string().trim().max(2000).default(""),
  paymentMethod: z.enum(["qr", "upi", "netbanking", "card"]).optional(),
});

export const eventRsvpSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  attendees: z.coerce.number().int().min(1).max(20).default(1),
});

export const therapistInquirySchema = z.object({
  therapistId: z.coerce.number().int().positive(),
  childName: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(0).max(120),
  referredBy: z.string().trim().min(2).max(120),
  majorConcerns: z.string().trim().min(5).max(2000),
  enquirySource: z.enum(["Given by Tanu", "Direct"]),
  requestType: z.enum(["view-slots", "contact"]),
  appointmentDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const productSchema = z.object({
  title: z.string().trim().min(2).max(160),
  price: z.coerce.number().positive().max(1_000_000),
  image: z.string().trim().url(),
  category: z.string().trim().max(80).default("New Arrival"),
  inStock: z.boolean().default(true),
});
