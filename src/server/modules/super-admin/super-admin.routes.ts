/**
 * super-admin.routes.ts
 *
 * Endpoints REST do painel Super Admin da plataforma.
 * TODAS as rotas exigem role SUPER_ADMIN (ver middleware superAdmin.ts).
 *
 * Rotas:
 *  - GET    /api/super-admin/stats          → indicadores do dashboard
 *  - GET    /api/super-admin/tenants        → lista todas as igrejas
 *  - POST   /api/super-admin/tenants        → cria igreja + admin inicial
 *  - GET    /api/super-admin/tenants/:id    → detalhes completos
 *  - PATCH  /api/super-admin/tenants/:id    → edita (nome, plano, vencimento, etc)
 *  - DELETE /api/super-admin/tenants/:id    → desativa (soft delete)
 *  - POST   /api/super-admin/tenants/:id/block     → bloqueia com motivo
 *  - POST   /api/super-admin/tenants/:id/unblock   → desbloqueia
 *  - POST   /api/super-admin/tenants/:id/trial     → reseta trial p/ 10 dias
 *  - GET    /api/super-admin/tenants/:id/stats     → contadores (membros, users, etc)
 *
 * Nenhuma rota usa req.tenantId — Super Admin enxerga TUDO.
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { asyncHandler } from "../../middleware/asyncHandler";
import { authMiddleware } from "../../middleware/auth";
import { requireSuperAdmin } from "../../middleware/superAdmin";
import { AuthRequest } from "../../types";

const router = Router();

// Todas as rotas exigem auth + role SUPER_ADMIN
router.use(authMiddleware, requireSuperAdmin);

// ─────────────────────────────────────────────────────────
// GET /api/super-admin/stats
// Dashboard: totais + igrejas vencendo/atrasadas/bloqueadas/em trial
// ─────────────────────────────────────────────────────────
router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [total, trial, active, overdue, blocked, cancelled, expiring, users, members] =
      await Promise.all([
        prisma.tenant.count({ where: { deletedAt: null } }),
        prisma.tenant.count({
          where: { deletedAt: null, subscriptionStatus: "TRIAL" },
        }),
        prisma.tenant.count({
          where: { deletedAt: null, subscriptionStatus: "ACTIVE" },
        }),
        prisma.tenant.count({
          where: { deletedAt: null, subscriptionStatus: "OVERDUE" },
        }),
        prisma.tenant.count({
          where: { deletedAt: null, subscriptionStatus: "BLOCKED" },
        }),
        prisma.tenant.count({
          where: { deletedAt: null, subscriptionStatus: "CANCELLED" },
        }),
        prisma.tenant.count({
          where: {
            deletedAt: null,
            subscriptionStatus: "ACTIVE",
            subscriptionEndsAt: { gte: now, lte: in7days },
          },
        }),
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.member.count({ where: { deletedAt: null } }),
      ]);

    return res.json({
      total,
      trial,
      active,
      overdue,
      blocked,
      cancelled,
      expiringIn7Days: expiring,
      totalUsers: users,
      totalMembers: members,
    });
  })
);

// ─────────────────────────────────────────────────────────
// GET /api/super-admin/tenants
// Lista todas as igrejas (com paginação + busca)
// ─────────────────────────────────────────────────────────
router.get(
  "/tenants",
  asyncHandler(async (req: Request, res: Response) => {
    const { search, status, page = 1, limit = 50 } = req.query as any;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { cnpj: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.subscriptionStatus = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
        include: {
          _count: { select: { users: true, congregations: true, members: true } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);
    return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/super-admin/tenants
// Cria nova igreja + admin inicial (gera senha aleatória forte)
// ─────────────────────────────────────────────────────────
router.post(
  "/tenants",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      slug,
      cnpj,
      telefone,
      email,
      endereco,
      adminName,
      adminEmail,
      planKey = "BASICO",
    } = req.body || {};

    if (!name || !slug) {
      return res.status(400).json({ success: false, error: "name e slug são obrigatórios" });
    }
    const slugLower = String(slug).toLowerCase().trim();
    const existing = await prisma.tenant.findUnique({ where: { slug: slugLower } });
    if (existing) {
      return res.status(400).json({ success: false, error: "slug já existe" });
    }

    // Senha aleatória para o admin (se não informada)
    const generatedPassword =
      Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2).toUpperCase();
    const passwordHash = await bcrypt.hash(generatedPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: String(name).trim(),
          slug: slugLower,
          cnpj: cnpj || null,
          telefone: telefone || null,
          email: email || null,
          endereco: endereco || null,
          planKey,
          subscriptionStatus: "TRIAL",
          trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      });

      // Cria admin inicial se informado
      let admin = null;
      if (adminEmail && adminName) {
        admin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: String(adminName).trim(),
            email: String(adminEmail).toLowerCase().trim(),
            passwordHash,
            role: "ADMIN",
          },
        });
      }

      return { tenant, admin, generatedPassword: admin ? generatedPassword : null };
    });

    return res.status(201).json({
      success: true,
      tenant: result.tenant,
      admin: result.admin,
      generatedPassword: result.generatedPassword,
    });
  })
);

// ─────────────────────────────────────────────────────────
// GET /api/super-admin/tenants/:id
// Detalhes completos (com users + congregations + members)
// ─────────────────────────────────────────────────────────
router.get(
  "/tenants/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        users: { where: { deletedAt: null }, select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true } },
        congregations: { where: { deletedAt: null }, select: { id: true, name: true, pastorName: true } },
        _count: { select: { members: true, events: true, finances: true, celulas: true, ministries: true, murals: true, prayers: true, sermons: true, volunteers: true, assets: true, documents: true, payments: true } },
      },
    });
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Igreja não encontrada" });
    }
    return res.json({ success: true, data: tenant });
  })
);

// ─────────────────────────────────────────────────────────
// PATCH /api/super-admin/tenants/:id
// Edita dados básicos + plano + vencimento
// ─────────────────────────────────────────────────────────
router.patch(
  "/tenants/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const allowed = [
      "name", "cnpj", "telefone", "email", "endereco",
      "planKey", "subscriptionStatus", "subscriptionEndsAt",
      "trialEndsAt", "diasTolerancia", "active", "logo",
    ];
    const data: any = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) data[k] = req.body[k];
    }
    if (data.subscriptionEndsAt) data.subscriptionEndsAt = new Date(data.subscriptionEndsAt);
    if (data.trialEndsAt) data.trialEndsAt = new Date(data.trialEndsAt);

    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data,
    });
    return res.json({ success: true, data: updated });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/super-admin/tenants/:id/block
// Bloqueia manualmente com motivo
// ─────────────────────────────────────────────────────────
router.post(
  "/tenants/:id/block",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { motivo } = req.body || {};
    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        subscriptionStatus: "BLOCKED",
        motivoBloqueio: motivo || "Bloqueado pelo Super Admin",
        bloqueadoEm: new Date(),
        bloqueadoPor: req.user!.userId,
      },
    });
    return res.json({ success: true, data: updated, message: "Igreja bloqueada" });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/super-admin/tenants/:id/unblock
// Desbloqueia
// ─────────────────────────────────────────────────────────
router.post(
  "/tenants/:id/unblock",
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        subscriptionStatus: "ACTIVE",
        motivoBloqueio: null,
        bloqueadoEm: null,
        bloqueadoPor: null,
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return res.json({ success: true, data: updated, message: "Igreja desbloqueada (30 dias)" });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/super-admin/tenants/:id/trial
// Reseta trial pra 10 dias
// ─────────────────────────────────────────────────────────
router.post(
  "/tenants/:id/trial",
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        subscriptionStatus: "TRIAL",
        trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        motivoBloqueio: null,
        bloqueadoEm: null,
        bloqueadoPor: null,
      },
    });
    return res.json({ success: true, data: updated, message: "Trial resetado (10 dias)" });
  })
);

// ─────────────────────────────────────────────────────────
// DELETE /api/super-admin/tenants/:id
// Soft delete (marca deletedAt)
// ─────────────────────────────────────────────────────────
router.delete(
  "/tenants/:id",
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.tenant.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), active: false },
    });
    return res.json({ success: true, message: "Igreja desativada" });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/super-admin/users
// Lista TODOS os usuários da plataforma (cross-tenant)
// Útil pra debug e suporte
// ─────────────────────────────────────────────────────────
router.get(
  "/users",
  asyncHandler(async (req: Request, res: Response) => {
    const { search, page = 1, limit = 50 } = req.query as any;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { tenant: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);
    return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
  })
);

export default router;
