import { Router } from "express";
import { authenticateJwt, type AuthenticatedRequest } from "../middleware/auth.js";
import { addressSchema, cartSchema } from "../schemas.js";
import { createUserAddress, getUserAddresses, getUserCart, getUserOrders, getUserProfile, mergeUserCart, saveUserCart } from "../services/userService.js";

export const userRouter = Router();

userRouter.use(authenticateJwt);

userRouter.get("/profile", async (req, res, next) => {
  try {
    const data = await getUserProfile((req as AuthenticatedRequest).user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

userRouter.get("/orders", async (req, res, next) => {
  try {
    const data = await getUserOrders((req as AuthenticatedRequest).user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

userRouter.get("/addresses", async (req, res, next) => {
  try {
    const data = await getUserAddresses((req as AuthenticatedRequest).user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

userRouter.get("/cart", async (req, res, next) => {
  try {
    const data = await getUserCart((req as AuthenticatedRequest).user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

userRouter.put("/cart", async (req, res, next) => {
  try {
    const payload = cartSchema.parse(req.body);
    const data = await saveUserCart((req as AuthenticatedRequest).user.id, payload.items);
    res.json({ success: true, message: "Cart saved", data });
  } catch (error) {
    next(error);
  }
});

userRouter.post("/cart/merge", async (req, res, next) => {
  try {
    const payload = cartSchema.parse(req.body);
    const data = await mergeUserCart((req as AuthenticatedRequest).user.id, payload.items);
    res.json({ success: true, message: "Cart merged", data });
  } catch (error) {
    next(error);
  }
});

userRouter.post("/address", async (req, res, next) => {
  try {
    const payload = addressSchema.parse(req.body);
    const data = await createUserAddress((req as AuthenticatedRequest).user.id, payload);
    res.status(201).json({ success: true, message: "Address saved", data });
  } catch (error) {
    next(error);
  }
});
