import crypto from "node:crypto";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { config } from "../config.js";
import { appendRecord } from "../lib/fileStore.js";
import { getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { optionalJwt } from "../middleware/auth.js";
import { updateAdminRecord } from "../services/adminService.js";
import { orderSchema } from "../schemas.js";
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
async function createGatewayOrder(amountPaise, receipt) {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            Authorization: buildAuthorizationHeader(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            amount: amountPaise,
            currency: "INR",
            receipt,
            payment_capture: 1,
        }),
    });
    const payload = (await response.json());
    if (!response.ok) {
        const description = "error" in payload && payload.error?.description
            ? payload.error.description
            : "Unable to create Razorpay order";
        throw new Error(description);
    }
    if (!("id" in payload)) {
        throw new Error("Razorpay order response was invalid");
    }
    return payload;
}
async function createGatewayQrCode(amountPaise, orderNumber, localOrderId) {
    const response = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
        method: "POST",
        headers: {
            Authorization: buildAuthorizationHeader(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            type: "upi_qr",
            name: `UDAI ${orderNumber}`,
            usage: "single_use",
            fixed_amount: true,
            payment_amount: amountPaise,
            description: `Payment for ${orderNumber}`,
            close_by: Math.floor(Date.now() / 1000) + 30 * 60,
            notes: {
                localOrderId,
                orderNumber,
            },
        }),
    });
    const payload = (await response.json());
    if (!response.ok) {
        const description = "error" in payload && payload.error?.description
            ? payload.error.description
            : "Unable to create Razorpay QR code";
        throw new Error(description);
    }
    if (!("id" in payload) || !payload.image_url) {
        throw new Error("Razorpay QR code response was invalid");
    }
    return payload;
}
function createTestUpiQrCode(amountPaise, orderNumber) {
    const amount = (amountPaise / 100).toFixed(2);
    const upiUri = `upi://pay?pa=success@razorpay&pn=UDAI&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for ${orderNumber}`)}`;
    return {
        id: `test_qr_${orderNumber}`,
        status: "test_qr_fallback",
        image_url: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`,
        image_content: upiUri,
        payment_amount: amountPaise,
        isFallback: true,
    };
}
function getAuthenticatedUserId(req) {
    return req.user?.id;
}
async function persistUserOrder(userId, order) {
    if (!userId || !isMongoConnected())
        return;
    const { _id, ...orderWithoutMongoId } = order;
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
    await collection.updateOne({ id: localOrderId }, {
        $set: orderPatch,
        $setOnInsert: { createdAt: order.createdAt ?? new Date().toISOString() },
    }, { upsert: true });
}
async function updatePersistedUserOrder(localOrderId, patch) {
    if (!isMongoConnected())
        return;
    await getMongoDb().collection("orders").updateMany({
        $or: [
            { localOrderId },
            ...(ObjectId.isValid(localOrderId) ? [{ _id: new ObjectId(localOrderId) }] : []),
        ],
    }, {
        $set: {
            ...patch,
            updatedAt: new Date().toISOString(),
        },
    });
}
paymentsRouter.post("/razorpay/order", async (req, res, next) => {
    try {
        requireRazorpayConfig();
        const userId = getAuthenticatedUserId(req);
        const payload = razorpayCheckoutSchema.parse(req.body);
        const orderNumber = `ORD-${Date.now()}`;
        const localOrder = await appendRecord("orders.json", {
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
    }
    catch (error) {
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
        const localOrder = await appendRecord("orders.json", {
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
        }
        catch (qrError) {
            qrCode = createTestUpiQrCode(amountPaise, orderNumber);
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
    }
    catch (error) {
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
    }
    catch (error) {
        next(error);
    }
});
