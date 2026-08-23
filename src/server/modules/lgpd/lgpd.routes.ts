/**
 * lgpd.routes.ts
 *
 * Endpoints LGPD (Lei Geral de Protecao de Dados) para o titular dos dados:
 *  - GET  /api/lgpd/export                 Exporta todos os dados do membro logado
 *  - POST /api/lgpd/request-deletion       Direito ao esquecimento (Art. 18, VI)
 *  - GET  /api/lgpd/audit-me              Log de acessos aos seus proprios dados
 *
 * Esses endpoints NAO exigem role especial - qualquer usuario pode exercer
 * seus direitos sobre seus proprios dados.
 *
 * Os dados sao escopados ao tenantId do usuario, garantindo que cada pessoa
 * so consegue acessar/exportar/excluir os seus proprios dados.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../config/database";
import { authMiddleware } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { AuthRequest } from "../../types";

const router = Router();
router.use(authMiddleware);

// Versao atual do termo de uso (LGPD exige rastrear qual versao foi aceita)
export const CURRENT_TERMS_VERSION = "v1.0-2026-08-22";

// Helper pra registrar audit log
async function logAudit(
  req: AuthRequest,
  subjectType: string,
  subjectId: string,
  action: string,
  details?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: req.user!.tenantId,
        actorUserId: req.user!.userId,
        actorEmail: req.user!.email,
        subjectType,
        subjectId,
        action,
        details: details ? JSON.stringify(details) : null,
        ip: (req.headers["x-forwarded-for"] as string) || req.ip,
        userAgent: req.headers["user-agent"] as string,
      },
    });
  } catch (e) {
    // Nao bloquear a operacao principal se audit falhar
    console.error("[lgpd] audit log falhou:", (e as Error).message);
  }
}

// =================================================================
// GET /api/lgpd/export
// Retorna todos os dados pessoais do membro logado em JSON
// Art. 18, II e IV LGPD (direito de acesso e portabilidade)
// =================================================================
router.get(
  "/export",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    // O usuario logado pode exportar APENAS os proprios dados
    // (a vinculacao user -> member e feita por email ou id)
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        tenant: { select: { name: true, slug: true } },
        congregation: { select: { name: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario nao encontrado" });
    }

    // Tenta achar o Member vinculado (por email ou outro criterio)
    let member: any = null;
    if (user.email) {
      member = await prisma.member.findFirst({
        where: { email: user.email, tenantId },
        include: {
          congregation: { select: { name: true } },
        },
      });
    }

    // Auditoria
    await logAudit(req, "user", userId, "EXPORT", { hasMember: !!member });

    return res.json({
      success: true,
      data: {
        exportDate: new Date().toISOString(),
        exportFormat: "JSON",
        lgpdArticle: "Art. 18, II e IV - Direito de acesso e portabilidade",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          tenant: user.tenant,
          congregation: user.congregation,
        },
        member: member
          ? {
              id: member.id,
              name: member.name,
              email: member.email,
              phone: member.phone,
              birthDate: member.birthDate,
              address: member.address,
              maritalStatus: member.maritalStatus,
              baptized: member.baptized,
              memberSince: member.memberSince,
              status: member.status,
              role: member.role,
              cpf: member.cpf,
              filiation: member.filiation,
              cardValidity: member.cardValidity,
              baptismDate: member.baptismDate,
              ministries: member.ministries,
              joinedAt: member.joinedAt,
              congregation: member.congregation,
              consentAcceptedAt: member.consentAcceptedAt,
              consentTermsVersion: member.consentTermsVersion,
            }
          : null,
        consent: {
          acceptedAt: member?.consentAcceptedAt ?? null,
          termsVersion: member?.consentTermsVersion ?? null,
          currentVersion: CURRENT_TERMS_VERSION,
          outOfDate: member?.consentTermsVersion !== CURRENT_TERMS_VERSION,
        },
      },
    });
  })
);

// =================================================================
// POST /api/lgpd/request-deletion
// Marca o Member como "exclusao solicitada" (Art. 18, VI - esquecimento)
// Soft delete: a exclusao real acontece via job (apos 30 dias, permite cancelar)
// =================================================================
router.post(
  "/request-deletion",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    const { motivo } = req.body || {};

    const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario nao encontrado" });
    }

    // Encontrar o Member vinculado
    let member: any = null;
    if (user.email) {
      member = await prisma.member.findFirst({ where: { email: user.email, tenantId } });
    }

    if (!member) {
      // Se nao tem Member, deletar o User (soft delete) eh o suficiente
      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), active: false },
      });
      await logAudit(req, "user", userId, "DELETION_REQUEST", { via: "user-only", motivo });
      return res.json({
        success: true,
        message: "Solicitacao de exclusao registrada. A conta sera desativada em 30 dias.",
      });
    }

    // Marcar o Member como "exclusao solicitada"
    await prisma.member.update({
      where: { id: member.id },
      data: {
        dataExclusaoSolicitada: new Date(),
        motivoExclusao: motivo || null,
        active: false, // ja desativa imediatamente
      },
    });

    await logAudit(req, "member", member.id, "DELETION_REQUEST", { motivo });

    return res.json({
      success: true,
      message:
        "Solicitacao de exclusao registrada. Os dados serao anonimizados em 30 dias. " +
        "Para cancelar, faca login e solicite a reversao antes desse prazo.",
      data: {
        dataExclusaoSolicitada: new Date(),
        anonimizacaoEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  })
);

// =================================================================
// GET /api/lgpd/audit-me
// Retorna o historico de acessos aos proprios dados
// =================================================================
router.get(
  "/audit-me",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    // Buscar o Member vinculado (se houver)
    const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    let memberId: string | null = null;
    if (user?.email) {
      const member = await prisma.member.findFirst({
        where: { email: user.email, tenantId },
        select: { id: true },
      });
      memberId = member?.id ?? null;
    }

    // Buscar todos os logs onde o ator sou EU (acessei dados de outros)
    // OU onde o sujeito sou EU (outros acessaram meus dados)
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        OR: [
          { actorUserId: userId },
          ...(memberId ? [{ subjectId: memberId }] : [{ subjectId: userId }]),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json({
      success: true,
      data: {
        total: logs.length,
        logs: logs.map((l) => ({
          id: l.id,
          action: l.action,
          subjectType: l.subjectType,
          subjectId: l.subjectId,
          actorEmail: l.actorEmail,
          ip: l.ip,
          createdAt: l.createdAt,
          details: l.details ? JSON.parse(l.details) : null,
        })),
      },
    });
  })
);

export default router;
