import { query } from "../config/db";
import type { ApiError, WorkspaceResponse } from "../types";

type WorkspaceRole = "owner" | "editor" | "viewer";

type WorkspaceRow = {
  workspace_id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
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

type WorkspaceMemberRow = {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  role: WorkspaceRole;
  joined_at: string;
};

const toWorkspaceResponse = (
  row: WorkspaceRow,
  role?: WorkspaceRole
): WorkspaceResponse => ({
  workspaceId: row.workspace_id,
  ownerId: row.owner_id,
  name: row.name,
  description: row.description ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  role
});

const requireWorkspaceRole = async (workspaceId: string, userId: string) => {
  try {
    const result = await query(
      "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, userId]
    );

    if (result.rows.length === 0) {
      throw createError("Workspace not found or access denied", 403);
    }

    return result.rows[0].role as WorkspaceRole;
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to verify workspace access", 500);
  }
};

export const createWorkspace = async (
  userId: string,
  name: string,
  description?: string
) => {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw createError("Workspace name is required", 400);
  }

  try {
    const result = await query(
      "INSERT INTO workspaces (owner_id, name, description) VALUES ($1, $2, $3) RETURNING *",
      [userId, trimmedName, description ?? null]
    );

    const workspace = result.rows[0] as WorkspaceRow;

    await query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
      [workspace.workspace_id, userId]
    );

    return toWorkspaceResponse(workspace);
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to create workspace", 500);
  }
};

export const getUserWorkspaces = async (userId: string) => {
  try {
    const result = await query(
      "SELECT w.*, wm.role FROM workspaces w JOIN workspace_members wm ON w.workspace_id = wm.workspace_id WHERE wm.user_id = $1 ORDER BY w.created_at DESC",
      [userId]
    );

    return (result.rows as Array<WorkspaceRow & { role: WorkspaceRole }>).map(
      (row) => toWorkspaceResponse(row, row.role)
    );
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to load workspaces", 500);
  }
};

export const getWorkspace = async (workspaceId: string, userId: string) => {
  try {
    const role = await requireWorkspaceRole(workspaceId, userId);

    const result = await query(
      "SELECT * FROM workspaces WHERE workspace_id = $1",
      [workspaceId]
    );

    if (result.rows.length === 0) {
      throw createError("Workspace not found", 404);
    }

    return toWorkspaceResponse(result.rows[0] as WorkspaceRow);
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to load workspace", 500);
  }
};

export const updateWorkspace = async (
  workspaceId: string,
  userId: string,
  updates: { name?: string; description?: string | null }
) => {
  try {
    const role = await requireWorkspaceRole(workspaceId, userId);

    if (role !== "owner") {
      throw createError("Only workspace owner can update workspace", 403);
    }

    if (updates.name !== undefined && updates.name.trim() === "") {
      throw createError("Workspace name is required", 400);
    }

    const nameValue = updates.name !== undefined ? updates.name.trim() : null;
    const descriptionValue =
      updates.description !== undefined ? updates.description : null;

    const result = await query(
      "UPDATE workspaces SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE workspace_id = $3 RETURNING *",
      [nameValue, descriptionValue, workspaceId]
    );

    return toWorkspaceResponse(result.rows[0] as WorkspaceRow, role);
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to update workspace", 500);
  }
};

export const deleteWorkspace = async (workspaceId: string, userId: string) => {
  try {
    const role = await requireWorkspaceRole(workspaceId, userId);

    if (role !== "owner") {
      throw createError("Only workspace owner can delete workspace", 403);
    }

    await query("DELETE FROM workspaces WHERE workspace_id = $1", [workspaceId]);

    return { message: "Workspace deleted" };
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to delete workspace", 500);
  }
};

export const getWorkspaceMembers = async (
  workspaceId: string,
  userId: string
) => {
  try {
    await requireWorkspaceRole(workspaceId, userId);

    const result = await query(
      "SELECT u.user_id, u.email, u.display_name, u.avatar_url, wm.role, wm.joined_at FROM workspace_members wm JOIN users u ON wm.user_id = u.user_id WHERE wm.workspace_id = $1 ORDER BY wm.joined_at ASC",
      [workspaceId]
    );

    return (result.rows as WorkspaceMemberRow[]).map((row) => ({
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url ?? null,
      role: row.role,
      joinedAt: row.joined_at
    }));
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to load workspace members", 500);
  }
};

export const addWorkspaceMember = async (
  workspaceId: string,
  requestingUserId: string,
  email: string,
  role: WorkspaceRole
) => {
  try {
    const requesterRole = await requireWorkspaceRole(
      workspaceId,
      requestingUserId
    );

    if (requesterRole !== "owner") {
      throw createError("Only workspace owner can add members", 403);
    }

    if (role !== "editor" && role !== "viewer") {
      throw createError("Invalid role", 400);
    }

    const userResult = await query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      throw createError("User not found", 404);
    }

    const targetUserId = userResult.rows[0].user_id as string;

    const existing = await query(
      "SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, targetUserId]
    );

    if (existing.rows.length > 0) {
      throw createError("User is already a member", 409);
    }

    await query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)",
      [workspaceId, targetUserId, role]
    );

    return { message: "Member added" };
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to add workspace member", 500);
  }
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  requestingUserId: string,
  targetUserId: string
) => {
  try {
    const requesterRole = await requireWorkspaceRole(
      workspaceId,
      requestingUserId
    );

    if (requesterRole !== "owner") {
      throw createError("Only workspace owner can remove members", 403);
    }

    if (requestingUserId === targetUserId) {
      throw createError("Cannot remove yourself", 400);
    }

    await query(
      "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, targetUserId]
    );

    return { message: "Member removed" };
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to remove workspace member", 500);
  }
};
