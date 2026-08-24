// =====================================================================
// OBPC — Painel Telão (TV/Projetor) — Versão Impacto Visual
// =====================================================================
// Otimizado para projetar em TV/projetor com tela grande:
// - Numeração GIGANTE
// - Barra de progresso animada
// - Cards grandes por função eclesiástica com % e barra individual
// - Animações ao receber check-in novo
// - Header com cargo eclesiástico
// =====================================================================

import React, { useEffect, useRef, useState } from "react";
import { QrCode, Users, Church, MapPin, Calendar, Clock, Sparkles, TrendingUp } from "lucide-react";

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

const ROLE_COLOR: Record<string, { bg: string; text: string; bar: string; label: string }> = {
  PASTOR:     { bg: "bg-amber-500",     text: "text-amber-300",     bar: "bg-amber-400",     label: "Pastores" },
  PRESBITERO: { bg: "bg-purple-500",    text: "text-purple-300",    bar: "bg-purple-400",    label: "Presbíteros" },
  EVANGELISTA:{ bg: "bg-blue-500",      text: "text-blue-300",      bar: "bg-blue-400",      label: "Evangelistas" },
  MISSIONARIA:{ bg: "bg-pink-500",      text: "text-pink-300",      bar: "bg-pink-400",      label: "Missionárias" },
  DIACONO:    { bg: "bg-emerald-500",   text: "text-emerald-300",   bar: "bg-emerald-400",   label: "Diáconos" },
  DIACONISA:  { bg: "bg-rose-500",      text: "text-rose-300",      bar: "bg-rose-400",      label: "Diaconisas" },
  MEMBRO:     { bg: "bg-slate-500",     text: "text-slate-300",     bar: "bg-slate-400",     label: "Membros" },
};

const ROLE_ORDER = ["PASTOR", "PRESBITERO", "EVANGELISTA", "MISSIONARIA", "DIACONO", "DIACONISA", "MEMBRO"];

function fmtTime(s: string): string {
  try { return new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}
function fmtDateLong(s: string): string {
  try { return new Date(s).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); }
  catch { return s; }
}

