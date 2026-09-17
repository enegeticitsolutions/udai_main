import axios from "axios";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { updateAdminRecord } from "./adminService.js";
import type { Order } from "../types.js";

/**
 * Static origin address for UDAI shipments.
 */
export const ENVIA_ORIGIN_ADDRESS = {
  name: "UDAI, working together works",
  company: "UDAI",
  phone: "+91 88827 24057",
  email: "airishmultibrand487@gmail.com",
  street: "WZ 12B, Village Asalatpur",
  area: "Janak Puri",
  district: "Janak Puri",
  city: "New Delhi",
  state: "DL",
  country: "IN",
  postalCode: "110058",
};

/**
 * Normalizes phone numbers to standard format (digits only, removing non-numeric characters).
 */
function normalizePhone(phone?: string): string {
  if (!phone) return "8882724057";
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.slice(-10) || "8882724057";
}

/**
 * Normalizes country name to 2-letter ISO code.
 */
function normalizeCountryCode(country?: string): string {
  if (!country) return "IN";
  const c = country.trim().toLowerCase();
  if (c === "india" || c === "in") return "IN";
  if (c === "united states" || c === "usa" || c === "us") return "US";
  if (c === "united kingdom" || c === "uk" || c === "gb") return "GB";
  if (c === "uganda" || c === "ug") return "UG";
  return country.trim().toUpperCase().slice(0, 2);
}

/**
 * Builds the payload required by Envia POST /ship/generate API.
 */
export function buildEnviaShipmentPayload(order: Partial<Order> & Record<string, any>) {
  const shippingAddress: any = order.shippingAddress || {};
  const customerName = (
    order.customerName ||
    shippingAddress.fullName ||
    shippingAddress.name ||
    "Customer"
  ).trim();

  const customerPhone = normalizePhone(
    order.customerPhone || shippingAddress.mobile || shippingAddress.phone,
  );

  const customerEmail = (
    order.customerEmail ||
    shippingAddress.email ||
    order.email ||
    "airishmultibrand487@gmail.com"
  ).trim();

  const street = [
    shippingAddress.house || shippingAddress.addressLine1 || "",
    shippingAddress.landmark || "",
  ]
    .filter(Boolean)
    .join(", ") || "Main Street";

  const district = (
    shippingAddress.area ||
    shippingAddress.addressLine2 ||
    shippingAddress.locality ||
    shippingAddress.city ||
    "Central"
  ).trim();

  const city = (shippingAddress.city || "New Delhi").trim();
  const state = (shippingAddress.state || "DL").trim();
  const postalCode = (shippingAddress.pincode || shippingAddress.postalCode || "110001").trim();
  const country = normalizeCountryCode(shippingAddress.country);

  // Calculate items summary and declared value
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0) || 1;
  const declaredValue = Number(order.totalAmount || order.subtotal || order.amount || 100);

  const orderNumber = order.orderNumber || order.localOrderId || `ORD-${Date.now()}`;

  return {
    origin: {
      name: ENVIA_ORIGIN_ADDRESS.name,
      company: ENVIA_ORIGIN_ADDRESS.company,
      phone: normalizePhone(ENVIA_ORIGIN_ADDRESS.phone),
      email: ENVIA_ORIGIN_ADDRESS.email,
      street: "Village Asalatpur",
      number: "WZ 12B",
      district: ENVIA_ORIGIN_ADDRESS.area,
      city: ENVIA_ORIGIN_ADDRESS.city,
      state: ENVIA_ORIGIN_ADDRESS.state,
      country: ENVIA_ORIGIN_ADDRESS.country,
      postalCode: ENVIA_ORIGIN_ADDRESS.postalCode,
    },
    destination: {
      name: customerName,
      company: shippingAddress.company || "",
      phone: customerPhone,
      email: customerEmail,
      street: shippingAddress.area || shippingAddress.street || street || "Main Road",
      number: String(shippingAddress.house || shippingAddress.number || "1"),
      district,
      city,
      state,
      country,
      postalCode,
    },
    packages: [
      {
        content: `UDAI Products - ${orderNumber} (${itemCount} item${itemCount > 1 ? "s" : ""})`,
        amount: 1,
        type: "box",
        dimensions: {
          length: 15,
          width: 15,
          height: 10,
        },
        weight: Math.max(0.5, Math.min(itemCount * 0.5, 10)),
        insurance: 0,
        declaredValue,
      },
    ],
    shipment: {
      carrier: "delhivery",
      service: "standard",
      type: 1,
    },
    settings: {
      printFormat: "PDF",
      printSize: "STOCK_4X6",
      comments: `UDAI Order ${orderNumber}`,
    },
  };
}

