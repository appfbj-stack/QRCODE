import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest, AuthPayload } from "../types";

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  let token: string | undefined;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  } else if (typeof req.query.token === "string") {
    token = req.query.token; // SSE fallback (EventSource não suporta headers)
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Token inválido ou expirado" });
  }
}

/** Middleware para rotas públicas (extrai tenantId opcional) */
export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], env.JWT_SECRET) as AuthPayload;
      req.tenantId = req.user.tenantId;
    } catch {
      // continua sem autenticação
    }
  }
  next();
}