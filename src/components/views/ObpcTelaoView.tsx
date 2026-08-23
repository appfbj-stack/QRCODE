// =====================================================================
// OBPC — Painel Telão (público, projetado em TV/computador)
// =====================================================================
// Rota: /telao/:token
// Mostra: QR grande, contador de presentes, indicadores por função/igreja,
// lista de últimas presenças, atualização em tempo real via SSE.
// =====================================================================

import React, { useEffect, useRef, useState } from "react";
import { QrCode, Users, CheckCircle2, Church, Clock } from "lucide-react";

interface EventInfo {
  id: string;
  name: string;
  date: string;
  time?: string | null;
  location?: string | null;
  hostChurch?: string | null;
  tenantName: string;
  tenantLogo?: string | null;
  status: "ABERTO" | "ENCERRADO" | "CANCELADO";
  message?: string | null;
}

interface Attendance {
  id: string;
  memberName: string;
  memberRole?: string | null;
  churchName?: string | null;
  createdAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  PASTOR: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  PRESBITERO: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  EVANGELISTA: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  MISSIONARIA: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  DIACONO: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  DIACONISA: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  MEMBRO: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

function fmtTime(s: string): string {
  try {
    return new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

export const ObpcTelaoView: React.FC<{ token: string }> = ({ token }) => {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [byRole, setByRole] = useState<Record<string, number>>({});
  const [byChurch, setByChurch] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  const checkinUrl = `${window.location.origin}/checkin/${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(checkinUrl)}`;

  // Carrega evento + snapshot inicial
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/obpc/public/event/${token}`);
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "QR inválido");
          return;
        }
        setEvent(data.data);

        // Snapshot inicial de stats
        const statsRes = await fetch(`/api/obpc/public/event/${token}/stats`).catch(() => null);
        if (statsRes && statsRes.ok) {
          const stats = await statsRes.json();
          if (stats.success) {
            setAttendances(stats.data.recent || []);
            setByRole(stats.data.byRole || {});
            setByChurch(stats.data.byChurch || {});
          }
        }
      } catch (e: any) {
        setError(e.message || "Erro");
      }
    })();
  }, [token]);

  // SSE
  useEffect(() => {
    if (!event || event.status !== "ABERTO") return;
    const es = new EventSource(`/api/obpc/public/event/${token}/stream`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "checkin") {
          setPulse(true);
          setTimeout(() => setPulse(false), 1200);
          setAttendances((prev) => [...prev, payload.attendance]);
          const a = payload.attendance;
          const role = a.memberRole || "MEMBRO";
          setByRole((prev) => ({ ...prev, [role]: (prev[role] || 0) + 1 }));
          const ch = a.churchName || "—";
          setByChurch((prev) => ({ ...prev, [ch]: (prev[ch] || 0) + 1 }));
        } else if (payload.type === "event-closed") {
          setEvent((prev) => prev ? { ...prev, status: "ENCERRADO", message: "Evento encerrado" } : prev);
        } else if (payload.type === "qr-rotated") {
          // Recarrega QR — nesse caso a URL mudou mas o token é o mesmo pro client;
          // para simplificar, mantemos o mesmo (rotação no backend invalida o anterior)
        }
      } catch {}
    };
    es.onerror = () => {};
    return () => { es.close(); };
  }, [event?.id, event?.status, token]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">😕</p>
          <h1 className="text-3xl font-bold mb-2">QR inválido</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total = Object.values(byRole).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {event.tenantLogo ? (
            <img src={event.tenantLogo} alt="logo" className="w-14 h-14 rounded-xl bg-white/10 p-1" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center text-2xl font-bold">
              {event.tenantName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-wide uppercase">{event.tenantName}</h1>
            <p className="text-sm text-slate-300">{event.hostChurch || "Painel de Presença"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold uppercase tracking-wider ${
            event.status === "ABERTO" ? "text-emerald-400" : event.status === "ENCERRADO" ? "text-slate-400" : "text-rose-400"
          }`}>
            ● {event.status}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            <Clock className="w-3 h-3 inline mr-1" />
            {new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8">
        {/* QR Code à esquerda */}
        <div className="lg:col-span-1 flex flex-col items-center">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm">
            <img src={qrUrl} alt="QR" className="w-full" />
          </div>
          <p className="text-center text-emerald-400 font-extrabold text-xl mt-4 uppercase tracking-wider">
            📱 Aponte a câmera
          </p>
          <p className="text-center text-slate-400 text-sm mt-1">
            Escaneie e confirme sua presença
          </p>
          <div className="mt-4 bg-slate-800/50 rounded-2xl p-4 text-center w-full">
            <p className="text-3xl font-extrabold text-white leading-tight">{event.name}</p>
            <p className="text-slate-300 text-sm mt-1">
              {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              {event.time && ` · ${event.time}`}
            </p>
            {event.location && (
              <p className="text-slate-400 text-xs mt-1">📍 {event.location}</p>
            )}
          </div>
        </div>

        {/* Stats + lista à direita */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contadores principais */}
          <div className={`bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-8 shadow-2xl transition-all ${
            pulse ? "ring-4 ring-amber-400 scale-[1.02]" : ""
          }`}>
            <p className="text-emerald-200 text-sm font-bold uppercase tracking-widest">Total presentes</p>
            <p className="text-8xl font-black text-white mt-2 tabular-nums">{total}</p>
            {pulse && (
              <p className="text-amber-200 text-sm font-semibold mt-2 animate-pulse">
                ✨ Nova presença registrada!
              </p>
            )}
          </div>

          {/* Contadores por função */}
          {Object.keys(byRole).length > 0 && (
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/10">
              <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-3">Por função</p>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(byRole).map(([role, count]) => (
                  <div key={role} className={`rounded-xl p-3 text-center border ${ROLE_COLOR[role] || "bg-slate-700/30 text-slate-300 border-slate-600/40"}`}>
                    <p className="text-2xl font-extrabold">{count}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide">{role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de últimas presenças */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-white/10">
            <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Últimas presenças
            </p>
            {attendances.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aguardando primeira presença...</p>
            ) : (
              <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {[...attendances].reverse().slice(0, 30).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-4 py-3 animate-fadeIn">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                      {a.memberName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{a.memberName}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {a.memberRole || "MEMBRO"} {a.churchName && `· ${a.churchName}`}
                      </p>
                    </div>
                    <span className="text-emerald-400 font-mono text-sm whitespace-nowrap">{fmtTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObpcTelaoView;
