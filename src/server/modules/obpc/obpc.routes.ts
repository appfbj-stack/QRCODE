// =====================================================================
// OBPC — Rotas ADMIN (autenticadas, dentro do tenant)
// =====================================================================
// Eventos, cursos, frequência, estatísticas, SSE autenticado
// =====================================================================

import { Router, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { prisma } from "../../config/database";
import { obpcBus, generateEventQrToken } from "./obpc.service";

const router = Router();

// =====================================================================
// EVENTOS
// =====================================================================

// GET /events
router.get(
  "/events",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const { status, search, page, limit } = req.query as Record<string, string | undefined>;
    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };
    const pageNum = page ? Math.max(1, Number(page)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, Number(limit))) : 50;
    const [data, total] = await Promise.all([
      prisma.obpcEvent.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { _count: { select: { attendances: true } } },
      }),
      prisma.obpcEvent.count({ where }),
    ]);
    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  })
);

// GET /events/:id
router.get(
  "/events/:id",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const ev = await prisma.obpcEvent.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
      include: { congregation: true, _count: { select: { attendances: true } } },
    });
    if (!ev) return res.status(404).json({ success: false, error: "Evento não encontrado" });
    res.json({ success: true, data: ev });
  })
);

// POST /events
router.post(
  "/events",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const { name, description, date, time, location, hostChurch, congregationId, status } = req.body || {};
    if (!name || !date) {
      return res.status(400).json({ success: false, error: "name e date são obrigatórios" });
    }
    const ev = await prisma.obpcEvent.create({
      data: {
        tenantId,
        name,
        description: description || null,
        date: new Date(date),
        time: time || null,
        location: location || null,
        hostChurch: hostChurch || null,
        congregationId: congregationId || null,
        status: status || "ABERTO",
      },
    });
    res.status(201).json({ success: true, data: ev });
  })
);

// PATCH /events/:id
router.patch(
  "/events/:id",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const { id, tenantId: _t, createdAt, updatedAt, deletedAt, qrToken, qrRotatedAt, startedAt, closedAt, ...clean } = req.body || {};
    if (clean.date) clean.date = new Date(clean.date);
    const result = await prisma.obpcEvent.updateMany({
      where: { id: req.params.id, tenantId, deletedAt: null },
      data: clean,
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true, message: "Atualizado" });
  })
);

// DELETE /events/:id
router.delete(
  "/events/:id",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const result = await prisma.obpcEvent.updateMany({
      where: { id: req.params.id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true, message: "Removido" });
  })
);

// POST /events/:id/open
router.post(
  "/events/:id/open",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const ev = await prisma.obpcEvent.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "Evento não encontrado" });
    const token = ev.qrToken || generateEventQrToken();
    const updated = await prisma.obpcEvent.update({
      where: { id: ev.id },
      data: { status: "ABERTO", qrToken: token, qrRotatedAt: new Date(), startedAt: ev.startedAt || new Date() },
    });
    obpcBus.emitCheckin(ev.id, { type: "event-opened", eventId: ev.id });
    res.json({ success: true, data: updated });
  })
);

// POST /events/:id/close
router.post(
  "/events/:id/close",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const result = await prisma.obpcEvent.updateMany({
      where: { id: req.params.id, tenantId, deletedAt: null },
      data: { status: "ENCERRADO", closedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: "Não encontrado" });
    obpcBus.emitCheckin(req.params.id, { type: "event-closed", eventId: req.params.id });
    res.json({ success: true, message: "Evento encerrado" });
  })
);

// POST /events/:id/rotate-qr
router.post(
  "/events/:id/rotate-qr",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const newToken = generateEventQrToken();
    const result = await prisma.obpcEvent.updateMany({
      where: { id: req.params.id, tenantId, deletedAt: null },
      data: { qrToken: newToken, qrRotatedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: "Não encontrado" });
    obpcBus.emitCheckin(req.params.id, { type: "qr-rotated", eventId: req.params.id });
    res.json({ success: true, data: { qrToken: newToken } });
  })
);

// GET /events/:id/attendances
router.get(
  "/events/:id/attendances",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const ev = await prisma.obpcEvent.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "Evento não encontrado" });
    const attendances = await prisma.obpcAttendance.findMany({
      where: { eventId: ev.id },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: attendances, total: attendances.length });
  })
);

// GET /events/:id/stats
router.get(
  "/events/:id/stats",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const ev = await prisma.obpcEvent.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "Evento não encontrado" });

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
        total: attendances.length,
        byRole,
        byChurch,
        recent: attendances.slice(-10).reverse(),
      },
    });
  })
);

