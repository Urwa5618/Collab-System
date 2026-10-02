import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthenticatedRequest } from "../types";

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    const payload = jwt.verify(token, secret) as {
      userId: string;
      email: string;
    };

    const typedReq = req as AuthenticatedRequest;
    typedReq.user = {
      userId: payload.userId,
      email: payload.email
    };

    return next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
