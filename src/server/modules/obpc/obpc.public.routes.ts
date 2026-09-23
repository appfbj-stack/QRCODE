// =====================================================================
// OBPC — Rotas PÚBLICAS (escaneamento do QR Code)
// =====================================================================
// Estas rotas NÃO exigem login e devem ser montadas ANTES do
// subscription guard, para que participantes consigam fazer check-in
// mesmo durante o trial / bloqueio.
// =====================================================================

import { Router, Request, Response } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { prisma } from "../../config/database";
import { obpcBus } from "./obpc.service";

const router = Router();

// GET /public/event/:token — dados do evento
router.get(
  "/event/:token",
  asyncHandler(async (req: Request, res: Response) => {
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: req.params.token, deletedAt: null },
      include: {
        tenant: { select: { name: true, logo: true } },
        congregation: { select: { id: true, name: true } },
      },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido ou expirado" });
    res.json({
      success: true,
      data: {
        id: ev.id,
        name: ev.name,
        date: ev.date,
        time: ev.time,
        location: ev.location,
        hostChurch: ev.hostChurch,
        fixedChurch: ev.congregation ? { id: ev.congregation.id, name: ev.congregation.name } : null,
        tenantName: ev.tenant.name,
        tenantLogo: ev.tenant.logo,
        status: ev.status,
        message:
          ev.status === "ENCERRADO"
            ? "Este evento já foi encerrado"
            : ev.status === "CANCELADO"
            ? "Este evento foi cancelado"
            : null,
      },
    });
  })
);

// GET /public/event/:token/stream — SSE público
router.get(
  "/event/:token/stream",
  asyncHandler(async (req: Request, res: Response) => {
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: req.params.token, deletedAt: null },
    });
    if (!ev) return res.status(404).end();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const send = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    send({ type: "connected", eventId: ev.id, name: ev.name, ts: Date.now() });

    const onCheckin = (payload: any) => send(payload);
    obpcBus.on(`event:${ev.id}:checkin`, onCheckin);

    const hb = setInterval(() => res.write(`: hb\n\n`), 25_000);
    req.on("close", () => {
      clearInterval(hb);
      obpcBus.off(`event:${ev.id}:checkin`, onCheckin);
    });
  })
);

// GET /public/event/:token/stats — snapshot inicial pro telão
// (presenças, contadores por função/igreja) — SÓ DO EVENTO DESSE TOKEN
router.get(
  "/event/:token/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: req.params.token, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido" });

    const attendances = await prisma.obpcAttendance.findMany({
      where: { eventId: ev.id },
      orderBy: { createdAt: "asc" },
    });

    const byRole: Record<string, number> = {};
    const byChurch: Record<string, number> = {};
    for (const a of attendances) {
      const role = (a.memberRole || "MEMBRO").toString();
      byRole[role] = (byRole[role] || 0) + 1;
      const ch = (a.churchName || "—").toString();
      byChurch[ch] = (byChurch[ch] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        event: { id: ev.id, name: ev.name, status: ev.status, date: ev.date, time: ev.time, hostChurch: ev.hostChurch },
        total: attendances.length,
        byRole,
        byChurch,
        recent: attendances.slice(-10).reverse(),
      },
    });
  })
);

// GET /public/congregations?token= — lista igrejas do tenant (pro dropdown do check-in)
router.get(
  "/congregations",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query as Record<string, string | undefined>;
    if (!token) return res.status(400).json({ success: false, error: "token obrigatório" });
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: token, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido" });

    const congregations = await prisma.congregation.findMany({
      where: { tenantId: ev.tenantId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    });
    res.json({ success: true, data: congregations });
  })
);

// POST /public/congregations — cadastra nova igreja na hora (sempre prefixa "OBPC ")
router.post(
  "/congregations",
  asyncHandler(async (req: Request, res: Response) => {
    const { token, name } = req.body || {};
    if (!token || !name) {
      return res.status(400).json({ success: false, error: "token e name são obrigatórios" });
    }
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: token, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido" });

    const raw = String(name).trim();
    if (!raw) return res.status(400).json({ success: false, error: "Nome vazio" });
    // Garante prefixo "OBPC " (case-insensitive)
    const final = /^obpc\s+/i.test(raw) ? raw : `OBPC ${raw}`;

    // Se já existe (case-insensitive) no mesmo tenant, retorna o existente (idempotente)
    const existing = await prisma.congregation.findFirst({
      where: { tenantId: ev.tenantId, deletedAt: null, name: { equals: final, mode: "insensitive" } },
    });
    if (existing) {
      return res.json({ success: true, data: existing, alreadyExists: true });
    }

    const created = await prisma.congregation.create({
      data: { tenantId: ev.tenantId, name: final },
    });
    res.status(201).json({ success: true, data: created });
  })
);

// GET /public/members/lookup?q=&token= — autocomplete
router.get(
  "/members/lookup",
  asyncHandler(async (req: Request, res: Response) => {
    const { q, token } = req.query as Record<string, string | undefined>;
    if (!q || q.trim().length < 2) return res.json({ success: true, data: [] });
    if (!token) return res.json({ success: true, data: [] });

    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: token, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido" });

    const term = q.trim();
    const members = await prisma.member.findMany({
      where: {
        tenantId: ev.tenantId,
        active: true,
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { phone: { contains: term } },
        ],
      },
      take: 15,
      orderBy: { name: "asc" },
      include: { congregation: { select: { name: true } } },
    });

    res.json({
      success: true,
      data: members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role || "MEMBRO",
        congregationName: m.congregation?.name || null,
      })),
    });
  })
);

