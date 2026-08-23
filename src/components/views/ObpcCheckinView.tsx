// =====================================================================
// OBPC — Check-in (público, mobile)
// =====================================================================
// Rota: /checkin/:token
// Pessoa escaneia o QR, vê o evento, seleciona o nome dela (ou faz
// cadastro rápido) e confirma presença.
// =====================================================================

import React, { useEffect, useState } from "react";
import {
  CheckCircle2, X, AlertCircle, Loader2, User, Search, Phone, Church, MapPin, Calendar, Clock, Shield,
} from "lucide-react";

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

interface MemberHit {
  id: string;
  name: string;
  role: string;
  congregationName: string | null;
}

type Step = "loading" | "ready" | "searching" | "selected" | "registering" | "confirmed" | "denied" | "already";

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
  const [acceptLgpd, setAcceptLgpd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  // Carrega evento
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
      setStep("confirmed");
    } catch (e: any) {
      setError(e.message || "Erro");
      setStep("denied");
    } finally {
      setSubmitting(false);
    }
  };

  const quickRegister = async () => {
    if (!registerName || !acceptLgpd) {
      setError("Preencha seu nome e aceite a política de privacidade");
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
          churchName: registerChurch,
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
          <p className="text-xs text-slate-400 mt-6">Você pode fechar esta página.</p>
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
            <button
              onClick={() => setStep("searching")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-lg transition"
            >
              <User className="w-5 h-5" /> Já sou cadastrado
            </button>
            <button
              onClick={() => setStep("registering")}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 px-4 rounded-2xl shadow-sm border-2 border-slate-200 flex items-center justify-center gap-2 text-lg transition"
            >
              <User className="w-5 h-5" /> Fazer meu cadastro
            </button>
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
              <input
                type="text"
                value={registerChurch}
                onChange={(e) => setRegisterChurch(e.target.value)}
                placeholder="Ex: OBPC Cajuru"
                className="w-full px-3 py-3 border-2 border-slate-200 rounded-xl text-base focus:outline-none focus:border-emerald-500"
              />
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
      </div>
    </div>
  );
};

export default ObpcCheckinView;