// =====================================================================
// EXPORTAÇÃO — Lista de membros (CSV / HTML-PDF / XLSX-friendly)
// =====================================================================
// GET /members/export?format=csv&role=PASTOR&churchId=xxx
router.get(
  "/members/export",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const format = (req.query.format || "csv").toString();
    const role = req.query.role as string | undefined;
    const churchId = req.query.churchId as string | undefined;

    const where: any = { tenantId, active: true, deletedAt: null };
    if (role) where.role = role;
    if (churchId) where.congregationId = churchId;

    const members = await prisma.member.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { congregation: { select: { name: true } } },
    });

    // Gera CSV
    const csvLines: string[] = [];
    csvLines.push("Nome;Funcao;Igreja;Status;Cadastrado em");
    for (const m of members) {
      const name = (m.name || "").replace(/"/g, '""');
      const roleS = m.role || "MEMBRO";
      const church = (m.congregation?.name || "").replace(/"/g, '""');
      const status = m.status || "";
      const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString("pt-BR") : "";
      csvLines.push(`"${name}";"${roleS}";"${church}";"${status}";"${date}"`);
    }
    const csv = "\uFEFF" + csvLines.join("\r\n"); // BOM pro Excel abrir UTF-8

    if (format === "xlsx" || format === "csv") {
      const filename = `obreiros-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    if (format === "pdf" || format === "html") {
      // Gera HTML formatado (browser faz "Salvar como PDF")
      const roleCount: Record<string, number> = {};
      const churchCount: Record<string, number> = {};
      for (const m of members) {
        const r = m.role || "MEMBRO";
        roleCount[r] = (roleCount[r] || 0) + 1;
        const c = m.congregation?.name || "(sem igreja)";
        churchCount[c] = (churchCount[c] || 0) + 1;
      }
      const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Lista de Obreiros — ${new Date().toLocaleDateString("pt-BR")}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
  h1 { color: #047857; border-bottom: 3px solid #047857; padding-bottom: 8px; }
  h2 { color: #047857; margin-top: 32px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 20px 0; }
  .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; }
  .card .n { font-size: 24px; font-weight: bold; color: #047857; }
  .card .l { font-size: 11px; color: #475569; text-transform: uppercase; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 12px; }
  th { background: #047857; color: white; text-align: left; padding: 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .role { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; }
  .role.PASTOR { background: #fef3c7; color: #92400e; }
  .role.PRESBITERO { background: #ede9fe; color: #5b21b6; }
  .role.EVANGELISTA { background: #dbeafe; color: #1e40af; }
  .role.MISSIONARIA { background: #fce7f3; color: #9f1239; }
  .role.DIACONO { background: #d1fae5; color: #065f46; }
  .role.DIACONISA { background: #ffe4e6; color: #9f1239; }
  .role.MEMBRO { background: #f1f5f9; color: #334155; }
  .footer { margin-top: 32px; font-size: 10px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { .noprint { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<h1>📋 Lista de Obreiros — OBPC</h1>
<p><strong>Total:</strong> ${members.length} obreiros &middot; <strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>

<h2>Por Função Eclesiástica</h2>
<div class="summary">
${Object.entries(roleCount).sort().map(([r, n]) => `<div class="card"><div class="n">${n}</div><div class="l">${r}</div></div>`).join("")}
</div>

<h2>Por Igreja / Congregação</h2>
<div class="summary">
${Object.entries(churchCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, n]) => `<div class="card"><div class="n">${n}</div><div class="l">${c}</div></div>`).join("")}
</div>

<h2>Lista Detalhada</h2>
<table>
<thead><tr><th>#</th><th>Nome</th><th>Função</th><th>Igreja</th><th>Cadastrado</th></tr></thead>
<tbody>
${members.map((m, i) => `<tr>
  <td>${i + 1}</td>
  <td>${m.name || ""}</td>
  <td><span class="role ${m.role || "MEMBRO"}">${m.role || "MEMBRO"}</span></td>
  <td>${m.congregation?.name || "(sem igreja)"}</td>
  <td>${m.createdAt ? new Date(m.createdAt).toLocaleDateString("pt-BR") : ""}</td>
</tr>`).join("")}
</tbody>
</table>

<div class="footer">
  QRCODE Obreiros OBPC &middot; v1.2.2 &middot; Gerado automaticamente
</div>

<div class="noprint" style="margin-top: 24px; text-align: center;">
  <button onclick="window.print()" style="padding: 12px 32px; background: #047857; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
    🖨️ Imprimir / Salvar como PDF
  </button>
</div>
</body></html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    res.status(400).json({ success: false, error: "Formato inválido. Use csv, xlsx ou pdf." });
  })
);

// =====================================================================
// EXPORTAÇÃO POR EVENTO — Lista de PRESENÇAS de UM evento
// =====================================================================
// GET /events/:id/export?format=csv|pdf
router.get(
  "/events/:id/export",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const format = (req.query.format || "csv").toString();

    const ev = await prisma.obpcEvent.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "Evento não encontrado" });

    const attendances = await prisma.obpcAttendance.findMany({
      where: { eventId: ev.id, tenantId },
      orderBy: [{ memberRole: "asc" }, { memberName: "asc" }],
    });

    // Resumo
    const byRole: Record<string, number> = {};
    const byChurch: Record<string, number> = {};
    for (const a of attendances) {
      const r = a.memberRole || "MEMBRO";
      byRole[r] = (byRole[r] || 0) + 1;
      const c = a.churchName || "(sem igreja)";
      byChurch[c] = (byChurch[c] || 0) + 1;
    }

    const filenameBase = `presencas-${ev.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 30)}-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv" || format === "xlsx") {
      const csvLines: string[] = [];
      csvLines.push("Nome;Funcao;Igreja;Check-in em");
      for (const a of attendances) {
        const name = (a.memberName || "").replace(/"/g, '""');
        const role = a.memberRole || "MEMBRO";
        const church = (a.churchName || "").replace(/"/g, '""');
        const when = a.createdAt ? new Date(a.createdAt).toLocaleString("pt-BR") : "";
        csvLines.push(`"${name}";"${role}";"${church}";"${when}"`);
      }
      const csv = "\uFEFF" + csvLines.join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
      return res.send(csv);
    }

    if (format === "pdf" || format === "html") {
      const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Presenças — ${ev.name}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
  h1 { color: #047857; border-bottom: 3px solid #047857; padding-bottom: 8px; }
  h2 { color: #047857; margin-top: 32px; }
  .meta { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 13px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 20px 0; }
  .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; }
  .card .n { font-size: 24px; font-weight: bold; color: #047857; }
  .card .l { font-size: 11px; color: #475569; text-transform: uppercase; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 12px; }
  th { background: #047857; color: white; text-align: left; padding: 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .role { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; }
  .role.PASTOR { background: #fef3c7; color: #92400e; }
  .role.PRESBITERO { background: #ede9fe; color: #5b21b6; }
  .role.EVANGELISTA { background: #dbeafe; color: #1e40af; }
  .role.MISSIONARIA { background: #fce7f3; color: #9f1239; }
  .role.DIACONO { background: #d1fae5; color: #065f46; }
  .role.DIACONISA { background: #ffe4e6; color: #9f1239; }
  .role.MEMBRO { background: #f1f5f9; color: #334155; }
  .footer { margin-top: 32px; font-size: 10px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { .noprint { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<h1>📋 Lista de Presenças</h1>
<h2 style="margin-top:8px; border:none; padding:0;">${ev.name}</h2>
<div class="meta">
  <strong>Data:</strong> ${new Date(ev.date).toLocaleDateString("pt-BR")} ${ev.time ? "· " + ev.time : ""}<br>
  ${ev.location ? `<strong>Local:</strong> ${ev.location}<br>` : ""}
  ${ev.hostChurch ? `<strong>Igreja sede:</strong> ${ev.hostChurch}<br>` : ""}
  <strong>Status:</strong> ${ev.status} &middot; <strong>Total de presenças:</strong> ${attendances.length}
</div>

<h2>Resumo por Função</h2>
<div class="summary">
${Object.entries(byRole).sort().map(([r, n]) => `<div class="card"><div class="n">${n}</div><div class="l">${r}</div></div>`).join("")}
</div>

<h2>Resumo por Igreja</h2>
<div class="summary">
${Object.entries(byChurch).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, n]) => `<div class="card"><div class="n">${n}</div><div class="l">${c}</div></div>`).join("")}
</div>

<h2>Lista Detalhada</h2>
<table>
<thead><tr><th>#</th><th>Nome</th><th>Função</th><th>Igreja</th><th>Check-in</th></tr></thead>
<tbody>
${attendances.map((a, i) => `<tr>
  <td>${i + 1}</td>
  <td>${a.memberName || ""}</td>
  <td><span class="role ${a.memberRole || "MEMBRO"}">${a.memberRole || "MEMBRO"}</span></td>
  <td>${a.churchName || "(sem igreja)"}</td>
  <td>${a.createdAt ? new Date(a.createdAt).toLocaleString("pt-BR") : ""}</td>
</tr>`).join("")}
</tbody>
</table>

<div class="footer">
  KAIROS QRCODE &middot; Lista de presenças gerada em ${new Date().toLocaleString("pt-BR")}
</div>

<div class="noprint" style="margin-top: 24px; text-align: center;">
  <button onclick="window.print()" style="padding: 12px 32px; background: #047857; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
    🖨️ Imprimir / Salvar como PDF
  </button>
</div>
</body></html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    res.status(400).json({ success: false, error: "Formato inválido. Use csv ou pdf." });
  })
);

// GET /events/:id/stream (SSE — autenticado)
router.get(
  "/events/:id/stream",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const ev = await prisma.obpcEvent.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!ev) return res.status(404).json({ success: false, error: "Evento não encontrado" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    send({ type: "connected", eventId: ev.id, ts: Date.now() });

    const onCheckin = (payload: any) => send(payload);
    obpcBus.on(`event:${ev.id}:checkin`, onCheckin);

    const hb = setInterval(() => res.write(`: hb\n\n`), 25_000);

    req.on("close", () => {
      clearInterval(hb);
      obpcBus.off(`event:${ev.id}:checkin`, onCheckin);
    });
  })
);

// =====================================================================
// CURSOS
// =====================================================================

// GET /courses
router.get(
  "/courses",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const courses = await prisma.obpcCourse.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { enrollments: true, classes: true } } },
    });
    res.json({ success: true, data: courses });
  })
);

// GET /courses/:id
router.get(
  "/courses/:id",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const course = await prisma.obpcCourse.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
      include: {
        enrollments: { where: { deletedAt: null } },
        classes: {
          where: { deletedAt: null },
          orderBy: { classNumber: "asc" },
          include: { _count: { select: { attendances: true } } },
        },
      },
    });
    if (!course) return res.status(404).json({ success: false, error: "Curso não encontrado" });
    res.json({ success: true, data: course });
  })
);

// POST /courses
router.post(
  "/courses",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const { name, description, category, target, teacher, startDate, endDate, status } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: "name é obrigatório" });
    const course = await prisma.obpcCourse.create({
      data: {
        tenantId,
        name,
        description: description || null,
        category: category || null,
        target: target || null,
        teacher: teacher || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || "ativo",
      },
    });
    res.status(201).json({ success: true, data: course });
  })
);

