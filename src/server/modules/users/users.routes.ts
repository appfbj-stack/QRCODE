/**
 * users.routes.ts
 *
 * Endpoints ADMIN-only para gestão de usuários da rede:
 *  - GET    /api/users              Lista todos os usuários do tenant
 *  - POST   /api/users              Cria novo usuário (GERENTE/OPERADOR/etc)
 *  - PATCH  /api/users/:id          Atualiza role/congregação/ativo
 *  - POST   /api/users/:id/reset-password  Gera senha temporária
 *  - DELETE /api/users/:id          Soft delete (desativa)
 *
 * Segurança: TODAS as rotas exigem authMiddleware + adminOnly (ADMIN/SUPER_ADMIN).
 * Pastores de congregação não veem esta tela.
 */

import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authMiddleware } from "../../middleware/auth";
import { isGlobalRole } from "../../middleware/access";
import { asyncHandler } from "../../middleware/asyncHandler";
import { prisma } from "../../config/database";
import { AuthRequest } from "../../types";

const router = Router();
router.use(authMiddleware);

/** Bloqueia rotas de users para não-admins (pastores de congregação). */
function adminOnly(req: AuthRequest, res: Response, next: () => void): void {
  if (!isGlobalRole(req.user?.role)) {
    res.status(403).json({
      success: false,
      error: "Acesso restrito ao administrador da sede.",
    });
    return;
  }
  next();
}

/** Remove passwordHash e campos sensíveis antes de devolver pro front. */
function sanitize(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    congregationId: u.congregationId,
    congregationName: u.congregation?.name ?? null,
    active: u.active,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

// ─────────────────────────────────────────────────────────
// GET /api/users  — lista todos do tenant
// ─────────────────────────────────────────────────────────
router.get(
  "/",
  adminOnly,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId, deletedAt: null },
      include: { congregation: { select: { name: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    res.json({ success: true, data: users.map(sanitize), total: users.length });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/users  — cria novo usuário
// ─────────────────────────────────────────────────────────
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, email, password, role, congregationId } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: name, email, password",
      });
    }

    const exists = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (exists) {
      return res.status(400).json({ success: false, error: "Email já cadastrado" });
    }

    // Se congregationId foi enviado, valida que pertence ao mesmo tenant
    if (congregationId) {
      const cong = await prisma.congregation.findFirst({
        where: { id: congregationId, tenantId: req.user!.tenantId },
      });
      if (!cong) {
        return res.status(400).json({ success: false, error: "Congregação inválida" });
      }
    }

    const hash = await bcrypt.hash(String(password), 12);
    const created = await prisma.user.create({
      data: {
        tenantId: req.user!.tenantId,
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        passwordHash: hash,
        role: role || "GERENTE",
        congregationId: congregationId || null,
      },
      include: { congregation: { select: { name: true } } },
    });

    res.status(201).json({ success: true, data: sanitize(created) });
  })
);

// ─────────────────────────────────────────────────────────
// PATCH /api/users/:id  — atualiza role/congregação/ativo
// ─────────────────────────────────────────────────────────
router.patch(
  "/:id",
  adminOnly,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, role, congregationId, active } = req.body || {};

    // Garante que o user-alvo pertence ao mesmo tenant
    const target = await prisma.user.findFirst({
      where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    });
    if (!target) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }

    // Não deixa o admin remover a própria atribuição de congregação
    // (mas pode mudar o nome, role e ativo)
    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (role !== undefined) data.role = role;
    if (congregationId !== undefined) {
      data.congregationId = congregationId || null;
      if (congregationId) {
        const cong = await prisma.congregation.findFirst({
          where: { id: congregationId, tenantId: req.user!.tenantId },
        });
        if (!cong) {
          return res.status(400).json({ success: false, error: "Congregação inválida" });
        }
      }
    }
    if (active !== undefined) data.active = !!active;

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { congregation: { select: { name: true } } },
    });

    res.json({ success: true, data: sanitize(updated) });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/users/:id/reset-password  — gera senha temporária
// ─────────────────────────────────────────────────────────
router.post(
  "/:id/reset-password",
  adminOnly,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const target = await prisma.user.findFirst({
      where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    });
    if (!target) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }

    // Gera senha aleatória amigável: Kairos-7xR2pQ
    const tempPassword = "Kairos-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const hash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id }, data: { passwordHash: hash } });

    res.json({
      success: true,
      data: {
        tempPassword,
        userEmail: target.email,
        message: "Senha temporária gerada. Envie ao pastor por WhatsApp.",
      },
    });
  })
);

// ─────────────────────────────────────────────────────────
// DELETE /api/users/:id  — soft delete (desativa)
// ─────────────────────────────────────────────────────────
router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Impede auto-desativação
    if (id === req.user!.userId) {
      return res.status(400).json({
        success: false,
        error: "Você não pode desativar seu próprio usuário.",
      });
    }

    const target = await prisma.user.findFirst({
      where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    });
    if (!target) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    res.json({ success: true, message: "Usuário desativado" });
  })
);

export { router as userRoutes };
