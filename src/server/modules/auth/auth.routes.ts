import { Router, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { authMiddleware } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { AuthRequest } from "../../types";

const router = Router();

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email e senha obrigatórios" });
      return;
    }
    const result = await AuthService.login(email, password);
    res.json({ success: true, data: result });
  })
);

// POST /api/auth/register
router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantName, tenantSlug, name, email, password } = req.body;
    if (!tenantName || !tenantSlug || !name || !email || !password) {
      res.status(400).json({ success: false, error: "Todos os campos são obrigatórios" });
      return;
    }
    const result = await AuthService.register({ tenantName, tenantSlug, name, email, password });
    res.status(201).json({ success: true, data: result });
  })
);

// GET /api/auth/me
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await AuthService.me(req.user!.userId);
    res.json({ success: true, data: user });
  })
);

// POST /api/auth/logout
router.post(
  "/logout",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1] || "";
    await AuthService.logout(req.user!.userId, token);
    res.json({ success: true, message: "Logout realizado" });
  })
);

export const authRoutes = router;