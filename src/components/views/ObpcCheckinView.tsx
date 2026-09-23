// =====================================================================
// OBPC — Check-in (público, mobile)
// =====================================================================
// Rota: /checkin/:token
// Pessoa escaneia o QR, vê o evento, seleciona o nome dela (ou faz
// cadastro rápido) e confirma presença.
// =====================================================================

import React, { useEffect, useState } from "react";
import {
  CheckCircle2, X, AlertCircle, Loader2, User, Search, Phone, Church, MapPin, Calendar, Clock, Shield, Plus, ChevronDown, BarChart3,
} from "lucide-react";

interface EventInfo {
  id: string;
  name: string;
  date: string;
  time?: string | null;
  location?: string | null;
  hostChurch?: string | null;
  fixedChurch?: { id: string; name: string } | null;
  membersOnly?: boolean;
  tenantName: string;
  tenantLogo?: string | null;
  status: "ABERTO" | "ENCERRADO" | "CANCELADO";
  message?: string | null;
}

interface MemberHit {
  id: string;
  name: string;
  role: string;
  congregationName: string | null;
}

interface Congregation {
  id: string;
  name: string;
  address: string | null;
}

type Step = "loading" | "ready" | "searching" | "selected" | "registering" | "simple" | "roster" | "confirmed" | "already" | "result" | "denied";

const ROLES = [
  "PASTOR", "PRESBITERO", "EVANGELISTA", "MISSIONARIA", "DIACONO", "DIACONISA", "MEMBRO",
];

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }); } catch { return s; }
}

