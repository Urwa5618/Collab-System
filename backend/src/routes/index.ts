import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import authRouter from "./auth";
import documentsRouter from "./documents";
import workspacesRouter from "./workspaces";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/ws/stats", authenticateToken, async (_req, res, next) => {
  try {
    const { redisClient } = await import("../config/redis");
    void redisClient;
    res.json({
      message: "WebSocket server running",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

router.use("/auth", authRouter);
router.use("/workspaces", workspacesRouter);
router.use("/", documentsRouter);

export default router;
