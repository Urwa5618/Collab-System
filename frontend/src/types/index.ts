export interface User {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  createdAt?: string;
}

export interface Workspace {
  workspaceId: string;
  ownerId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string | null;
  role?: string;
  joinedAt?: string;
}

export interface Document {
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

export interface OTOperation {
  opId: string;
  type: "insert" | "delete" | "format" | "replace_all";
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, unknown>;
  clientVersion: number;
  serverVersion?: number;
  userId: string;
  timestamp: string;
  noop?: boolean;
}

export interface ActiveUser {
  userId: string;
  email: string;
  socketId: string;
  cursorPosition?: number;
  color: string;
}