export const ObpcCheckinView: React.FC<{ token: string }> = ({ token }) => {
  const [step, setStep] = useState<Step>("loading");
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [selected, setSelected] = useState<MemberHit | null>(null);
  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerRole, setRegisterRole] = useState("MEMBRO");
  const [registerChurch, setRegisterChurch] = useState("");
  const [churchMode, setChurchMode] = useState<"select" | "new">("select");
  const [newChurchName, setNewChurchName] = useState("");
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loadingCongregations, setLoadingCongregations] = useState(false);
  const [acceptLgpd, setAcceptLgpd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  // Modo roster (chamada fechada por igreja)
  const [roster, setRoster] = useState<{
    church: { id: string; name: string };
    total: number;
    present: number;
    members: { id: string; name: string; role: string; alreadyCheckedIn: boolean }[];
  } | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");

  // Resultado final (resumo do evento com totais)
  const [finalStats, setFinalStats] = useState<{
    total: number;
    byRole: Record<string, number>;
    byChurch: Record<string, number>;
    recent: any[];
  } | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Carrega evento (v1.3.7 hotfix)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/obpc/public/event/${token}`);
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "QR inválido");
          setStep("denied");
          return;
        }
        setEvent(data.data);
        if (data.data.status !== "ABERTO") {
          setStep("denied");
        } else {
          setStep("ready");
        }
      } catch (e: any) {
        setError(e.message || "Erro");
        setStep("denied");
      }
    })();
  }, [token]);

  // Debounce busca
  useEffect(() => {
    if (step !== "searching") return;
    if (search.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/obpc/public/members/lookup?q=${encodeURIComponent(search)}&token=${token}`);
        const data = await res.json();
        if (data.success) setHits(data.data);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search, step, token]);

  // Carrega congregações quando entra em "registering"
  useEffect(() => {
    if (step !== "registering") return;
    if (congregations.length > 0) return; // já carregou
    setLoadingCongregations(true);
    (async () => {
      try {
        const res = await fetch(`/api/obpc/public/congregations?token=${token}`);
        const data = await res.json();
        if (data.success) setCongregations(data.data);
      } catch {} finally {
        setLoadingCongregations(false);
      }
    })();
  }, [step, token, congregations.length]);

  // Carrega roster (chamada fechada por igreja) quando entra em "roster"
  const loadRoster = async () => {
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/obpc/public/event/${token}/church-members`);
      const data = await res.json();
      if (data.success) setRoster(data.data);
      else setError(data.error || "Erro ao carregar chamada");
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setRosterLoading(false);
    }
  };
  useEffect(() => {
    if (step === "roster" && !roster) loadRoster();
    if (step === "result" && !finalStats) loadFinalStats();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFinalStats = async () => {
    setLoadingResult(true);
    try {
      const res = await fetch(`/api/obpc/public/event/${token}/stats`);
      const data = await res.json();
      if (data.success) setFinalStats(data.data);
    } catch {} finally {
      setLoadingResult(false);
    }
  };

  const confirm = async (memberId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/obpc/public/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, memberId }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 409) {
          setAlreadyCheckedIn(true);
          setStep("already");
        } else {
          setError(data.error || "Erro");
          setStep("denied");
        }
        return;
      }
      setConfirmedAt(data.data.createdAt);
      // Se veio do roster, atualiza lista local e fica na tela
      if (step === "roster" && roster) {
        setRoster({
          ...roster,
          present: data.alreadyCheckedIn ? roster.present : roster.present + 1,
          members: roster.members.map((m) =>
            m.id === memberId ? { ...m, alreadyCheckedIn: true } : m
          ),
        });
        setSubmitting(false);
        return;
      }
      setStep("confirmed");
    } catch (e: any) {
      setError(e.message || "Erro");
      setStep("denied");
    } finally {
      setSubmitting(false);
    }
  };

  const quickRegisterSimple = async () => {
    if (!registerName || !acceptLgpd) {
      setError("Preencha seu nome e aceite a política de privacidade");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Modo simples: sem role, sem igreja. Admin completa depois se precisar.
      const res = await fetch("/api/obpc/public/quick-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: registerName,
          phone: registerPhone || "",
          role: "MEMBRO",
          churchName: "",
          acceptLgpd: true,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Erro");
        return;
      }
      setConfirmedAt(data.data.attendance.createdAt);
      if (data.alreadyCheckedIn) {
        setAlreadyCheckedIn(true);
        setStep("already");
      } else {
        setStep("confirmed");
      }
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  const quickRegister = async () => {
    if (!registerName || !acceptLgpd) {
      setError("Preencha seu nome e aceite a política de privacidade");
      return;
    }
    const finalChurch =
      churchMode === "new" ? newChurchName.trim() : registerChurch;
    if (churchMode === "new" && !finalChurch) {
      setError("Digite o nome da nova congregação");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/obpc/public/quick-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: registerName,
          phone: registerPhone,
          role: registerRole,
          churchName: finalChurch,
          acceptLgpd: true,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Erro");
        return;
      }
      // Se cadastrou uma nova congregação, adiciona à lista local
      if (churchMode === "new" && finalChurch && data.data?.congregationId) {
        setCongregations((prev) => [
          ...prev,
          { id: data.data.congregationId, name: finalChurch, address: null },
        ]);
      }
      setConfirmedAt(data.data.attendance.createdAt);
      if (data.alreadyCheckedIn) {
        setAlreadyCheckedIn(true);
        setStep("already");
      } else {
        setStep("confirmed");
      }
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Telas ────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (step === "denied") {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Não foi possível</h1>
          <p className="text-slate-600">{error || event?.message || "QR inválido ou evento fechado"}</p>
          {event && (
            <p className="text-sm text-slate-500 mt-3">{event.name}</p>
          )}
        </div>
      </div>
    );
  }

  if (step === "confirmed" || step === "already") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-emerald-700 mb-2">
            {step === "already" ? "Você já registrou!" : "Presença confirmada!"}
          </h1>
          {event && <p className="text-slate-600 mb-1">{event.name}</p>}
          {selected && <p className="text-xl font-bold text-slate-800 mt-3">{selected.name}</p>}
          {!selected && registerName && <p className="text-xl font-bold text-slate-800 mt-3">{registerName}</p>}
          {confirmedAt && (
            <p className="text-sm text-slate-500 mt-2">
              <Clock className="w-4 h-4 inline mr-1" />
              {new Date(confirmedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {step === "already" && (
            <p className="text-xs text-amber-600 mt-3">Você já estava na lista deste evento.</p>
          )}
          <button
            onClick={() => setStep("result")}
            className="mt-6 w-full bg-white hover:bg-emerald-50 text-emerald-700 font-bold py-3 px-4 rounded-2xl border-2 border-emerald-200 transition flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5" /> Ver resultado final
          </button>
          <p className="text-xs text-slate-400 mt-3">Você pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  // Tela de resultado final (totais do evento)
  if (step === "result") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
            <BarChart3 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Resultado Final</h1>
            {event && <p className="text-sm text-slate-600">{event.name}</p>}
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl shadow-xl p-6 text-center text-white">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total de Presentes</p>
            <p className="text-6xl font-extrabold mt-1">{finalStats?.total ?? "..."}</p>
            {finalStats?.byChurch && (
              <p className="text-sm opacity-80 mt-1">{Object.keys(finalStats.byChurch).length} igrejas</p>
            )}
          </div>

          {loadingResult ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            </div>
          ) : finalStats ? (
            <>
              {Object.keys(finalStats.byRole).length > 0 && (
                <div className="bg-white rounded-2xl shadow-md p-4">
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">Por Função</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(finalStats.byRole).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
                      <div key={role} className="bg-emerald-50 rounded-xl p-2 text-center">
                        <p className="text-lg font-extrabold text-emerald-700">{count}</p>
                        <p className="text-[10px] text-slate-600 uppercase font-bold">{role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(finalStats.byChurch).length > 0 && (
                <div className="bg-white rounded-2xl shadow-md p-4">
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">Por Igreja</p>
                  <div className="space-y-1">
                    {Object.entries(finalStats.byChurch).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([churchName, count]) => (
                      <div key={churchName} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 truncate flex-1">{churchName}</span>
                        <span className="font-bold text-emerald-700 ml-2">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finalStats.recent && finalStats.recent.length > 0 && (
                <div className="bg-white rounded-2xl shadow-md p-4">
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">Últimos a chegarem</p>
                  <ul className="space-y-1">
                    {finalStats.recent.slice(-5).reverse().map((a: any) => (
                      <li key={a.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 truncate flex-1">
                          {a.memberName}
                          {a.churchName && <span className="text-xs text-slate-500"> · {a.churchName}</span>}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">
                          {new Date(a.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-slate-500 text-sm">Nenhuma presença ainda.</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep("ready")}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-2xl border-2 border-slate-200 transition"
            >
              Registrar outro
            </button>
            <a
              href={`/telao/${token}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl text-center transition"
            >
              Ver Telão
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header com dados do evento */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-5 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {event.tenantLogo ? (
            <img src={event.tenantLogo} alt="logo" className="w-12 h-12 rounded-xl" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">
              {event.tenantName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Registro de Presença</p>
            <p className="font-bold text-slate-800 truncate">{event.tenantName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-5 space-y-5">
        {/* Card do evento */}
        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-800 leading-tight">{event.name}</h2>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              {fmtDate(event.date)}
              {event.time && <><Clock className="w-4 h-4 text-slate-400 ml-2" />{event.time}</>}
            </p>
            {event.location && (
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> {event.location}
              </p>
            )}
            {event.hostChurch && (
              <p className="flex items-center gap-2">
                <Church className="w-4 h-4 text-slate-400" /> {event.hostChurch}
              </p>
            )}
          </div>
        </div>

        {/* Step: ready → escolher ação */}
        {step === "ready" && (
          <div className="space-y-3">
            {/* MODO 1: Chamada por igreja (só se evento tem igreja fixa) */}
            {event.fixedChurch && (
              <button
                onClick={() => setStep("roster")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-lg transition"
              >
                <Church className="w-5 h-5" /> Sou da {event.fixedChurch.name}
              </button>
            )}
            {/* MODO 2: Membro já cadastrado (sempre visível) */}
            <button
              onClick={() => setStep("searching")}
              className={`w-full ${event.fixedChurch ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white font-bold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-lg transition`}
            >
              <User className="w-5 h-5" /> Já sou cadastrado
            </button>
            {/* MODO 3: Cadastro livre (só se !membersOnly) */}
            {!event.membersOnly && (
              <>
                <button
                  onClick={() => setStep("registering")}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 px-4 rounded-2xl shadow-sm border-2 border-slate-200 flex items-center justify-center gap-2 text-lg transition"
                >
                  <User className="w-5 h-5" /> Fazer cadastro completo
                </button>
                <button
                  onClick={() => { setRegisterName(""); setRegisterPhone(""); setAcceptLgpd(false); setStep("simple"); }}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-3 px-4 rounded-2xl shadow-sm border-2 border-amber-200 flex items-center justify-center gap-2 text-base transition"
                >
                  <User className="w-5 h-5" /> Só quero registrar meu nome
                </button>
                <p className="text-xs text-slate-500 text-center px-2">
                  A liderança completa cargo e igreja depois, se precisar.
                </p>
              </>
            )}
            {event.membersOnly && (
              <p className="text-xs text-blue-700 text-center px-2 bg-blue-50 border border-blue-200 rounded-xl py-2">
                🔒 Este evento só permite membros já cadastrados.
              </p>
            )}
          </div>
        )}

        {/* Step: searching → buscar membro */}
        {step === "searching" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Digite seu nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-2xl text-base focus:outline-none focus:border-emerald-500"
              />
            </div>
            {search.trim().length >= 2 && (
              <ul className="space-y-2">
                {hits.length === 0 ? (
                  <li className="text-center text-slate-500 py-6 text-sm">
                    Nenhum resultado.{" "}
                    <button
                      onClick={() => { setRegisterName(search); setStep("registering"); }}
                      className="text-emerald-600 font-semibold underline"
                    >
                      Fazer cadastro
                    </button>
                  </li>
                ) : (
                  hits.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => { setSelected(h); setStep("selected"); }}
                        className="w-full bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-left flex items-center gap-3 transition"
                      >
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                          {h.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{h.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {h.role} {h.congregationName && `· ${h.congregationName}`}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
            <button
              onClick={() => setStep("ready")}
              className="w-full text-slate-500 text-sm font-semibold py-2"
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* Step: selected → confirmar */}
        {step === "selected" && selected && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-center">
              <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-2">Confirme sua presença</p>
              <p className="text-2xl font-extrabold text-slate-800">{selected.name}</p>
              <p className="text-sm text-slate-600 mt-1">
                {selected.role} {selected.congregationName && `· ${selected.congregationName}`}
              </p>
            </div>
            <button
              onClick={() => confirm(selected.id)}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-lg transition"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Confirmar presença
            </button>
            <button
              onClick={() => { setSelected(null); setStep("searching"); }}
              className="w-full text-slate-500 text-sm font-semibold py-2"
            >
              ← Escolher outro nome
            </button>
          </div>
        )}

        {/* Step: registering → cadastro rápido */}
        {step === "registering" && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800">Fazer cadastro rápido</h3>
            <p className="text-xs text-slate-500">Você poderá complementar seus dados depois com a liderança da sua igreja.</p>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Nome completo *</label>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                className="w-full px-3 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Telefone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Função eclesiástica</label>
              <select
                value={registerRole}
                onChange={(e) => setRegisterRole(e.target.value)}
                className="w-full px-3 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-emerald-500"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Igreja / Congregação</label>
              {churchMode === "select" ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Church className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={registerChurch}
                      onChange={(e) => setRegisterChurch(e.target.value)}
                      disabled={loadingCongregations}
                      className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-emerald-500 appearance-none bg-white"
                    >
                      <option value="">
                        {loadingCongregations
                          ? "Carregando..."
                          : congregations.length === 0
                          ? "Nenhuma congregação cadastrada"
                          : "Selecione sua igreja"}
                      </option>
                      {congregations.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                          {c.address ? ` — ${c.address}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setChurchMode("new"); setNewChurchName(""); }}
                    className="w-full flex items-center justify-center gap-1.5 text-emerald-700 hover:text-emerald-800 text-sm font-semibold py-2 border-2 border-dashed border-emerald-300 rounded-xl hover:bg-emerald-50 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar nova congregação
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 font-bold text-sm select-none">OBPC</span>
                    <input
                      type="text"
                      value={newChurchName.replace(/^obpc\s+/i, "")}
                      onChange={(e) => setNewChurchName(e.target.value)}
                      placeholder="Nome (ex: Vila Nova)"
                      autoFocus
                      className="w-full pl-14 pr-3 py-3 border-2 border-emerald-400 rounded-xl text-base focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Será salvo como: <span className="font-bold text-emerald-700">OBPC {newChurchName.replace(/^obpc\s+/i, "") || "(nome)"}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setChurchMode("select"); setNewChurchName(""); }}
                    className="w-full text-slate-500 text-sm font-semibold py-1"
                  >
                    ← Escolher da lista
                  </button>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={acceptLgpd}
                onChange={(e) => setAcceptLgpd(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span>
                Autorizo o armazenamento dos meus dados para controle de presença, conforme a{" "}
                <a href="/privacidade" target="_blank" className="underline font-semibold">Política de Privacidade</a>{" "}
                <Shield className="w-3 h-3 inline" />
              </span>
            </label>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              onClick={quickRegister}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-lg transition"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Cadastrar e confirmar
            </button>
            <button
              onClick={() => setStep("ready")}
              className="w-full text-slate-500 text-sm font-semibold py-2"
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* Step: simple → cadastro só com nome */}
        {step === "simple" && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800">Registro rápido</h3>
            <p className="text-xs text-slate-500">Só preciso do seu nome. A liderança complementa depois.</p>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Nome completo *</label>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                autoFocus
                placeholder="Seu nome"
                className="w-full px-3 py-3 border-2 border-amber-300 rounded-xl text-base focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Telefone (opcional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={acceptLgpd}
                onChange={(e) => setAcceptLgpd(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span>
                Autorizo o armazenamento do meu nome para controle de presença, conforme a{" "}
                <a href="/privacidade" target="_blank" className="underline font-semibold">Política de Privacidade</a>{" "}
                <Shield className="w-3 h-3 inline" />
              </span>
            </label>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              onClick={() => quickRegisterSimple()}
              disabled={submitting || !registerName || !acceptLgpd}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-lg transition"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Registrar e confirmar
            </button>
            <button
              onClick={() => setStep("ready")}
              className="w-full text-slate-500 text-sm font-semibold py-2"
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* Step: roster → chamada por igreja fixa */}
        {step === "roster" && event?.fixedChurch && (
          <div className="space-y-3">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
              <Church className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Chamada</p>
              <p className="text-lg font-extrabold text-purple-900">{event.fixedChurch.name}</p>
              {roster && (
                <p className="text-xs text-purple-700 mt-1">
                  {roster.present}/{roster.total} presentes
                </p>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar pelo seu nome..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-2xl text-base focus:outline-none focus:border-purple-500"
              />
            </div>

            {rosterLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              </div>
            ) : roster ? (
              <>
                <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                  {roster.members
                    .filter((m) => {
                      const q = rosterSearch.toLowerCase().trim();
                      if (!q) return true;
                      return m.name.toLowerCase().includes(q);
                    })
                    .map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() => !m.alreadyCheckedIn && !submitting && confirm(m.id)}
                          disabled={m.alreadyCheckedIn || submitting}
                          className={`w-full border-2 rounded-2xl p-3 text-left flex items-center gap-3 transition ${
                            m.alreadyCheckedIn
                              ? "bg-emerald-50 border-emerald-200 opacity-70 cursor-not-allowed"
                              : "bg-white border-slate-200 hover:border-purple-500"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              m.alreadyCheckedIn ? "bg-emerald-200 text-emerald-700" : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {m.alreadyCheckedIn ? <CheckCircle2 className="w-5 h-5" /> : m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate">{m.name}</p>
                            <p className="text-xs text-slate-500 truncate">{m.role}</p>
                          </div>
                          {m.alreadyCheckedIn && (
                            <span className="text-xs font-bold text-emerald-700">PRESENTE</span>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
                {rosterSearch && roster.members.filter((m) => m.name.toLowerCase().includes(rosterSearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-4">
                    Ninguém encontrado com "{rosterSearch}"
                  </p>
                )}
                <p className="text-xs text-slate-500 text-center pt-2">
                  Toque no seu nome pra marcar presença. Não aparece?{" "}
                  <button onClick={() => setStep("registering")} className="text-purple-600 underline font-semibold">
                    Faça o cadastro
                  </button>
                </p>
              </>
            ) : (
              <p className="text-center text-slate-500 text-sm py-4">{error || "Carregando..."}</p>
            )}

            <button
              onClick={() => setStep("ready")}
              className="w-full text-slate-500 text-sm font-semibold py-2"
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObpcCheckinView;
