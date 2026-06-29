import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  subject: z.string().trim().min(2).max(120).default("Website Inquiry"),
  website: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10).max(2000),
});

export const volunteerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone number must be 10 digits"),
  aadhar: z.string().trim().regex(/^\d{12}$/, "Aadhar must be exactly 12 digits"),
  aadharOther: z.string().trim().max(120).default(""),
  pan: z.string().trim().min(2).max(120),
  panOther: z.string().trim().max(120).default(""),
  fullAddress: z.string().trim().min(2).max(200),
  fullAddressOther: z.string().trim().max(200).default(""),
  interestArea: z.string().trim().min(2).max(120),
  interestAreaOther: z.string().trim().max(120).default(""),
  availability: z.string().trim().min(2).max(120),
  timeFrom: z.string().trim().optional(),
  timeTo: z.string().trim().optional(),
  message: z.string().trim().max(2000).default(""),
});

export const donationIntentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().trim().min(3).max(10).default("INR"),
  purpose: z.string().trim().min(2).max(120),
  message: z.string().trim().max(2000).default(""),
  paymentMethod: z.enum(["qr", "upi", "netbanking", "card"]).optional(),
  donationCategory: z.enum(["meal", "future"]).optional().default("future"),
  campaignName: z.string().trim().max(160).optional(),
  meals: z.coerce.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (data.donationCategory === "future" && data.amount % 1000 !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["amount"],
      message: "Future support donation amount must be in multiples of 1000",
    });
  }
});

export const eventRsvpSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  attendees: z.coerce.number().int().min(1).max(20).default(1),
});

export const therapistInquirySchema = z.object({
  department: z.string().trim().min(2).max(120),
  therapistId: z.coerce.number().int().positive().optional(),
  childName: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(0).max(120),
  referredBy: z.string().trim().min(2).max(120),
  majorConcerns: z.string().trim().min(5).max(2000),
  enquirySource: z.enum(["Given by Tanu", "Direct"]),
  requestType: z.enum(["view-slots", "contact"]).default("contact"),
  bookingAmount: z.coerce.number().positive().default(100),
  sessionAmount: z.coerce.number().positive().default(800),
  paymentMethod: z.enum(["qr", "upi", "netbanking", "card"]).optional(),
  appointmentDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    ,
  appointmentTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const productSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  short_description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().positive().max(1_000_000),
  originalPrice: z.coerce.number().positive().max(1_000_000).optional(),
  discount: z.string().trim().max(80).optional(),
  image: z.string().trim(),
  category: z.string().trim().max(80).default("New Arrival"),
  inStock: z.boolean().default(true),
  sku: z.string().trim().max(100).optional(),
  stock_quantity: z.coerce.number().int().nonnegative().default(0),
  low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
  product_type: z.string().trim().default("simple"),
  gallery: z.array(z.string().trim()).default([]),
  attributes: z.record(z.array(z.string().trim())).optional(),
  has_variants: z.boolean().default(false),
  weight: z.coerce.number().positive().optional(),
  length: z.coerce.number().positive().optional(),
  width: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  meta_title: z.string().trim().max(255).optional(),
  meta_description: z.string().trim().max(1000).optional(),
  meta_keywords: z.string().trim().max(1000).optional(),
  status: z.string().trim().default("active"),
  is_featured: z.boolean().default(false),
  is_trending: z.boolean().default(false),
  tags: z.array(z.string().trim()).default([]),
  isCorporateGift: z.boolean().optional().default(false),
  extra_data: z.record(z.any()).optional(),
});

export const careerSchema = z.object({
  title: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(160),
  type: z.string().trim().min(2).max(80),
  experience: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(5000),
  responsibilities: z.array(z.string().trim().min(1).max(500)).default([]),
  requirements: z.array(z.string().trim().min(1).max(500)).default([]),
  applyLink: z.string().trim().max(500).optional(),
  status: z.enum(["open", "closed"]).default("open"),
});

const shippingAddressSchema = z.object({
  country: z.string().trim().min(2).max(80),
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(7).max(30),
  pincode: z.string().trim().min(3).max(12),
  house: z.string().trim().min(2).max(200),
  area: z.string().trim().min(2).max(200),
  landmark: z.string().trim().max(200).default(""),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  instructions: z.string().trim().max(1000).default(""),
  defaultAddress: z.boolean().default(false),
  email: z.string().trim().email().optional(),
});

const orderItemSchema = z.object({
  productId: z.union([z.coerce.number().int().positive(), z.string().trim().min(1)]),
  title: z.string().trim().min(2).max(160),
  price: z.coerce.number().positive().max(1_000_000),
  quantity: z.coerce.number().int().positive(),
  image: z.string().trim().min(1),
  category: z.string().trim().max(80).optional(),
});

export const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().optional(),
  customerPhone: z.string().trim().min(7).max(30),
  shippingAddress: shippingAddressSchema,
  items: z.array(orderItemSchema).min(1),
  subtotal: z.coerce.number().positive(),
  shippingAmount: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().positive(),
  currency: z.string().trim().min(3).max(10).default("INR"),
  paymentMethod: z.enum(["qr", "upi", "card", "netbanking"]),
  paymentStatus: z.enum(["initiated", "pending", "paid", "failed"]).default("initiated"),
  orderStatus: z.enum(["new", "confirmed", "packed", "shipped", "delivered", "cancelled"]).default("new"),
  notes: z.string().trim().max(2000).default(""),
});

export const signupSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const input = raw as Record<string, unknown>;
  const submittedPhone = input.phone ?? input.mobileNumber;
  const phone = typeof submittedPhone === "string" ? submittedPhone.trim() : submittedPhone;

  return {
    ...input,
    phone: phone || undefined,
  };
}, z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(6).max(100),
  phone: z.string().trim().min(7).max(30).optional(),
}));

export const verifySignupSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export const loginSchema = z.object({
  identifier: z.string().trim(),
  password: z.string().optional(),
  otp: z.string().optional(),
}).refine((data) => data.password || data.otp, {
  message: "Password or OTP is required",
  path: ["password"],
});

export const sendOtpSchema = z.object({
  identifier: z.string().trim(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
  password: z.string().min(6).max(100),
});

export const cartItemSchema = z.object({
  product: z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().trim().min(1),
    price: z.coerce.number().min(0),
    image: z.string().trim(),
  }).passthrough(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema).default([]),
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(15),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().trim().min(3).max(12),
  addressLine1: z.string().trim().min(2).max(200),
  addressLine2: z.string().trim().max(200).optional(),
});