// PATCH /courses/:id
router.patch(
  "/courses/:id",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const { id, tenantId: _t, createdAt, updatedAt, deletedAt, ...clean } = req.body || {};
    if (clean.startDate) clean.startDate = new Date(clean.startDate);
    if (clean.endDate) clean.endDate = new Date(clean.endDate);
    const result = await prisma.obpcCourse.updateMany({
      where: { id: req.params.id, tenantId, deletedAt: null },
      data: clean,
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true });
  })
);

// DELETE /courses/:id
router.delete(
  "/courses/:id",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const result = await prisma.obpcCourse.updateMany({
      where: { id: req.params.id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true });
  })
);

// POST /courses/:id/enrollments
router.post(
  "/courses/:id/enrollments",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const course = await prisma.obpcCourse.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!course) return res.status(404).json({ success: false, error: "Curso não encontrado" });
    const { memberId, candidateName, candidatePhone, churchName, status, notes } = req.body || {};
    if (!memberId && !candidateName) {
      return res.status(400).json({ success: false, error: "Informe memberId ou candidateName" });
    }
    try {
      const enrollment = await prisma.obpcCourseEnrollment.create({
        data: {
          tenantId,
          courseId: course.id,
          memberId: memberId || null,
          candidateName: candidateName || "",
          candidatePhone: candidatePhone || null,
          churchName: churchName || null,
          status: status || "INSCRITO",
          notes: notes || null,
        },
      });
      res.status(201).json({ success: true, data: enrollment });
    } catch (e: any) {
      if (String(e?.code) === "P2002") {
        return res.status(409).json({ success: false, error: "Já matriculado neste curso" });
      }
      throw e;
    }
  })
);

