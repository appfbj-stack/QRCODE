/**
 * secureUploads.ts
 *
 * Middleware que serve /uploads/<tenantId>/<arquivo> SOMENTE para:
 *  - SUPER_ADMIN (acesso total)
 *  - Usuarios com tenantId igual ao do path
 *
 * Resolve o IDOR (qualquer pessoa com ID do tenant baixava todos os arquivos).
 * Substitui o express.static aberto em /uploads.
 */

import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../types";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Regex pra extrair o tenantId do path
const TENANT_PATH_RE = /^\/([0-9a-f-]{36})\/(.+)$/i;

export function secureStaticUploads(req: Request, res: Response, next: NextFunction) {
  // Pega o path removendo o prefixo /uploads
  const relPath = req.path.replace(/^\/+/, "");
  const match = relPath.match(TENANT_PATH_RE);

  // Se não tem tenantId no path, nega
  if (!match) {
    return res.status(404).json({ success: false, error: "Not found" });
  }

  const [, tenantId, fileName] = match;

  // Validação anti path-traversal
  if (fileName.includes("..") || fileName.includes("\\") || fileName.startsWith("/")) {
    return res.status(400).json({ success: false, error: "Path inválido" });
  }

  // authMiddleware já populou req.user e req.tenantId
  const user = (req as AuthRequest).user;
  if (!user) {
    return res.status(401).json({ success: false, error: "Autenticação necessária" });
  }

  // SUPER_ADMIN acessa qualquer arquivo
  if (user.role === "SUPER_ADMIN") {
    return serveFile(tenantId, fileName, req, res, next);
  }

  // Outros roles: tenantId do path deve bater com o do user
  if (user.tenantId !== tenantId) {
    return res.status(403).json({
      success: false,
      error: "Acesso negado a arquivos de outro tenant",
    });
  }

  return serveFile(tenantId, fileName, req, res, next);
}

function serveFile(tenantId: string, fileName: string, req: Request, res: Response, _next: NextFunction) {
  const filePath = path.join(UPLOAD_ROOT, tenantId, fileName);

  // Verifica que tá dentro de UPLOAD_ROOT (anti path traversal final)
  const resolved = path.resolve(filePath);
  const rootResolved = path.resolve(UPLOAD_ROOT);
  if (!resolved.startsWith(rootResolved)) {
    return res.status(400).json({ success: false, error: "Path inválido" });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ success: false, error: "Arquivo não encontrado" });
  }

  res.setHeader("Content-Disposition", "inline");
  res.sendFile(resolved, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: "Erro ao enviar arquivo" });
      }
    }
  });
}
