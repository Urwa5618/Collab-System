import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export interface ApiError extends Error {
  statusCode: number;
}

export interface UserResponse {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  createdAt?: string;
}

export interface WorkspaceResponse {
  workspaceId: string;
  ownerId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  role?: "owner" | "editor" | "viewer";
}

export interface DocumentResponse {
  docId: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  metadata: unknown;
  latestSnapshotVersion: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocketUser {
  userId: string;
  email: string;
  displayName?: string;
}

export interface DocumentSession {
  socketId: string;
  userId: string;
  email: string;
  docId: string;
  connectedAt: string;
}

export interface ActiveUser {
  userId: string;
  email: string;
  socketId: string;
  cursorPosition?: number;
  color: string;
}

export interface OperationEvent {
  opId: string;
  type: "insert" | "delete" | "format" | "replace_all";
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, unknown>;
  clientVersion: number;
  userId: string;
  timestamp: string;
}

export interface CursorEvent {
  userId: string;
  position: number;
  selection?: { start: number; end: number };
}
