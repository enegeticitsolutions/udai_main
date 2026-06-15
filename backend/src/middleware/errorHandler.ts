import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.flatten(),
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error";

  res.status(500).json({
    success: false,
    message,
  });
}
