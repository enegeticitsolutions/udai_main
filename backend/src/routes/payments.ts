import crypto from "node:crypto";
import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { config } from "../config.js";
import { appendRecord } from "../lib/fileStore.js";
import { getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { optionalJwt, type AuthenticatedRequest } from "../middleware/auth.js";
import { updateAdminRecord } from "../services/adminService.js";
import { orderSchema } from "../schemas.js";
import type { Order } from "../types.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
import { razorpay, getRazorpayInstance } from "../lib/razorpay.js";
import { getDonationConfirmationTemplate, getOrderConfirmationTemplate, sendEmail } from "../services/emailService.js";

async function triggerConfirmationEmailIfPaid(record: {
  customerEmail?: string;
  email?: string;
  customerName?: string;
  name?: string;
  totalAmount?: number;
  amount?: number;
  razorpayPaymentId?: string;
  razorpayPaymentLinkId?: string;
  orderNumber?: string;
  id?: string;
  localOrderId?: string;
  category?: string;
  items?: any[];
  shippingAddress?: any;
  emailSent?: boolean;
  _id?: any;
}) {
  const recipientEmail = (record.customerEmail || record.email || "").trim();
  if (!recipientEmail || record.emailSent) return;

  const customerName = (record.customerName || record.name || "Customer").trim();
  const amount = Number(record.totalAmount || record.amount || 0);
  const orderNumber = record.orderNumber || record.localOrderId || `ORD-${Date.now()}`;
  const transactionId = record.razorpayPaymentId || record.razorpayPaymentLinkId || orderNumber;
  const date = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isShopOrder = record.category === "shop" || (record.items && record.items.length > 0);

  const emailSubject = isShopOrder
    ? `Order Confirmed: ${orderNumber} | UDAI Shop`
    : "Thank You for Investing in Their Future | Donation Confirmation - UDAI";

  const emailHtml = isShopOrder
    ? getOrderConfirmationTemplate({
        customerName,
        orderNumber,
        transactionId,
        amount,
        date,
        items: record.items,
        shippingAddress: record.shippingAddress,
      })
    : getDonationConfirmationTemplate({
        donorName: customerName,
        transactionId,
        amount,
        date,
      });

  console.log(`📧 Sending ${isShopOrder ? "shop order" : "donation"} confirmation email to: ${recipientEmail} (Transaction: ${transactionId}, Amount: ₹${amount})`);

  try {
    await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (isMongoConnected()) {
      const matchCriteria = {
        $or: [
          ...(record.razorpayPaymentLinkId ? [{ razorpayPaymentLinkId: record.razorpayPaymentLinkId }] : []),
          ...(record.razorpayPaymentId ? [{ razorpayPaymentId: record.razorpayPaymentId }] : []),
          ...(record.localOrderId ? [{ localOrderId: record.localOrderId }] : []),
          ...(record._id ? [{ _id: record._id }] : []),
        ],
      };
      await getMongoDb().collection("orders").updateMany(matchCriteria, { $set: { emailSent: true } });
      await getMongoDb().collection("donations").updateMany(matchCriteria, { $set: { emailSent: true } });
    }
  } catch (emailErr) {
    console.error("🚨 Failed to send confirmation email:", emailErr);
  }
}

export const paymentsRouter = Router();
paymentsRouter.use(optionalJwt);

const razorpayCheckoutSchema = orderSchema;

const razorpayVerifySchema = z.object({
  localOrderId: z.string().trim().min(1),
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
  paymentMethod: z.enum(["qr", "upi", "card", "netbanking"]).optional(),
});

function requireRazorpayConfig() {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw new Error("Razorpay keys are not configured on the backend");
  }
}

function buildAuthorizationHeader() {
  requireRazorpayConfig();
  const token = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");
  return `Basic ${token}`;
}

async function createGatewayOrder(amountPaise: number, receipt: string) {
  try {
    const rzp = getRazorpayInstance();
    const order = await rzp.orders.create({
      amount: Math.round(amountPaise),
      currency: "INR",
      receipt,
    });
    console.log("[Razorpay Gateway Order Created Successfully]:", order.id);
    return order;
  } catch (error: any) {
    console.error("🚨 Razorpay API Error in createGatewayOrder:", JSON.stringify(error, null, 2), error);
    const description = error?.error?.description || error?.message || "Unable to create Razorpay order";
    throw new Error(description);
  }
}

