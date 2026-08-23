/**
 * superAdmin.ts
 *
 * Middleware de autorização para rotas /api/super-admin/*.
 * Só usuários com role SUPER_ADMIN no JWT passam.
 *
 * IMPORTANTE: o papel SUPER_ADMIN é GLOBAL (não escopado por tenant).
 * No banco, esses usuários geralmente têm congregationId = null
 * e tenantId aponta para o "tenant raiz" (ou um tenant especial).
 *
 * O middleware:
 *  1. Verifica req.user.role === 'SUPER_ADMIN'
 *  2. Se não, retorna 403 Forbidden
 *
 * As rotas por baixo NUNCA usam tenantId do JWT — elas enxergam
 * TODOS os tenants (escopo global do Super Admin).
 */

import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";

export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      error: "Acesso restrito ao Super Admin da plataforma",
    });
  }
  next();
}
