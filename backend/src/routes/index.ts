import { Router } from "express";
import { contentRouter } from "./content.js";
import { formsRouter } from "./forms.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "UDAI backend is running",
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use("/content", contentRouter);
apiRouter.use("/forms", formsRouter);