export interface EnviaShipmentResult {
  success: boolean;
  trackingNumber?: string;
  shippingLabelUrl?: string;
  enviaShipmentId?: string | number;
  carrier?: string;
  error?: string;
  rawResponse?: any;
}

/**
 * Calls Envia API to generate a shipment label.
 */
export async function createEnviaShipment(
  order: Partial<Order> & Record<string, any>,
): Promise<EnviaShipmentResult> {
  const apiKey = config.enviaApiKey;
  const apiUrl = config.enviaApiUrl || "https://api.envia.com/ship/generate";

  if (!apiKey || apiKey === "your_copied_api_key_here") {
    console.warn("⚠️ [Envia Shipping]: ENVIA_API_KEY is not configured in environment variables. Shipment creation skipped.");
    return {
      success: false,
      error: "ENVIA_API_KEY is not configured",
    };
  }

  const payload = buildEnviaShipmentPayload(order);
  const orderNumber = order.orderNumber || order.localOrderId || "N/A";

  console.log(`📦 [Envia Shipping]: Initiating shipment generation for Order ${orderNumber}...`);
  console.log(`  Endpoint: POST ${apiUrl}`);
  console.log(`  Destination: ${payload.destination.name}, ${payload.destination.city}, ${payload.destination.postalCode}, ${payload.destination.country}`);

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    const body = response.data;
    console.log("📦 [Envia Shipping API Response Status]:", response.status, body?.meta || "OK");

    if (body?.meta === "error") {
      const errorMsg = body?.message || body?.error?.message || "Envia API returned meta: error";
      console.error("🚨 [Envia Shipping Error]:", errorMsg, JSON.stringify(body, null, 2));
      return {
        success: false,
        error: errorMsg,
        rawResponse: body,
      };
    }

    // Extract tracking info from Envia response variations (can be array or single object)
    let itemData = body?.data;
    if (Array.isArray(itemData) && itemData.length > 0) {
      itemData = itemData[0];
    }

    const trackingNumber =
      itemData?.trackingNumber ||
      itemData?.tracking_number ||
      itemData?.trackingCode ||
      itemData?.trackUrl ||
      body?.trackingNumber ||
      "";

    const shippingLabelUrl =
      itemData?.label ||
      itemData?.labelUrl ||
      itemData?.label_url ||
      body?.label ||
      "";

    const enviaShipmentId =
      itemData?.shipmentId ||
      itemData?.shipment_id ||
      itemData?.id ||
      body?.shipmentId ||
      "";

    const carrier =
      itemData?.carrier ||
      itemData?.carrier_name ||
      payload.shipment.carrier ||
      "delhivery";

    console.log(`✅ [Envia Shipment Created Successfully]:`);
    console.log(`  Tracking Number: ${trackingNumber}`);
    console.log(`  Label URL: ${shippingLabelUrl}`);
    console.log(`  Shipment ID: ${enviaShipmentId}`);

    return {
      success: true,
      trackingNumber,
      shippingLabelUrl,
      enviaShipmentId,
      carrier,
      rawResponse: body,
    };
  } catch (err: any) {
    const errorDetails = err?.response?.data || err?.message || err;
    console.error("🚨 [Envia Shipping API Request Failed]:", JSON.stringify(errorDetails, null, 2));
    return {
      success: false,
      error: err?.response?.data?.message || err?.message || "Failed to create shipment on Envia",
      rawResponse: err?.response?.data,
    };
  }
}

