// =====================================================================
// OBPC — Serviço central do módulo de presença (QR Code)
// =====================================================================
// - Mantém EventEmitter pra SSE (Server-Sent Events)
// - Helpers compartilhados entre as rotas
// - Em produção multi-instância, trocar EventEmitter por Redis pub/sub
// =====================================================================

import { EventEmitter } from "node:events";

class ObpcBus extends EventEmitter {
  constructor() {
    super();
    // Suporta até 500 conexões SSE simultâneas por instância
    this.setMaxListeners(500);
  }

  /** Emite um novo check-in pra todos os painéis inscritos no evento */
  emitCheckin(eventId: string, payload: unknown) {
    this.emit(`event:${eventId}:checkin`, payload);
  }
}

// Singleton — uma instância por processo Node
export const obpcBus = new ObpcBus();

/** Gera token curto e único (8 chars base32) pra QR do evento */
export function generateEventQrToken(): string {
  // 6 bytes = ~9 chars base64url, suficiente p/ unicidade prática
  const buf = Buffer.from(
    Array.from({ length: 8 }, () => Math.floor(Math.random() * 256))
  );
  // base32 lowercase sem padding, mais amigável em QR
  return buf.toString("base64url").replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

/** Formata data para DD/MM/YYYY */
export function fmtDateBR(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Formata hora para HH:MM */
export function fmtTimeBR(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