// GET /public/event/:token/church-members — lista membros da igreja fixa do evento (chamada fechada)
router.get(
  "/event/:token/church-members",
  asyncHandler(async (req: Request, res: Response) => {
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: req.params.token, deletedAt: null },
      include: { congregation: { select: { id: true, name: true } } },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido" });
    if (!ev.congregationId) {
      return res.status(400).json({
        success: false,
        error: "Este evento não tem igreja fixa definida",
      });
    }

    const members = await prisma.member.findMany({
      where: {
        tenantId: ev.tenantId,
        congregationId: ev.congregationId,
        active: true,
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      include: { congregation: { select: { name: true } } },
    });

    // Marca quem JÁ fez check-in
    const checkedIn = await prisma.obpcAttendance.findMany({
      where: { eventId: ev.id, memberId: { in: members.map((m) => m.id) } },
      select: { memberId: true },
    });
    const checkedSet = new Set(checkedIn.map((a) => a.memberId));

    res.json({
      success: true,
      data: {
        church: ev.congregation,
        total: members.length,
        present: checkedSet.size,
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role || "MEMBRO",
          alreadyCheckedIn: checkedSet.has(m.id),
        })),
      },
    });
  })
);

// POST /public/quick-register
router.post(
  "/quick-register",
  asyncHandler(async (req: Request, res: Response) => {
    const { token, name, phone, role, churchName, acceptLgpd } = req.body || {};
    if (!token || !name) {
      return res.status(400).json({ success: false, error: "token e name são obrigatórios" });
    }
    if (!acceptLgpd) {
      return res.status(400).json({ success: false, error: "É necessário aceitar a política de privacidade" });
    }
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: token, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido" });
    if (ev.status !== "ABERTO") {
      return res.status(400).json({ success: false, error: "Evento não está aberto para check-in" });
    }

    // Se o usuário informou uma igreja, busca ou cria no cadastro do tenant
    let congregationId: string | null = null;
    let finalChurchName: string | null = null;
    const churchTrim = (churchName || "").trim();
    if (churchTrim) {
      // Garante prefixo "OBPC " (case-insensitive) pra manter padrao do sistema
      const withPrefix = /^obpc\s+/i.test(churchTrim) ? churchTrim : `OBPC ${churchTrim}`;
      const existing = await prisma.congregation.findFirst({
        where: { tenantId: ev.tenantId, deletedAt: null, name: { equals: withPrefix, mode: "insensitive" } },
      });
      if (existing) {
        congregationId = existing.id;
        finalChurchName = existing.name;
      } else {
        const created = await prisma.congregation.create({
          data: { tenantId: ev.tenantId, name: withPrefix },
        });
        congregationId = created.id;
        finalChurchName = created.name;
      }
    }

    const member = await prisma.member.create({
      data: {
        tenantId: ev.tenantId,
        name,
        phone: phone || null,
        role: role || "MEMBRO",
        congregationId,
        status: "membro",
        active: true,
        consentAcceptedAt: new Date(),
        consentTermsVersion: "v1.0-2026-08-23",
      },
    });

    try {
      const att = await prisma.obpcAttendance.create({
        data: {
          tenantId: ev.tenantId,
          eventId: ev.id,
          memberId: member.id,
          memberName: member.name,
          memberRole: member.role || "MEMBRO",
          churchName: finalChurchName,
          method: "qrcode-quick",
          ip: req.ip || null,
          userAgent: req.headers["user-agent"]?.toString().slice(0, 200) || null,
        },
      });
      obpcBus.emitCheckin(ev.id, { type: "checkin", eventId: ev.id, attendance: att });
      res.status(201).json({ success: true, data: { member, attendance: att, congregationId } });
    } catch (e: any) {
      const existing = await prisma.obpcAttendance.findFirst({
        where: { eventId: ev.id, memberId: member.id },
      });
      if (existing) {
        return res.json({ success: true, data: { member, attendance: existing, congregationId }, alreadyCheckedIn: true });
      }
      throw e;
    }
  })
);

// POST /public/checkin
router.post(
  "/checkin",
  asyncHandler(async (req: Request, res: Response) => {
    const { token, memberId } = req.body || {};
    if (!token || !memberId) {
      return res.status(400).json({ success: false, error: "token e memberId são obrigatórios" });
    }
    const ev = await prisma.obpcEvent.findFirst({
      where: { qrToken: token, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "QR inválido" });
    if (ev.status !== "ABERTO") {
      return res.status(400).json({ success: false, error: "Evento não está aberto para check-in" });
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, tenantId: ev.tenantId, active: true, deletedAt: null },
      include: { congregation: { select: { name: true } } },
    });
    if (!member) return res.status(404).json({ success: false, error: "Membro não encontrado" });

    try {
      const att = await prisma.obpcAttendance.create({
        data: {
          tenantId: ev.tenantId,
          eventId: ev.id,
          memberId: member.id,
          memberName: member.name,
          memberRole: member.role || "MEMBRO",
          churchName: member.congregation?.name || null,
          method: "qrcode",
          ip: req.ip || null,
          userAgent: req.headers["user-agent"]?.toString().slice(0, 200) || null,
        },
      });
      obpcBus.emitCheckin(ev.id, { type: "checkin", eventId: ev.id, attendance: att });
      res.status(201).json({ success: true, data: att });
    } catch (e: any) {
      if (String(e?.code) === "P2002") {
        const existing = await prisma.obpcAttendance.findFirst({
          where: { eventId: ev.id, memberId: member.id },
        });
        return res.status(409).json({
          success: false,
          error: "Você já registrou presença neste evento",
          data: existing,
        });
      }
      throw e;
    }
  })
);

export default router;
