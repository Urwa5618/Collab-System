import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  createDocument,
  deleteDocument,
  getDocument,
  getWorkspaceDocuments,
  updateDocument
} from "../services/documentService";
import type { AuthenticatedRequest } from "../types";

const router = Router();

router.use(authenticateToken);

router.post(
  "/workspaces/:workspaceId/documents",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { workspaceId } = req.params;
      const { title } = req.body;
      const document = await createDocument(
        workspaceId,
        req.user.userId,
        title
      );
      return res.status(201).json({ document });
    } catch (err) {
      return next(err);
    }
  }
);

router.get(
  "/workspaces/:workspaceId/documents",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { workspaceId } = req.params;
      const documents = await getWorkspaceDocuments(
        workspaceId,
        req.user.userId
      );
      return res.status(200).json({ documents });
    } catch (err) {
      return next(err);
    }
  }
);

router.get("/documents/:docId", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    const { docId } = req.params;
    const document = await getDocument(docId, req.user.userId);
    return res.status(200).json({ document });
  } catch (err) {
    return next(err);
  }
});

router.patch(
  "/documents/:docId",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { docId } = req.params;
      const { title, metadata } = req.body ?? {};
      if (title === undefined && metadata === undefined) {
        return res
          .status(400)
          .json({ error: "No valid fields provided" });
      }

      const document = await updateDocument(docId, req.user.userId, {
        title,
        metadata
      });
      return res.status(200).json({ document });
    } catch (err) {
      return next(err);
    }
  }
);

router.delete(
  "/documents/:docId",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { docId } = req.params;
      const result = await deleteDocument(docId, req.user.userId);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