// DELETE /enrollments/:id
router.delete(
  "/enrollments/:id",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const result = await prisma.obpcCourseEnrollment.updateMany({
      where: { id: req.params.id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: "Não encontrado" });
    res.json({ success: true });
  })
);

// POST /courses/:id/classes
router.post(
  "/courses/:id/classes",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const course = await prisma.obpcCourse.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!course) return res.status(404).json({ success: false, error: "Curso não encontrado" });
    const { title, classNumber, date, notes } = req.body || {};
    if (!date) return res.status(400).json({ success: false, error: "date é obrigatório" });
    let num = classNumber;
    if (!num) {
      const last = await prisma.obpcCourseClass.findFirst({
        where: { courseId: course.id, deletedAt: null },
        orderBy: { classNumber: "desc" },
      });
      num = (last?.classNumber || 0) + 1;
    }
    const cls = await prisma.obpcCourseClass.create({
      data: {
        tenantId,
        courseId: course.id,
        title: title || `Aula ${num}`,
        classNumber: num,
        date: new Date(date),
        notes: notes || null,
      },
    });
    res.status(201).json({ success: true, data: cls });
  })
);

// GET /classes/:id/attendances
router.get(
  "/classes/:id/attendances",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const cls = await prisma.obpcCourseClass.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
      include: {
        course: { include: { enrollments: { where: { deletedAt: null } } } },
        attendances: true,
      },
    });
    if (!cls) return res.status(404).json({ success: false, error: "Aula não encontrada" });
    const map = new Map(cls.attendances.map((a) => [a.enrollmentId, a.status]));
    const data = cls.course.enrollments.map((e) => ({
      enrollmentId: e.id,
      candidateName: e.candidateName,
      memberId: e.memberId,
      churchName: e.churchName,
      status: map.get(e.id) || "FALTA",
    }));
    res.json({ success: true, data, total: data.length });
  })
);

