import { Request } from "express";

// ============================================================
// AUTH
// ============================================================
export interface AuthPayload {
  userId: string;
  tenantId: string;
  congregationId: string | null;  // null = admin/super_admin (ve tudo)
  role: "SUPER_ADMIN" | "ADMIN" | "GERENTE" | "OPERADOR" | "USUARIO";
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
  tenantId?: string;
}

// ============================================================
// PAGINATION
// ============================================================
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  orderDir?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// API RESPONSE
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}