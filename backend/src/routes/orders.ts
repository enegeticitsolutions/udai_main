import { Router } from "express";
import { authenticateJwt, type AuthenticatedRequest } from "../middleware/auth.js";
import { orderSchema } from "../schemas.js";
import { createUserOrder } from "../services/userService.js";
import { processEnviaShipmentForOrder } from "../services/enviaService.js";

export const ordersRouter = Router();

ordersRouter.post("/create", authenticateJwt, async (req, res, next) => {
  try {
    const payload = orderSchema.parse(req.body);
    const orderNumber = `ORD-${Date.now()}`;
    const data = await createUserOrder((req as AuthenticatedRequest).user.id, {
      ...payload,
      orderNumber,
      paymentStatus: payload.paymentStatus ?? "initiated",
      orderStatus: payload.orderStatus ?? "new",
    });

    if (data.paymentStatus === "paid" || data.orderStatus === "confirmed") {
      processEnviaShipmentForOrder(data).catch((err) =>
        console.error("🚨 Error processing Envia shipment on order create:", err)
      );
    }

    res.status(201).json({
      success: true,
      message: "Order created",
      data,
    });
  } catch (error) {
    next(error);
  }
});