async function createGatewayQrCode(amountPaise: number, orderNumber: string, localOrderId: string) {
  const finalPaise = Math.round(Number(amountPaise));
  const keyId = config.razorpayKeyId;
  const keyPrefix = keyId.substring(0, 12);

  const requestPayload = {
    type: "upi_qr",
    name: "UDAI Rehab",
    usage: "single_use",
    fixed_amount: true,
    payment_amount: finalPaise,
    description: "UDAI Rehab Payment",
    close_by: Math.floor(Date.now() / 1000) + 30 * 60,
    notes: {
      localOrderId,
      orderNumber,
    },
  };

  console.log("=== RAZORPAY QR CODE API DEBUG ===");
  console.log("  Key ID prefix:", keyPrefix + "...");
  console.log("  Key type:", keyId.startsWith("rzp_live_") ? "🟢 LIVE" : keyId.startsWith("rzp_test_") ? "🟡 TEST" : "❌ UNKNOWN");
  console.log("  API endpoint: POST https://api.razorpay.com/v1/payments/qr_codes");
  console.log("  Request payload:", JSON.stringify(requestPayload, null, 2));
  console.log("  Amount: ₹" + (finalPaise / 100) + " (" + finalPaise + " paise)");
  console.log("==================================");

  const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
    method: "POST",
    headers: {
      Authorization: buildAuthorizationHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  const rawText = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(rawText);
  } catch {
    console.error("🚨 Razorpay returned non-JSON response:", rawText);
    throw new Error("Razorpay returned invalid response");
  }

  console.log("=== RAZORPAY QR CODE API RESPONSE ===");
  console.log("  HTTP Status:", response.status, response.statusText);
  console.log("  Response body:", JSON.stringify(payload, null, 2));
  console.log("=====================================");

  if (!response.ok) {
    const description =
      payload?.error?.description || payload?.message || "Unable to create Razorpay QR code";
    console.error("🚨 Razorpay QR Code Error:", description);
    throw new Error(description);
  }

  if (!payload.id || !payload.image_url) {
    console.error("🚨 Razorpay QR response missing id or image_url:", payload);
    throw new Error("Razorpay QR code response was invalid");
  }

  console.log("✅ Razorpay QR Code created:", payload.id, "image_url:", payload.image_url);
  return payload;
}



function getAuthenticatedUserId(req: Request) {
  return (req as Partial<AuthenticatedRequest>).user?.id;
}

async function persistUserOrder(userId: string | undefined, order: Order) {
  if (!userId || !isMongoConnected()) return;

  const { _id, ...orderWithoutMongoId } = order as unknown as Record<string, unknown> & { _id?: ObjectId };
  const localOrderId = String(order.id);
  const orderPatch = {
    ...orderWithoutMongoId,
    localOrderId,
    userId,
    updatedAt: new Date().toISOString(),
  };

  const collection = getMongoDb().collection("orders");

  if (_id instanceof ObjectId) {
    await collection.updateOne({ _id }, { $set: orderPatch });
    return;
  }

  if (ObjectId.isValid(localOrderId)) {
    await collection.updateOne({ _id: new ObjectId(localOrderId) }, { $set: orderPatch });
    return;
  }

  await collection.updateOne(
    { id: localOrderId },
    {
      $set: orderPatch,
      $setOnInsert: { createdAt: order.createdAt ?? new Date().toISOString() },
    },
    { upsert: true },
  );
}

