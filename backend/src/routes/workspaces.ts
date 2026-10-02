import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  getUserWorkspaces,
  getWorkspace,
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspace
} from "../services/workspaceService";
import type { AuthenticatedRequest } from "../types";

const router = Router();

router.use(authenticateToken);

router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    const workspaces = await getUserWorkspaces(req.user.userId);
    return res.status(200).json({ workspaces });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    const { name, description } = req.body ?? {};
    if (name === undefined) {
      return res.status(400).json({ error: "Workspace name is required" });
    }

    const workspace = await createWorkspace(req.user.userId, name, description);
    return res.status(201).json({ workspace });
  } catch (err) {
    return next(err);
  }
});

router.get("/:workspaceId", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    const { workspaceId } = req.params;
    const workspace = await getWorkspace(workspaceId, req.user.userId);
    return res.status(200).json({ workspace });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:workspaceId", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    const { workspaceId } = req.params;
    const workspace = await updateWorkspace(
      workspaceId,
      req.user.userId,
      req.body
    );
    return res.status(200).json({ workspace });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:workspaceId", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    const { workspaceId } = req.params;
    const result = await deleteWorkspace(workspaceId, req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

router.get(
  "/:workspaceId/members",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { workspaceId } = req.params;
      const members = await getWorkspaceMembers(workspaceId, req.user.userId);
      return res.status(200).json({ members });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/:workspaceId/members",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { workspaceId } = req.params;
      const { email, role } = req.body ?? {};
      if (email === undefined || role === undefined) {
        return res
          .status(400)
          .json({ error: "Email and role are required" });
      }

      const result = await addWorkspaceMember(
        workspaceId,
        req.user.userId,
        email,
        role
      );
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  }
);

router.delete(
  "/:workspaceId/members/:userId",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "No token provided" });
      }

      const { workspaceId, userId } = req.params;
      const result = await removeWorkspaceMember(
        workspaceId,
        req.user.userId,
        userId
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