/**
 * Checks if the given record represents an e-commerce shop order (has physical items to ship).
 */
export function isShopPhysicalOrder(record: any): boolean {
  if (!record) return false;
  const isDonationCategory =
    record.category === "meal" ||
    record.category === "future" ||
    record.donationCategory === "meal" ||
    record.donationCategory === "future";

  if (isDonationCategory) return false;

  const hasItems = Array.isArray(record.items) && record.items.length > 0;
  const hasShippingAddress = Boolean(record.shippingAddress && (record.shippingAddress.pincode || record.shippingAddress.city));
  const isShopCategory = record.category === "shop" || record.donationCategory === "shop";

  return hasItems || hasShippingAddress || isShopCategory;
}

/**
 * Automatically creates Envia shipment and saves tracking & label URL into MongoDB & file store.
 */
export async function processEnviaShipmentForOrder(orderRecord: any): Promise<EnviaShipmentResult | null> {
  if (!orderRecord) return null;

  // Don't ship donations or bookings
  if (!isShopPhysicalOrder(orderRecord)) {
    return null;
  }

  // Avoid creating duplicate shipments if already created
  if (orderRecord.trackingNumber || orderRecord.shippingProcessed || orderRecord.enviaShipmentId) {
    console.log(`ℹ️ [Envia Shipping]: Order already has shipment processed (Tracking: ${orderRecord.trackingNumber || orderRecord.enviaShipmentId}). Skipping.`);
    return {
      success: true,
      trackingNumber: orderRecord.trackingNumber,
      shippingLabelUrl: orderRecord.shippingLabelUrl,
      enviaShipmentId: orderRecord.enviaShipmentId,
      carrier: orderRecord.carrier,
    };
  }

  const result = await createEnviaShipment(orderRecord);

  if (result.success && (result.trackingNumber || result.shippingLabelUrl || result.enviaShipmentId)) {
    const patch: Record<string, any> = {
      trackingNumber: result.trackingNumber || "",
      shippingLabelUrl: result.shippingLabelUrl || "",
      enviaShipmentId: result.enviaShipmentId || "",
      carrier: result.carrier || "delhivery",
      shippingStatus: "label_created",
      shippingProcessed: true,
      enviaCreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const localOrderId = orderRecord.localOrderId || orderRecord.id || String(orderRecord._id || "");

    // Update MongoDB
    if (isMongoConnected()) {
      const matchCriteria = {
        $or: [
          ...(orderRecord.razorpayPaymentLinkId ? [{ razorpayPaymentLinkId: orderRecord.razorpayPaymentLinkId }] : []),
          ...(orderRecord.razorpayPaymentId ? [{ razorpayPaymentId: orderRecord.razorpayPaymentId }] : []),
          ...(orderRecord.localOrderId ? [{ localOrderId: orderRecord.localOrderId }] : []),
          ...(orderRecord.orderNumber ? [{ orderNumber: orderRecord.orderNumber }] : []),
          ...(orderRecord._id ? [{ _id: orderRecord._id }] : []),
          ...(ObjectId.isValid(localOrderId) ? [{ _id: new ObjectId(localOrderId) }] : []),
        ],
      };

      try {
        await getMongoDb().collection("orders").updateMany(matchCriteria, { $set: patch });
        console.log(`💾 [Envia Shipping]: Order updated in MongoDB with Tracking (${result.trackingNumber}) & Label URL`);
      } catch (dbErr) {
        console.error("🚨 [Envia Shipping DB Update Error]:", dbErr);
      }
    }

    // Update JSON file store
    if (localOrderId) {
      try {
        await updateAdminRecord("orders", localOrderId, patch);
      } catch (fileErr) {
        console.warn("⚠️ [Envia Shipping File Store Update Warning]:", fileErr);
      }
    }
  }

  return result;
}
