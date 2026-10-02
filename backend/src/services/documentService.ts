import { query } from "../config/db";
import type { ApiError, DocumentResponse } from "../types";

type WorkspaceRole = "owner" | "editor" | "viewer";

type DocumentRow = {
  doc_id: string;
  workspace_id: string;
  owner_id: string;
  title: string;
  metadata: unknown;
  latest_snapshot_version: number;
  is_deleted: boolean;
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

const toDocumentResponse = (row: DocumentRow): DocumentResponse => ({
  docId: row.doc_id,
  workspaceId: row.workspace_id,
  ownerId: row.owner_id,
  title: row.title,
  metadata: row.metadata,
  latestSnapshotVersion: row.latest_snapshot_version,
  isDeleted: row.is_deleted,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const getWorkspaceRole = async (workspaceId: string, userId: string) => {
  try {
    const result = await query(
      "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspaceId, userId]
    );

    if (result.rows.length === 0) {
      throw createError("Access denied", 403);
    }

    return result.rows[0].role as WorkspaceRole;
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to verify workspace access", 500);
  }
};

const getDocumentRow = async (docId: string) => {
  try {
    const result = await query(
      "SELECT * FROM documents WHERE doc_id = $1 AND is_deleted = FALSE",
      [docId]
    );

    if (result.rows.length === 0) {
      throw createError("Document not found", 404);
    }

    return result.rows[0] as DocumentRow;
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to load document", 500);
  }
};

export const createDocument = async (
  workspaceId: string,
  userId: string,
  title?: string
) => {
  try {
    const role = await getWorkspaceRole(workspaceId, userId);

    if (role === "viewer") {
      throw createError("Viewers cannot create documents", 403);
    }

    const finalTitle = title && title.trim() ? title.trim() : "Untitled Document";

    const result = await query(
      "INSERT INTO documents (workspace_id, owner_id, title) VALUES ($1, $2, $3) RETURNING *",
      [workspaceId, userId, finalTitle]
    );

    return toDocumentResponse(result.rows[0] as DocumentRow);
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to create document", 500);
  }
};

export const getWorkspaceDocuments = async (
  workspaceId: string,
  userId: string
) => {
  try {
    await getWorkspaceRole(workspaceId, userId);

    const result = await query(
      "SELECT * FROM documents WHERE workspace_id = $1 AND is_deleted = FALSE ORDER BY updated_at DESC",
      [workspaceId]
    );

    return (result.rows as DocumentRow[]).map(toDocumentResponse);
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to load documents", 500);
  }
};

export const getDocument = async (docId: string, userId: string) => {
  try {
    const document = await getDocumentRow(docId);

    await getWorkspaceRole(document.workspace_id, userId);

    return toDocumentResponse(document);
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to load document", 500);
  }
};

export const updateDocument = async (
  docId: string,
  userId: string,
  updates: { title?: string; metadata?: unknown }
) => {
  try {
    const document = await getDocumentRow(docId);

    const role = await getWorkspaceRole(document.workspace_id, userId);

    if (role === "viewer") {
      throw createError("Viewers cannot edit documents", 403);
    }

    if (updates.title !== undefined && updates.title.trim() === "") {
      throw createError("Document title is required", 400);
    }

    const titleValue = updates.title !== undefined ? updates.title.trim() : null;
    const metadataValue = updates.metadata !== undefined ? updates.metadata : null;

    const result = await query(
      "UPDATE documents SET title = COALESCE($1, title), metadata = COALESCE($2, metadata), updated_at = NOW() WHERE doc_id = $3 RETURNING *",
      [titleValue, metadataValue, docId]
    );

    return toDocumentResponse(result.rows[0] as DocumentRow);
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to update document", 500);
  }
};

export const deleteDocument = async (docId: string, userId: string) => {
  try {
    const document = await getDocumentRow(docId);

    const role = await getWorkspaceRole(document.workspace_id, userId);

    const isWorkspaceOwner = role === "owner";
    const isDocumentOwner = document.owner_id === userId;

    if (!isWorkspaceOwner && !isDocumentOwner) {
      throw createError("Access denied", 403);
    }

    await query(
      "UPDATE documents SET is_deleted = TRUE, updated_at = NOW() WHERE doc_id = $1",
      [docId]
    );

    return { message: "Document deleted" };
  } catch (err) {
    if (isApiError(err)) {
      throw err;
    }

    throw createError("Failed to delete document", 500);
  }
};
