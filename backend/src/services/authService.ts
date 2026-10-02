import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";
import type { ApiError, UserResponse } from "../types";

type DbUser = {
  user_id: string;
  email: string;
  password_hash?: string;
  display_name: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  created_at?: string;
};

const createError = (message: string, statusCode: number): ApiError => {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  return err;
};

const isApiError = (err: unknown): err is ApiError =>
  typeof err === "object" &&
  err !== null &&
  "statusCode" in err &&
  typeof (err as { statusCode?: unknown }).statusCode === "number";

const isValidEmail = (email: string) => email.includes("@") && email.includes(".");
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const registerUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserResponse> => {
  const normalizedEmail = normalizeEmail(email ?? "");
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw createError("Invalid email", 400);
  }

  if (!password || password.length < 8) {
    throw createError("Password must be at least 8 characters", 400);
  }

  const trimmedDisplayName = displayName?.trim();
  if (!trimmedDisplayName) {
    throw createError("Display name is required", 400);
  }

  try {
    const existing = await query("SELECT user_id FROM users WHERE email = $1", [
      normalizedEmail
    ]);

    if (existing.rows.length > 0) {
      throw createError("Email already in use", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING user_id, email, display_name, created_at",
      [normalizedEmail, passwordHash, trimmedDisplayName]
    );

    const user = result.rows[0] as DbUser;

    return {
      userId: user.user_id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at
    };
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to register user", 500);
  }
};

export const loginUser = async (email: string, password: string) => {
  const normalizedEmail = normalizeEmail(email ?? "");
  if (!normalizedEmail || !password) {
    throw createError("Invalid email or password", 401);
  }

  try {
    const result = await query(
      "SELECT user_id, email, password_hash, display_name FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      throw createError("Invalid email or password", 401);
    }

    const user = result.rows[0] as DbUser;
    const match = await bcrypt.compare(password, user.password_hash || "");

    if (!match) {
      throw createError("Invalid email or password", 401);
    }

    const secret = process.env.JWT_SECRET || "";
    if (!secret) {
      throw createError("JWT secret not configured", 500);
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      secret,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        displayName: user.display_name
      }
    };
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to login", 500);
  }
};

export const getMe = async (userId: string): Promise<UserResponse> => {
  try {
    const result = await query(
      "SELECT user_id, email, display_name, avatar_url, is_verified, created_at FROM users WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      throw createError("User not found", 404);
    }

    const user = result.rows[0] as DbUser;

    return {
      userId: user.user_id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url ?? null,
      isVerified: user.is_verified ?? false,
      createdAt: user.created_at
    };
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to load user", 500);
  }
};
