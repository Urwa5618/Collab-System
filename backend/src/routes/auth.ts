import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getMe, loginUser, registerUser } from "../services/authService";
import type { AuthenticatedRequest } from "../types";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (
      email === undefined ||
      password === undefined ||
      displayName === undefined
    ) {
      return res
        .status(400)
        .json({ error: "Email, password, and display name are required" });
    }

    const user = await registerUser(email, password, displayName);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (email === undefined || password === undefined) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const result = await loginUser(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", authenticateToken, async (_req, res, next) => {
  try {
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No token provided" });
    }

    const user = await getMe(req.user.userId);
    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
});

export default router;