async function updatePersistedUserOrder(localOrderId: string, patch: Record<string, unknown>) {
  if (!isMongoConnected()) return;
  await getMongoDb().collection("orders").updateMany(
    {
      $or: [
        { localOrderId },
        ...(ObjectId.isValid(localOrderId) ? [{ _id: new ObjectId(localOrderId) }] : []),
      ],
    },
    {
      $set: {
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}

paymentsRouter.post("/razorpay/order", async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const userId = getAuthenticatedUserId(req);
    const payload = razorpayCheckoutSchema.parse(req.body);
    const orderNumber = `ORD-${Date.now()}`;
    const localOrder = await appendRecord<Order, Record<string, unknown>>("orders.json", {
      ...payload,
      userId,
      orderNumber,
      paymentStatus: "initiated",
      orderStatus: "new",
      razorpayStatus: "created",
    });
    await persistUserOrder(userId, localOrder);

    const gatewayOrder = await createGatewayOrder(Math.round(Number(payload.totalAmount) * 100), orderNumber);

    const orderPatch = {
      razorpayOrderId: gatewayOrder.id,
      razorpayAmount: gatewayOrder.amount,
      razorpayCurrency: gatewayOrder.currency,
      razorpayReceipt: gatewayOrder.receipt ?? orderNumber,
      paymentStatus: "initiated",
      orderStatus: "new",
    };
    const updatedOrder = await updateAdminRecord("orders", localOrder.id, orderPatch);
    await updatePersistedUserOrder(localOrder.id, orderPatch);

    res.status(201).json({
      success: true,
      message: "Razorpay order created",
      data: {
        order: updatedOrder ?? localOrder,
        razorpay: {
          keyId: config.razorpayKeyId,
          orderId: gatewayOrder.id,
          amount: gatewayOrder.amount,
          currency: gatewayOrder.currency,
          name: "UDAI",
          description: `Payment for ${orderNumber}`,
          prefill: {
            name: payload.customerName,
            email: payload.customerEmail ?? "",
            contact: payload.customerPhone,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/razorpay/qr-code", async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const userId = getAuthenticatedUserId(req);
    const payload = razorpayCheckoutSchema.parse({
      ...req.body,
      paymentMethod: "qr",
    });
    const orderNumber = `ORD-${Date.now()}`;
    const localOrder = await appendRecord<Order, Record<string, unknown>>("orders.json", {
      ...payload,
      userId,
      orderNumber,
      paymentMethod: "qr",
      paymentStatus: "initiated",
      orderStatus: "new",
      razorpayStatus: "qr_created",
    });
    await persistUserOrder(userId, localOrder);

    const amountPaise = Math.round(Number(payload.totalAmount) * 100);
    let qrCode;

    try {
      qrCode = await createGatewayQrCode(amountPaise, orderNumber, localOrder.id);
    } catch (qrError: any) {
      console.error("🚨 Razorpay QR creation error in POST /orders:", qrError?.message || qrError);
      throw new Error(qrError?.message || "Failed to create Razorpay QR Code via API.");
    }

    const orderPatch = {
      razorpayQrCodeId: qrCode.id,
      razorpayQrImageUrl: qrCode.image_url,
      razorpayQrImageContent: qrCode.image_content,
      razorpayAmount: qrCode.payment_amount,
      razorpayCurrency: "INR",
      paymentMethod: "qr",
      paymentStatus: "initiated",
      orderStatus: "new",
      razorpayStatus: qrCode.status,
    };
    const updatedOrder = await updateAdminRecord("orders", localOrder.id, orderPatch);
    await updatePersistedUserOrder(localOrder.id, orderPatch);

    res.status(201).json({
      success: true,
      message: "Razorpay QR code created",
      data: {
        order: updatedOrder ?? localOrder,
        qrCode: {
          id: qrCode.id,
          status: qrCode.status,
          imageUrl: qrCode.image_url,
          imageContent: qrCode.image_content,
          amount: qrCode.payment_amount,
          currency: "INR",
          isFallback: "isFallback" in qrCode ? qrCode.isFallback : false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/razorpay/verify", async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const payload = razorpayVerifySchema.parse(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== payload.razorpaySignature) {
      res.status(400).json({
        success: false,
        message: "Razorpay signature verification failed",
      });
      return;
    }

    const orderPatch = {
      paymentStatus: "paid",
      orderStatus: "confirmed",
      paymentMethod: payload.paymentMethod ?? "card",
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      razorpaySignature: payload.razorpaySignature,
    };
    const updatedOrder = await updateAdminRecord("orders", payload.localOrderId, orderPatch);
    await updatePersistedUserOrder(payload.localOrderId, orderPatch);

    if (!updatedOrder) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/create-order (and /api/payments/create-order)
 * Body: { amount: number, currency?: string, receipt?: string, notes?: object }
 * Creates a Razorpay Order ID via Razorpay SDK and returns order details.
 */
paymentsRouter.post("/create-order", async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const { amount, amountInPaise, currency = "INR", receipt, notes } = req.body ?? {};

    const rawAmount = amountInPaise ?? amount;
    if (!rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
      res.status(400).json({ success: false, message: "Valid payment amount is required" });
      return;
    }

    // Convert INR to Paise (e.g. ₹1000 -> 100000 paise).
    // If amountInPaise was explicitly provided, use it as-is.
    const finalAmountInPaise = amountInPaise
      ? Math.round(Number(amountInPaise))
      : Math.round(Number(amount) * 100);

    const orderReceipt = receipt || `rcpt_${Date.now()}`;

    console.log(`[Razorpay Order Init] KeyID: ${config.razorpayKeyId}, Amount: ₹${amount || finalAmountInPaise / 100} (${finalAmountInPaise} paise)`);

    const rzp = getRazorpayInstance();
    const order = await rzp.orders.create({
      amount: finalAmountInPaise,
      currency: currency || "INR",
      receipt: orderReceipt,
      notes: notes || {},
    });

    console.log("✅ [Razorpay Order Created Successfully]:", order.id);

    res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      order,
      keyId: config.razorpayKeyId,
    });
  } catch (error: any) {
    console.error("🚨 [POST /api/create-order] Razorpay Error Details:", JSON.stringify(error, null, 2), error);
    const description = error?.error?.description || error?.description || error?.message || "Failed to create Razorpay order";
    res.status(400).json({
      success: false,
      message: description,
      error: error?.error || error,
    });
  }
});

/**
 * POST /api/verify-payment (and /api/payments/verify-payment)
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies HMAC-SHA256 signature using RAZORPAY_KEY_SECRET.
 */
paymentsRouter.post("/verify-payment", async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};

    console.log("[Razorpay Verify Received]:", { razorpay_order_id, razorpay_payment_id, razorpay_signature });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
      return;
    }

    // HMAC-SHA256 signature calculation using key secret
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn("⚠️ [Razorpay Signature Mismatch]: Expected:", expectedSignature, "Received:", razorpay_signature);
      res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid signature",
      });
      return;
    }

    console.log("✅ [Razorpay Verification Success] Payment ID:", razorpay_payment_id, "Order ID:", razorpay_order_id);

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (error: any) {
    console.error("🚨 [POST /api/verify-payment] Verification Error:", JSON.stringify(error, null, 2), error);
    res.status(500).json({
      success: false,
      message: error?.message || "Payment verification failed",
      error,
    });
  }
});

/**
 * POST /api/create-payment-link (and /api/payments/create-payment-link, /api/payments/razorpay/create-payment-link)
 * Body: { amount: number, customerName?: string, customerEmail?: string, customerPhone?: string, purpose?: string, donationCategory?: string, callbackUrl?: string }
 * Creates a Razorpay Payment Link using the Razorpay Payment Links API.
 */
paymentsRouter.post(["/create-payment-link", "/razorpay/create-payment-link"], async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const userId = getAuthenticatedUserId(req);
    const body = req.body ?? {};
    const rawAmount = body.amountInPaise ?? body.amount ?? body.totalAmount;

    if (!rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
      res.status(400).json({ success: false, message: "Valid payment amount is required" });
      return;
    }

    const amountInPaise = body.amountInPaise
      ? Math.round(Number(body.amountInPaise))
      : Math.round(Number(rawAmount) * 100);

    const amountInr = amountInPaise / 100;
    const customerName = (body.customerName || body.name || "Supporter").trim();
    const customerEmail = (body.customerEmail || body.email || "").trim();
    const customerPhone = (body.customerPhone || body.phone || "").trim();
    const purpose = (body.purpose || body.description || "UDAI Rehab Support").trim();
    const category = (body.donationCategory || body.category || "general").trim();

    const origin = req.headers.origin || "https://udairehab.org";
    const callbackUrl = body.callbackUrl || `${origin}/donation-success`;

    const rzp = getRazorpayInstance();
    const paymentLinkPayload: any = {
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: `Donation: ${purpose}`,
      customer: {
        name: customerName,
        email: customerEmail || undefined,
        contact: customerPhone || undefined,
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      callback_url: callbackUrl,
      callback_method: "get",
      notes: {
        customerName,
        customerEmail,
        customerPhone,
        purpose,
        category,
        userId: userId || "",
      },
    };

    console.log("=== RAZORPAY PAYMENT LINK API DEBUG ===");
    console.log("  Key ID:", config.razorpayKeyId.substring(0, 15) + "...");
    console.log("  Key type:", config.razorpayKeyId.startsWith("rzp_live_") ? "🟢 LIVE" : "🟡 TEST");
    console.log("  Amount: ₹" + amountInr + " (" + amountInPaise + " paise)");
    console.log("  Customer:", customerName, customerEmail, customerPhone);
    console.log("  Callback URL:", callbackUrl);
    console.log("=======================================");

    const paymentLink = await rzp.paymentLink.create(paymentLinkPayload);

    console.log("✅ [Razorpay Payment Link Created Successfully]:", paymentLink.id, paymentLink.short_url);

    // Save order/donation details to DB and JSON file store
    const items = body.items || [];
    const shippingAddress = body.shippingAddress || null;
    const orderNumber = `ORD-LINK-${Date.now()}`;
    const localOrder = await appendRecord<Order, Record<string, unknown>>("orders.json", {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      subtotal: body.subtotal || amountInr,
      shippingAmount: body.shippingAmount || 0,
      totalAmount: amountInr,
      currency: "INR",
      paymentMethod: "payment_link",
      paymentStatus: "initiated",
      orderStatus: "new",
      userId,
      orderNumber,
      razorpayPaymentLinkId: paymentLink.id,
      razorpayPaymentLinkUrl: paymentLink.short_url,
      razorpayStatus: paymentLink.status || "created",
      purpose,
      category,
    });
    await persistUserOrder(userId, localOrder);

    // Also persist to donations collection in MongoDB if connected
    if (isMongoConnected()) {
      try {
        await getMongoDb().collection("donations").insertOne({
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          amount: amountInr,
          currency: "INR",
          purpose,
          category,
          paymentLinkId: paymentLink.id,
          paymentLinkUrl: paymentLink.short_url,
          paymentStatus: "initiated",
          createdAt: new Date().toISOString(),
          localOrderId: localOrder.id,
        });
      } catch (mongoErr) {
        console.warn("⚠️ Failed to write to donations collection:", mongoErr);
      }
    }

    res.status(201).json({
      success: true,
      message: "Razorpay payment link created successfully",
      short_url: paymentLink.short_url,
      paymentLinkUrl: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
      amount: amountInr,
      localOrderId: localOrder.id,
    });
  } catch (error: any) {
    console.error("🚨 [POST /api/create-payment-link] Error:", error);
    const description = error?.error?.description || error?.description || error?.message || "Failed to create Razorpay Payment Link";
    res.status(400).json({
      success: false,
      message: description,
      error: error?.error || error,
    });
  }
});

/**
 * GET /api/payments/razorpay/verify-link-status
 * Aliases: /api/payments/verify-link-status, /api/verify-link-status
 * Checks Razorpay Payment Link status directly from Razorpay API or DB.
 */
paymentsRouter.get(["/verify-link-status", "/razorpay/verify-link-status"], async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const paymentLinkId = String(req.query.paymentLinkId || req.query.razorpay_payment_link_id || "").trim();
    const paymentId = String(req.query.paymentId || req.query.razorpay_payment_id || "").trim();
    const statusParam = String(req.query.razorpay_payment_link_status || "").trim();

    if (!paymentLinkId && !paymentId) {
      res.status(400).json({ success: false, message: "paymentLinkId or paymentId is required" });
      return;
    }

    const rzp = getRazorpayInstance();
    let linkData: any = null;

    if (paymentLinkId) {
      try {
        linkData = await rzp.paymentLink.fetch(paymentLinkId);
      } catch (fetchErr) {
        console.warn("⚠️ Could not fetch payment link from Razorpay:", fetchErr);
      }
    }

    const isPaid = (linkData && linkData.status === "paid") || statusParam === "paid" || Boolean(paymentId);

    if (isPaid) {
      const patch = {
        paymentStatus: "paid",
        orderStatus: "confirmed",
        razorpayPaymentId: paymentId || (linkData?.payments && linkData.payments[0]?.payment_id) || `pay_${Date.now()}`,
        razorpayPaymentLinkId: paymentLinkId,
        razorpayStatus: "paid",
        updatedAt: new Date().toISOString(),
      };

      if (isMongoConnected()) {
        const query = {
          $or: [
            ...(paymentLinkId ? [{ razorpayPaymentLinkId: paymentLinkId }] : []),
            ...(paymentId ? [{ razorpayPaymentId: paymentId }] : []),
          ],
        };

        await getMongoDb().collection("orders").updateMany(query, { $set: patch });
        await getMongoDb().collection("donations").updateMany(query, { $set: patch });

        const record =
          (await getMongoDb().collection("orders").findOne(query)) ||
          (await getMongoDb().collection("donations").findOne(query));

        if (record && !record.emailSent) {
          triggerConfirmationEmailIfPaid(record);
        } else if (!record && linkData?.customer?.email) {
          triggerConfirmationEmailIfPaid({
            customerEmail: linkData.customer.email,
            customerName: linkData.customer.name,
            totalAmount: linkData.amount ? linkData.amount / 100 : 0,
            razorpayPaymentLinkId: paymentLinkId,
            razorpayPaymentId: paymentId,
          });
        }
      }
    }

    res.json({
      success: true,
      paid: isPaid,
      status: isPaid ? "paid" : linkData?.status || "initiated",
      paymentLinkId,
      paymentId: paymentId || (linkData?.payments && linkData.payments[0]?.payment_id),
      amount: linkData?.amount ? linkData.amount / 100 : undefined,
      customer: linkData?.customer,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/razorpay/webhook
 * Aliases: /api/payments/webhook, /api/webhook/razorpay
 * Listens for Razorpay Webhook notifications for Payment Links and Payments.
 */
paymentsRouter.post(["/webhook", "/razorpay/webhook"], async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || config.razorpayKeySecret;

    if (signature && webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (expectedSignature !== signature) {
        console.warn("⚠️ Razorpay Webhook signature mismatch");
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    console.log("🔔 [Razorpay Webhook Event Received]:", event);

    if (event === "payment_link.paid" || event === "payment.captured") {
      const entity = payload?.payment_link?.entity || payload?.payment?.entity;
      if (entity) {
        const paymentLinkId = entity.id || entity.payment_link_id;
        const paymentId = entity.payment_id || entity.id;

        const patch = {
          paymentStatus: "paid",
          orderStatus: "confirmed",
          razorpayPaymentId: paymentId,
          razorpayPaymentLinkId: paymentLinkId,
          updatedAt: new Date().toISOString(),
        };

        if (isMongoConnected()) {
          const query = {
            $or: [
              ...(paymentLinkId ? [{ razorpayPaymentLinkId: paymentLinkId }] : []),
              ...(paymentId ? [{ razorpayPaymentId: paymentId }] : []),
            ],
          };

          await getMongoDb().collection("orders").updateMany(query, { $set: patch });
          await getMongoDb().collection("donations").updateMany(query, { $set: patch });

          const record =
            (await getMongoDb().collection("orders").findOne(query)) ||
            (await getMongoDb().collection("donations").findOne(query));

          if (record && !record.emailSent) {
            triggerConfirmationEmailIfPaid(record);
          }
        }

        console.log("✅ Webhook updated DB status to PAID for:", paymentLinkId || paymentId);
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("🚨 Razorpay Webhook Error:", err?.message || err);
    res.status(200).json({ status: "ok" });
  }
});

/**
 * POST /api/create-qr (and /api/payments/create-qr, /api/payments/razorpay/create-qr)
 * Body: { amount: number, amountInPaise?: number, customerName?: string, customerPhone?: string, customerEmail?: string }
 * Generates a dynamic Razorpay QR Code via SDK/API for the specific transaction.
 */
paymentsRouter.post(["/create-qr", "/razorpay/create-qr"], async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const userId = getAuthenticatedUserId(req);
    const body = req.body ?? {};
    const rawAmount = body.amountInPaise ?? body.amount ?? body.totalAmount;

    if (!rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
      res.status(400).json({ success: false, message: "Valid payment amount is required" });
      return;
    }

    const amountInPaise = body.amountInPaise
      ? Math.round(Number(body.amountInPaise))
      : Math.round(Number(rawAmount) * 100);

    const orderNumber = `ORD-QR-${Date.now()}`;
    const localOrder = await appendRecord<Order, Record<string, unknown>>("orders.json", {
      customerName: body.customerName ?? "Customer",
      customerEmail: body.customerEmail ?? "",
      customerPhone: body.customerPhone ?? "",
      totalAmount: amountInPaise / 100,
      currency: "INR",
      paymentMethod: "qr",
      paymentStatus: "initiated",
      orderStatus: "new",
      userId,
      orderNumber,
      razorpayStatus: "qr_created",
    });
    await persistUserOrder(userId, localOrder);

    const rzp = getRazorpayInstance();
    let qrCode: any;

    const qrPayload = {
      type: "upi_qr" as const,
      name: "UDAI Rehab",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amountInPaise,
      description: "UDAI Rehab Payment",
      close_by: Math.floor(Date.now() / 1000) + 30 * 60,
      notes: {
        localOrderId: localOrder.id,
        orderNumber,
      },
    };

    console.log("=== QR CREATION ROUTE DEBUG ===");
    console.log("  Key ID:", config.razorpayKeyId.substring(0, 15) + "...");
    console.log("  Key type:", config.razorpayKeyId.startsWith("rzp_live_") ? "🟢 LIVE" : "🟡 TEST");
    console.log("  Amount:", amountInPaise, "paise (₹" + amountInPaise / 100 + ")");
    console.log("  SDK qrCode available:", Boolean(rzp.qrCode && typeof rzp.qrCode.create === "function"));
    console.log("  Payload:", JSON.stringify(qrPayload, null, 2));
    console.log("===============================");

    try {
      if (rzp.qrCode && typeof rzp.qrCode.create === "function") {
        console.log("  → Using Razorpay SDK path (rzp.qrCode.create)...");
        qrCode = await rzp.qrCode.create(qrPayload);
        console.log("  ✅ SDK QR created:", JSON.stringify(qrCode, null, 2));
      } else {
        console.log("  → SDK qrCode not available, using REST API path...");
        qrCode = await createGatewayQrCode(amountInPaise, orderNumber, localOrder.id);
      }
    } catch (qrErr: any) {
      console.error("🚨 Razorpay SDK QR creation failed:");
      console.error("  Error message:", qrErr?.message);
      console.error("  Error details:", JSON.stringify(qrErr?.error || qrErr, null, 2));
      console.log("  → Attempting REST API fallback...");
      try {
        qrCode = await createGatewayQrCode(amountInPaise, orderNumber, localOrder.id);
      } catch (restErr: any) {
        console.error("🚨 REST API fallback also failed:");
        console.error("  Error:", restErr?.message);
        throw new Error(restErr?.message || qrErr?.message || "Failed to create Razorpay QR Code.");
      }
    }

    const orderPatch = {
      razorpayQrCodeId: qrCode.id,
      razorpayQrImageUrl: qrCode.image_url,
      razorpayQrImageContent: qrCode.image_content,
      razorpayAmount: qrCode.payment_amount || amountInPaise,
      razorpayCurrency: "INR",
      paymentMethod: "qr",
      paymentStatus: "initiated",
      orderStatus: "new",
      razorpayStatus: qrCode.status || "active",
    };
    const updatedOrder = await updateAdminRecord("orders", localOrder.id, orderPatch);
    await updatePersistedUserOrder(localOrder.id, orderPatch);

    res.status(201).json({
      success: true,
      message: "Dynamic Razorpay QR code created successfully",
      qrCode: {
        id: qrCode.id,
        status: qrCode.status || "active",
        imageUrl: qrCode.image_url,
        imageContent: qrCode.image_content,
        amount: qrCode.payment_amount || amountInPaise,
        currency: "INR",
        localOrderId: localOrder.id,
        orderNumber: orderNumber,
        isFallback: Boolean((qrCode as any).isFallback),
      },
    });
  } catch (error: any) {
    console.error("🚨 [POST /api/create-qr] Error:", error);
    next(error);
  }
});

/**
 * GET /api/qr-status/:qrCodeId (and /api/payments/qr-status/:qrCodeId, /api/payments/razorpay/qr-status/:qrCodeId)
 * Polls Razorpay / DB for QR payment completion status.
 */
paymentsRouter.get(["/qr-status/:qrCodeId", "/razorpay/qr-status/:qrCodeId"], async (req, res, next) => {
  try {
    requireRazorpayConfig();
    const { qrCodeId } = req.params;
    const localOrderId = String(req.query.localOrderId || "").trim();

    if (!qrCodeId) {
      res.status(400).json({ success: false, message: "qrCodeId is required" });
      return;
    }

    // 1. Check database first if order is already marked paid
    if (localOrderId && isMongoConnected()) {
      const dbOrder = await getMongoDb().collection("orders").findOne({
        $or: [
          { localOrderId },
          ...(ObjectId.isValid(localOrderId) ? [{ _id: new ObjectId(localOrderId) }] : []),
        ],
      });

      if (dbOrder && (dbOrder.paymentStatus === "paid" || dbOrder.orderStatus === "confirmed")) {
        const expectedSignature = crypto
          .createHmac("sha256", config.razorpayKeySecret)
          .update(`${dbOrder.razorpayOrderId || qrCodeId}|${dbOrder.razorpayPaymentId || "pay_qr_completed"}`)
          .digest("hex");

        res.json({
          success: true,
          paid: true,
          status: "captured",
          razorpayPaymentId: dbOrder.razorpayPaymentId || `pay_${Date.now()}`,
          razorpayOrderId: dbOrder.razorpayOrderId || qrCodeId,
          razorpaySignature: dbOrder.razorpaySignature || expectedSignature,
          localOrderId: localOrderId || dbOrder.localOrderId || dbOrder.id,
        });
        return;
      }
    }

    // 2. Poll Razorpay API for payments associated with this QR code
    try {
      const response = await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrCodeId}/payments`, {
        headers: {
          Authorization: buildAuthorizationHeader(),
        },
      });

      const payload = (await response.json()) as { items?: Array<{ id: string; order_id?: string; status: string; amount: number }> };

      if (response.ok && payload.items && payload.items.length > 0) {
        const payment = payload.items[0];
        if (payment.status === "captured" || payment.status === "authorized") {
          const razorpayOrderId = payment.order_id || qrCodeId;
          const razorpayPaymentId = payment.id;
          const expectedSignature = crypto
            .createHmac("sha256", config.razorpayKeySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

          res.json({
            success: true,
            paid: true,
            status: payment.status,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature: expectedSignature,
            localOrderId,
          });
          return;
        }
      }
    } catch (apiErr) {
      console.warn("[QR Status Poll Warning]: Razorpay API check skipped:", apiErr);
    }

    res.json({
      success: true,
      paid: false,
      status: "active",
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/create-link", async (req, res, next) => {
  try {
    const { bookingId } = req.body ?? {};

    if (!bookingId) {
      res.status(400).json({
        success: false,
        message: "bookingId is required.",
      });
      return;
    }

    // 1. Fetch appointment from database
    let appointment = null;
    try {
      appointment = await WebhookMessage.findById(bookingId);
    } catch (err) {
      // Catch invalid ObjectId error
    }

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Booking does not exist.",
      });
      return;
    }

    // 2. Validate payment is not already completed
    if (appointment.paymentStatus === "paid" || appointment.paymentStatus === "captured") {
      res.status(400).json({
        success: false,
        message: "Payment is already completed.",
      });
      return;
    }

    const amountInr = config.appointmentFeeInr;
    const amountPaise = amountInr * 100;

    // 3. Create Razorpay TEST Payment Link
    const paymentLink = await razorpay.paymentLink.create({
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      description: `Appointment Booking Fee for ${appointment.childName || "Child"}`,
      customer: {
        name: appointment.parentName || appointment.childName || "Customer",
        contact: appointment.phone || "",
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        bookingId: appointment._id.toString(),
      },
    });

    // 4. Save paymentUrl and razorpayPaymentLinkId inside appointment
    appointment.paymentUrl = paymentLink.short_url;
    appointment.razorpayPaymentLinkId = paymentLink.id;
    appointment.paymentStatus = "initiated";
    await appointment.save();

    res.status(201).json({
      success: true,
      bookingId: appointment._id.toString(),
      paymentUrl: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
      amount: amountInr,
    });
  } catch (error) {
    console.error("[POST /api/payments/create-link] Error:", error);
    next(error);
  }
});
