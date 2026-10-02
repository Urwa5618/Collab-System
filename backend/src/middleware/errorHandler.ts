import { NextFunction, Request, Response } from "express";
import type { ApiError } from "../types";

type PgError = {
  code?: string;
};

const isApiError = (err: unknown): err is ApiError =>
  typeof err === "object" &&
  err !== null &&
  "statusCode" in err &&
  typeof (err as { statusCode?: unknown }).statusCode === "number";

const getPostgresError = (code?: string) => {
  switch (code) {
    case "23505":
      return { status: 409, message: "Resource already exists" };
    case "23503":
      return { status: 400, message: "Referenced resource not found" };
    case "22P02":
      return { status: 400, message: "Invalid ID format" };
    default:
      return null;
  }
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);

  const pgError = getPostgresError(
    typeof err === "object" && err !== null ? (err as PgError).code : undefined
  );
  if (pgError) {
    return res.status(pgError.status).json({ error: pgError.message });
  }

  if (isApiError(err)) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  return res.status(500).json({ error: "Internal server error" });
};
