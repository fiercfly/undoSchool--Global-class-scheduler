import type { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If it's a Zod schema validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      status: "fail",
      error: "Validation failed",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // If it's our custom application operational error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "fail",
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Unique constraint violations from database
  if (err.code === "23505" || err.errno === 19) {
    res.status(400).json({
      status: "fail",
      error: "A record with this unique constraint already exists.",
    });
    return;
  }

  // Unexpected system error
  console.error("UNEXPECTED ERROR:", err);
  res.status(500).json({
    status: "error",
    error: "Internal server error occurred.",
  });
}
