import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";

/**
 * Acesso por papel (role) e congregação.
 *
 * - SUPER_ADMIN e ADMIN: veem TUDO do tenant (todas as 14 congregações)
 * - GERENTE, OPERADOR, USUARIO: veem SOMENTE dados da própria congregação
 *   (user.congregationId) — exceto itens globais sem congregationId
 *
 * O filtro é aplicado em 2 lugares:
 *   1. GET (list)    — query.where recebe congregationId automaticamente
 *   2. POST (create)  — body.congregationId é forçado (ou validado)
 *   3. PUT  / DELETE  — se a rota filtra por congregationId, o item só
 *                        pode ser editado/excluído se pertence à congregação do user
 *
 * O filtro de LEITURA é feito por `tenantFilter()` que retorna o where combinado
 * com o filtro de congregação quando aplicável.
 */

export function isGlobalRole(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/**
 * Retorna o filtro Prisma a ser aplicado em queries de listagem.
 *
 * - ADMIN/SUPER_ADMIN: só `tenantId`
 * - Outros: `tenantId` + `congregationId == user.congregationId` OU `congregationId IS NULL`
 *   (itens globais são visíveis pra todos, ex: mural de avisos da sede)
 */
export function getScopeFilter(req: AuthRequest): {
  tenantId: string;
  congregationId?: string | null;
} {
  if (!req.user) throw new Error("Sem usuário autenticado");
  if (isGlobalRole(req.user.role)) {
    return { tenantId: req.user.tenantId };
  }
  // Não-admin: filtra por congregação. Itens sem congregationId são visíveis
  // (ex: avisos gerais do app)
  return {
    tenantId: req.user.tenantId,
    congregationId: req.user.congregationId,
  };
}

/**
 * Para modelos que SEMPRE têm congregationId (Member, Celula, Event, etc),
 * use `requireScope()` que filtra o where obrigatório.
 * Se o user não tem congregationId e não é admin, retorna erro 403.
 */
export function requireScope(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Não autenticado" });
  }
  if (isGlobalRole(req.user.role)) return next();

  if (!req.user.congregationId) {
    return res.status(403).json({
      success: false,
      error: "Usuário sem congregação atribuída. Contate o admin da sede.",
    });
  }
  next();
}

/**
 * Garante que um body de POST/PUT tem o congregationId correto:
 * - Admin pode setar qualquer congregação
 * - Outros SÓ podem setar a própria congregação
 */
export function enforceCongregation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Não autenticado" });
  }

  if (isGlobalRole(req.user.role)) {
    // Admin pode criar em qualquer congregação (se enviou)
    if (req.body && req.body.congregationId && typeof req.body.congregationId === "string" && req.body.congregationId.trim() === "") {
      delete req.body.congregationId;
    }
    return next();
  }

  // Outros: força congregationId = o do user (mesmo se mandou outro)
  if (req.body) {
    req.body.congregationId = req.user.congregationId;
  }
  next();
}
