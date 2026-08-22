import { Router } from "express";
import { authenticateJwt, type AuthenticatedRequest } from "../middleware/auth.js";
import { orderSchema } from "../schemas.js";
import { createUserOrder } from "../services/userService.js";

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

    res.status(201).json({
      success: true,
      message: "Order created",
      data,
    });
  } catch (error) {
    next(error);
  }
});