export const ObpcTelaoView: React.FC<{ token: string }> = ({ token }) => {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [byRole, setByRole] = useState<Record<string, number>>({});
  const [byChurch, setByChurch] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [lastName, setLastName] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const checkinUrl = `${window.location.origin}/checkin/${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data=${encodeURIComponent(checkinUrl)}`;

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

  useEffect(() => {
    if (!event || event.status !== "ABERTO") return;
    const es = new EventSource(`/api/obpc/public/event/${token}/stream`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "checkin") {
          setPulse(true);
          setLastName(payload.attendance.memberName);
          setTimeout(() => setPulse(false), 1500);
          setAttendances((prev) => [...prev, payload.attendance]);
          const a = payload.attendance;
          const role = a.memberRole || "MEMBRO";
          setByRole((prev) => ({ ...prev, [role]: (prev[role] || 0) + 1 }));
          const ch = a.churchName || "—";
          setByChurch((prev) => ({ ...prev, [ch]: (prev[ch] || 0) + 1 }));
        } else if (payload.type === "event-closed") {
          setEvent((prev) => prev ? { ...prev, status: "ENCERRADO", message: "Evento encerrado" } : prev);
        }
      } catch {}
    };
    es.onerror = () => {};
    return () => { es.close(); };
  }, [event?.id, event?.status, token]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center max-w-2xl">
          <p className="text-9xl mb-4">😕</p>
          <h1 className="text-5xl font-black mb-3">QR Inválido</h1>
          <p className="text-2xl text-slate-400">{error}</p>
        </div>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-20 h-20 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const total = Object.values(byRole).reduce((a, b) => a + b, 0);
  // Meta: capacidade opcional (não tenho, então uso heurística)
  const meta = Math.max(total, 50);
  const pct = Math.min(100, Math.round((total / meta) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden">
      {/* Header com cargo eclesiástico */}
      <header className="bg-black/40 backdrop-blur-md border-b-2 border-emerald-500/30 px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {event.tenantLogo ? (
            <img src={event.tenantLogo} alt="logo" className="w-16 h-16 rounded-xl bg-white/10 p-1" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-emerald-600 flex items-center justify-center text-3xl font-black shadow-lg">
              {event.tenantName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Cargo Eclesiástico</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-wide uppercase leading-none mt-1">
              {event.name}
            </h1>
            <p className="text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDateLong(event.date)}</span>
              {event.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {event.time}</span>}
              {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-base font-black uppercase tracking-widest ${
            event.status === "ABERTO" ? "text-emerald-400" : event.status === "ENCERRADO" ? "text-slate-400" : "text-rose-400"
          }`}>
            ● {event.status}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {new Date().toLocaleTimeString("pt-BR")}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 p-4 md:p-6">
        {/* QR Code + número gigante (coluna esquerda) */}
        <div className="xl:col-span-4 space-y-4">
          {/* Total GIGANTE */}
          <div className={`relative bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 shadow-2xl border-2 border-emerald-400/50 transition-all duration-300 ${
            pulse ? "ring-8 ring-amber-400 scale-[1.03]" : ""
          }`}>
            {pulse && (
              <div className="absolute -top-2 -right-2 bg-amber-400 text-emerald-900 px-3 py-1 rounded-full text-xs font-black animate-bounce shadow-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> NOVO
              </div>
            )}
            <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest">Total de Presentes</p>
            <p className="text-[8rem] md:text-[10rem] leading-none font-black text-white tabular-nums tracking-tighter mt-1">
              {total}
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-100 mb-1">
                <span>PROGRESSO</span>
                <span>{pct}%</span>
              </div>
              <div className="h-3 bg-emerald-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {pulse && lastName && (
              <p className="text-amber-200 text-base font-bold mt-3 text-center animate-fadeIn">
                ✨ {lastName} acabou de chegar!
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-3xl p-4 shadow-2xl">
            <img src={qrUrl} alt="QR" className="w-full" />
          </div>
          <div className="bg-slate-800/70 backdrop-blur rounded-2xl p-4 border border-emerald-500/30 text-center">
            <p className="text-emerald-400 font-black text-lg uppercase tracking-widest flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5" /> Aponte a câmera
            </p>
            <p className="text-slate-300 text-sm mt-1">Escaneie e confirme sua presença</p>
          </div>
        </div>

        {/* Contadores por função + lista (coluna direita) */}
        <div className="xl:col-span-8 space-y-4">
          {/* Função eclesiástica — cards com % */}
          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-200 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Por Função Eclesiástica
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {Object.keys(byRole).length} funções · {total} obreiros
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {ROLE_ORDER.map((role) => {
                const count = byRole[role] || 0;
                const rolePct = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = ROLE_COLOR[role];
                return (
                  <div
                    key={role}
                    className={`relative rounded-2xl p-3 border ${color.text.replace("text-", "border-").replace("-300", "-500/40")} bg-slate-900/50 overflow-hidden`}
                  >
                    <div
                      className={`absolute bottom-0 left-0 right-0 ${color.bar} opacity-30 transition-all duration-700`}
                      style={{ height: `${Math.max(8, rolePct)}%` }}
                    />
                    <div className="relative">
                      <p className={`text-xs font-bold uppercase tracking-wider ${color.text}`}>
                        {color.label}
                      </p>
                      <p className="text-4xl font-black text-white tabular-nums mt-1">{count}</p>
                      <p className={`text-xs font-bold ${color.text} mt-0.5`}>{rolePct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por igreja */}
          {Object.keys(byChurch).length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-white/10">
              <p className="text-slate-200 text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Church className="w-4 h-4 text-amber-400" /> Por Igreja
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(byChurch)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([church, count]) => {
                    const churchPct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={church} className="bg-slate-900/50 rounded-xl p-3 border border-amber-500/20">
                        <p className="text-xs text-slate-300 truncate font-semibold">{church}</p>
                        <div className="flex items-end justify-between mt-1">
                          <p className="text-3xl font-black text-white tabular-nums">{count}</p>
                          <p className="text-amber-400 text-xs font-bold">{churchPct}%</p>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${churchPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Lista de últimas presenças */}
          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-white/10">
            <p className="text-slate-200 text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Últimas Presenças · Tempo Real
            </p>
            {attendances.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-lg">Aguardando primeira presença...</p>
            ) : (
              <ul className="space-y-2 max-h-[35vh] overflow-y-auto pr-2">
                {[...attendances].reverse().slice(0, 25).map((a, i) => {
                  const roleColor = ROLE_COLOR[a.memberRole || "MEMBRO"] || ROLE_COLOR.MEMBRO;
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 bg-slate-900/50 rounded-xl px-4 py-3 border ${
                        i === 0 ? "border-amber-400/50 animate-pulse" : "border-transparent"
                      }`}
                    >
                      <div className={`w-12 h-12 ${roleColor.bg} rounded-full flex items-center justify-center text-white font-black text-lg shadow-md`}>
                        {a.memberName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate text-lg">{a.memberName}</p>
                        <p className="text-sm text-slate-400 truncate">
                          <span className={`${roleColor.text} font-semibold`}>{a.memberRole || "MEMBRO"}</span>
                          {a.churchName && <> · {a.churchName}</>}
                        </p>
                      </div>
                      <span className="text-emerald-400 font-mono text-base font-bold whitespace-nowrap">
                        {fmtTime(a.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObpcTelaoView;