// POST /classes/:id/attendance
router.post(
  "/classes/:id/attendance",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const cls = await prisma.obpcCourseClass.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!cls) return res.status(404).json({ success: false, error: "Aula não encontrada" });
    const { enrollmentId, status, notes } = req.body || {};
    if (!enrollmentId) return res.status(400).json({ success: false, error: "enrollmentId é obrigatório" });
    const att = await prisma.obpcCourseClassAttendance.upsert({
      where: { classId_enrollmentId: { classId: cls.id, enrollmentId } },
      create: {
        tenantId,
        classId: cls.id,
        enrollmentId,
        status: status || "PRESENTE",
        notes: notes || null,
      },
      update: { status: status || "PRESENTE", notes: notes || null },
    });
    res.json({ success: true, data: att });
  })
);

// POST /classes/:id/attendance/bulk
router.post(
  "/classes/:id/attendance/bulk",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const cls = await prisma.obpcCourseClass.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!cls) return res.status(404).json({ success: false, error: "Aula não encontrada" });
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "items[] é obrigatório" });
    }
    const results = await Promise.all(
      items.map((it: any) =>
        prisma.obpcCourseClassAttendance.upsert({
          where: { classId_enrollmentId: { classId: cls.id, enrollmentId: it.enrollmentId } },
          create: {
            tenantId,
            classId: cls.id,
            enrollmentId: it.enrollmentId,
            status: it.status || "PRESENTE",
            notes: it.notes || null,
          },
          update: { status: it.status || "PRESENTE", notes: it.notes || null },
        })
      )
    );
    res.json({ success: true, data: results, count: results.length });
  })
);

// GET /enrollments/:id/stats
router.get(
  "/enrollments/:id/stats",
  authMiddleware,
  asyncHandler(async (req: any, res: Response) => {
    const tenantId = req.user.tenantId;
    const enrollment = await prisma.obpcCourseEnrollment.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
      include: {
        course: { include: { classes: { where: { deletedAt: null } } } },
        classes: true,
      },
    });
    if (!enrollment) return res.status(404).json({ success: false, error: "Matrícula não encontrada" });
    const totalClasses = enrollment.course.classes.length;
    const presentes = enrollment.classes.filter((a) => a.status === "PRESENTE").length;
    const justificadas = enrollment.classes.filter((a) => a.status === "JUSTIFICADO").length;
    const faltas = totalClasses - presentes - justificadas;
    const pct = totalClasses > 0 ? Math.round(((presentes + justificadas) / totalClasses) * 100) : 0;
    res.json({
      success: true,
      data: {
        totalClasses,
        presentes,
        justificadas,
        faltas,
        percentualPresenca: pct,
      },
    });
  })
);

export default router;
