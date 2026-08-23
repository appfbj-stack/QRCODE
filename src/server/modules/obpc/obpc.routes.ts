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
