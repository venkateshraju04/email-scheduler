import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Error:", err);

  if (err.name === "ZodError" || err instanceof ZodError) {
    const issues = (err as any).issues || (err as any).errors || [];
    res.status(400).json({
      error: "Validation failed",
      details: issues.map((e: any) => ({
        path: e.path ? e.path.join(".") : "unknown",
        message: e.message,
      })),
    });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}
