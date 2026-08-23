/**
 * documents.routes.ts
 *
 * Endpoints para gestão de documentos da rede:
 *  - POST   /api/documents/upload    Faz upload (multipart) + cria registro
 *  - GET    /api/documents            Lista documentos do tenant (filtros: memberId, type, search)
 *  - GET    /api/documents/:id        Detalhes
 *  - PATCH  /api/documents/:id        Atualiza metadados (title, description, type)
 *  - DELETE /api/documents/:id        Soft delete (também apaga o arquivo do disco)
 *
 * Storage: arquivos em /app/uploads/<tenantId>/<arquivo>
 * Acesso: via /uploads/<tenantId>/<arquivo> (servido estaticamente pelo server.ts)
 * Tipos permitidos: PDF, JPEG, PNG, WEBP
 * Tamanho max: 20 MB
 */

import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { authMiddleware } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { prisma } from "../../config/database";
import { AuthRequest } from "../../types";
import { validateFileMagicBytes } from "../../middleware/magicBytes";

// Diretório de uploads
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Garante que o diretório existe
function ensureDir(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return cb(new Error("Sem tenant"), "");
    const dir = path.join(UPLOAD_ROOT, tenantId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // timestamp + random pra evitar colisão
    const ts = Date.now();
    const rnd = Math.random().toString(36).slice(2, 8);
    const safeName = file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    cb(null, `${ts}-${rnd}-${safeName}`);
  },
});

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error(`Tipo não permitido: ${file.mimetype}. Aceitos: PDF, JPEG, PNG, WEBP`));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(authMiddleware);

/** Sanitiza o doc antes de devolver pro front. */
function sanitize(d: any) {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    type: d.type,
    url: d.url,
    fileName: d.fileName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    active: d.active,
    memberId: d.memberId,
    memberName: d.member?.name ?? null,
    uploadedById: d.uploadedById,
    uploadedByName: d.uploadedBy?.name ?? null,
    createdAt: d.createdAt,
  };
}

// ─────────────────────────────────────────────────────────
// POST /api/documents/upload
// Multipart: file=<arquivo> + title, type, memberId?, description?
// ─────────────────────────────────────────────────────────
router.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, error: "Arquivo obrigatório (campo 'file')" });
    }

    // ==========================================
    // Validação de magic bytes (anti-disguise)
    // Impede atacante de mandar .exe com Content-Type falso
    // ==========================================
    const kind = await validateFileMagicBytes(file.path, file.mimetype);
    if (!kind) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      return res.status(400).json({
        success: false,
        error: `Conteúdo do arquivo não corresponde ao tipo declarado (${file.mimetype}). Upload rejeitado por segurança.`,
      });
    }

    const { title, type, memberId, description } = req.body || {};
    if (!title || !type) {
      // apaga o arquivo que acabou de subir
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      return res.status(400).json({ success: false, error: "title e type são obrigatórios" });
    }

    // valida memberId (se fornecido) pertence ao mesmo tenant
    if (memberId) {
      const member = await prisma.member.findFirst({
        where: { id: memberId, tenantId: req.user!.tenantId },
      });
      if (!member) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        return res.status(400).json({ success: false, error: "Membro inválido" });
      }
    }

    // URL pública do arquivo
    const url = `/uploads/${req.user!.tenantId}/${path.basename(file.path)}`;

    const created = await prisma.document.create({
      data: {
        tenantId: req.user!.tenantId,
        memberId: memberId || null,
        uploadedById: req.user!.userId,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        type: type as any,
        url,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      include: {
        member: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
    });

    res.status(201).json({ success: true, data: sanitize(created) });
  })
);

// ─────────────────────────────────────────────────────────
// GET /api/documents
// Query: memberId, type, search
// ─────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { memberId, type, search } = req.query as Record<string, string | undefined>;
    const where: any = { tenantId: req.user!.tenantId, deletedAt: null };
    if (memberId) where.memberId = memberId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
      ];
    }
    const docs = await prisma.document.findMany({
      where,
      include: {
        member: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: docs.map(sanitize), total: docs.length });
  })
);

// ─────────────────────────────────────────────────────────
// GET /api/documents/:id
// ─────────────────────────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null },
      include: {
        member: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
    });
    if (!doc) return res.status(404).json({ success: false, error: "Documento não encontrado" });
    res.json({ success: true, data: sanitize(doc) });
  })
);

// ─────────────────────────────────────────────────────────
// PATCH /api/documents/:id
// Atualiza metadados (não troca o arquivo)
// ─────────────────────────────────────────────────────────
router.patch(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { title, description, type, memberId, active } = req.body || {};
    const data: any = {};
    if (title !== undefined) data.title = String(title).trim();
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (type !== undefined) data.type = type;
    if (memberId !== undefined) data.memberId = memberId || null;
    if (active !== undefined) data.active = !!active;

    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data,
      include: {
        member: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
    });
    res.json({ success: true, data: sanitize(doc) });
  })
);

// ─────────────────────────────────────────────────────────
// DELETE /api/documents/:id
// Soft delete + remove arquivo do disco
// ─────────────────────────────────────────────────────────
router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null },
    });
    if (!doc) return res.status(404).json({ success: false, error: "Documento não encontrado" });

    // marca como deletado
    await prisma.document.update({
      where: { id: doc.id },
      data: { deletedAt: new Date(), active: false },
    });

    // remove o arquivo do disco (best effort)
    try {
      const filePath = path.join(UPLOAD_ROOT, req.user!.tenantId, path.basename(doc.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore — DB já tá soft-deletado
    }

    res.json({ success: true, message: "Documento removido" });
  })
);

export { router as documentRoutes };
