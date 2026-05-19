export interface BlogPost {
  id: number;
  title: string;
  date: string;
  author: string;
  category: string;
  image: string;
  excerpt: string;
  readTime: string;
}

export interface EventItem {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
  category: string;
  attendees: number;
}

export interface Product {
  id: string | number;
  title: string;
  slug?: string;
  description?: string;
  short_description?: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  image: string;
  category: string;
  inStock: boolean;
  sku?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  product_type: string;
  gallery: string[];
  attributes?: Record<string, string[]>;
  has_variants: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  status: string;
  is_featured: boolean;
  is_trending: boolean;
  tags: string[];
  extra_data?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  quote: string;
  rating: number;
}

export interface Therapist {
  id: number;
  name: string;
  image: string;
  department: string;
  role: string;
  summary: string;
}

export interface EducationProgram {
  slug: string;
  title: string;
  shortDescription: string;
  heroImage: string;
  gallery: string[];
  accent: string;
  overview: string[];
  highlights: string[];
  outcomes: string[];
}

export interface BlogStory {
  id: number;
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  excerpt: string;
  heroImage: string;
  gallery: string[];
  intro: string[];
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface VolunteerSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  aadhar: string;
  aadharOther: string;
  pan: string;
  panOther: string;
  fullAddress: string;
  fullAddressOther: string;
  interestArea: string;
  interestAreaOther: string;
  availability: string;
  message: string;
  createdAt: string;
}

export interface DonationIntent {
  id: string;
  name: string;
  email: string;
  amount: number;
  currency: string;
  purpose: string;
  message: string;
  paymentMethod?: "qr" | "upi" | "netbanking" | "card";
  createdAt: string;
}

export interface EventRsvp {
  id: string;
  eventId: number;
  name: string;
  email: string;
  attendees: number;
  createdAt: string;
}

export interface TherapistInquiry {
  id: string;
  department: string;
  therapistId?: number;
  childName: string;
  age: number;
  referredBy: string;
  majorConcerns: string;
  enquirySource: "Given by Tanu" | "Direct";
  requestType: "view-slots" | "contact";
  bookingAmount: number;
  sessionAmount: number;
  paymentMethod?: "qr" | "upi" | "netbanking" | "card";
  appointmentDate: string;
  appointmentTime: string;
  assignedTherapist?: string;
  assignmentMode?: "Auto-assigned" | "Manual override";
  assignmentNote?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
}

export interface ShippingAddress {
  country: string;
  fullName: string;
  mobile: string;
  pincode: string;
  house: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  instructions: string;
  defaultAddress: boolean;
  email?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: "qr" | "upi" | "card" | "netbanking";
  paymentStatus: "initiated" | "pending" | "paid" | "failed";
  orderStatus: "new" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
  notes: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayAmount?: number;
  razorpayCurrency?: string;
  razorpayReceipt?: string;
  razorpayStatus?: string;
  razorpayQrCodeId?: string;
  razorpayQrImageUrl?: string;
  razorpayQrImageContent?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TherapistAvailabilitySlot {
  time: string;
  label: string;
  totalTherapists: number;
  bookedCount: number;
  availableCount: number;
  isAvailable: boolean;
}

export interface TherapistAvailabilityResponse {
  department: string;
  date: string;
  slots: TherapistAvailabilitySlot[];
}

export interface CareerOpportunity {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  applyLink: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDocument extends Omit<User, "id"> {
  _id?: import("mongodb").ObjectId;
  password: string;
  otp?: string;
  otpExpiry?: string;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  addressLine1: string;
  addressLine2?: string;
  createdAt: string;
  updatedAt?: string;
}
