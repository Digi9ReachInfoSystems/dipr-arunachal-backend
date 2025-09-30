// utils/errorHandler.ts
import type { Response } from "express";

export class AppError extends Error {
  statusCode: number;
  details: unknown;

  constructor(message: string, statusCode = 400, details: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const handleError = (res: Response, error: unknown): Response => {
  console.error("🔥 Error:", error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details ?? null,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
