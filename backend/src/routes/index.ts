import { Router } from "express";
import { adminRouter } from "./admin.js";
import { contentRouter } from "./content.js";
import { formsRouter } from "./forms.js";
import { paymentsRouter } from "./payments.js";
import { authRouter } from "./auth.js";
import { userRouter } from "./user.js";
import whatsappRouter from "./whatsapp.js";
import { isMongoConnected } from "../lib/mongodb.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "UDAI backend is running",
    timestamp: new Date().toISOString(),
    database: {
      mongo: isMongoConnected() ? "connected" : "disconnected",
    },
  });
});

apiRouter.use("/content", contentRouter);
apiRouter.use("/forms", formsRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/whatsapp", whatsappRouter);
