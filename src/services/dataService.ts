// dataService — wrapper genérico para os recursos do backend.
// Mapeia 1:1 para as rotas /api/<recurso> registradas no server.ts.

import { api } from "./api";

export interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
}

export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const dataService = {
  /** Lista itens com paginação + busca. Retorna { data, total, ... } */
  async list<T = any>(resource: string, params: ListParams = {}): Promise<ListResult<T>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.orderBy) qs.set("orderBy", params.orderBy);
    if (params.orderDir) qs.set("orderDir", params.orderDir);
    const path = `/${resource}${qs.toString() ? `?${qs.toString()}` : ""}`;
    // O endpoint retorna { success, data, total, page, limit, totalPages } direto,
    // mas o helper api() desembrulha { success, data } → data. Precisamos do envelope.
    return this.request<ListResult<T>>(path);
  },

  async get<T = any>(resource: string, id: string): Promise<T> {
    return api<T>(`/${resource}/${id}`);
  },

  async create<T = any>(resource: string, payload: Record<string, any>): Promise<T> {
    return api<T>(`/${resource}`, { method: "POST", body: JSON.stringify(payload) });
  },

  async update(resource: string, id: string, payload: Record<string, any>): Promise<void> {
    await api(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },

  async remove(resource: string, id: string): Promise<void> {
    await api(`/${resource}/${id}`, { method: "DELETE" });
  },

  /**
   * Faz a request preservando o envelope completo (data, total, page, ...)
   * — usado para listas que retornam paginação junto.
   */
  async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("kairos_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, { ...options, headers });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json as T;
  },
};
