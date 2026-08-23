import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { AuthRequest } from "../../types";
import { MemberRepository } from "../../repositories/MemberRepository";

const router = Router();
router.use(authMiddleware);

// GET /api/members
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const repo = new MemberRepository(req.tenantId!);
    const { search, page, limit } = req.query;
    const result = await repo.findAll(
      search as string,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
    res.json({ success: true, ...result });
  })
);

// GET /api/members/:id
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const repo = new MemberRepository(req.tenantId!);
    const member = await repo.findById(req.params.id);
    if (!member) {
      res.status(404).json({ success: false, error: "Membro não encontrado" });
      return;
    }
    res.json({ success: true, data: member });
  })
);

// POST /api/members
router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const repo = new MemberRepository(req.tenantId!);
    const member = await repo.create(req.body);
    res.status(201).json({ success: true, data: member });
  })
);

// PUT /api/members/:id
router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const repo = new MemberRepository(req.tenantId!);
    await repo.update(req.params.id, req.body);
    res.json({ success: true, message: "Membro atualizado" });
  })
);

// DELETE /api/members/:id (soft delete)
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const repo = new MemberRepository(req.tenantId!);
    await repo.softDelete(req.params.id);
    res.json({ success: true, message: "Membro removido" });
  })
);

export const memberRoutes = router;