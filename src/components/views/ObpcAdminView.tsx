// =====================================================================
// OBPC Admin — Gestão de Eventos de Presença (QR Code)
// =====================================================================
// Lista eventos, cria, abre, encerra, rotaciona QR, mostra painel live
// =====================================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar, Clock, MapPin, Plus, QrCode, Trash2, Edit2, X,
  CheckCircle2, Power, PowerOff, RefreshCw, ExternalLink, Users,
  BarChart3, Loader2, AlertCircle, Search, PlayCircle, StopCircle,
  Download, FileText, FileSpreadsheet, Church, User,
} from "lucide-react";
import { api, getToken } from "../../services/api";

// Tipos
type ObpcEventStatus = "ABERTO" | "ENCERRADO" | "CANCELADO";

interface ObpcEvent {
  id: string;
  name: string;
  description?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  hostChurch?: string | null;
  congregationId?: string | null;
  membersOnly?: boolean;
  status: ObpcEventStatus;
  qrToken?: string | null;
  qrRotatedAt?: string | null;
  startedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  _count?: { attendances: number };
}

interface Attendance {
  id: string;
  memberId?: string | null;
  memberName: string;
  memberRole?: string | null;
  churchName?: string | null;
  createdAt: string;
  method: string;
}

interface Stats {
  total: number;
  byRole: Record<string, number>;
  byChurch: Record<string, number>;
  recent: Attendance[];
}

const STATUS_COLOR: Record<ObpcEventStatus, string> = {
  ABERTO: "bg-emerald-100 text-emerald-800 border-emerald-300",
  ENCERRADO: "bg-slate-200 text-slate-700 border-slate-300",
  CANCELADO: "bg-rose-100 text-rose-800 border-rose-300",
};

const ROLE_COLOR: Record<string, string> = {
  PASTOR: "bg-amber-100 text-amber-800",
  PRESBITERO: "bg-purple-100 text-purple-800",
  EVANGELISTA: "bg-blue-100 text-blue-800",
  MISSIONARIA: "bg-pink-100 text-pink-800",
  DIACONO: "bg-emerald-100 text-emerald-800",
  DIACONISA: "bg-rose-100 text-rose-800",
  MEMBRO: "bg-slate-100 text-slate-700",
};

function fmtDate(s: string): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return s;
  }
}
function fmtTime(s: string): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

export const ObpcAdminView: React.FC = () => {
  const [events, setEvents] = useState<ObpcEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal de criar/editar
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    time: "19:30",
    location: "",
    hostChurch: "",
    fixedChurchId: "",
    membersOnly: false,
    status: "ABERTO" as ObpcEventStatus,
  });
  const [saving, setSaving] = useState(false);

  // Painel do evento selecionado
  const [selectedEvent, setSelectedEvent] = useState<ObpcEvent | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Carrega lista
  const loadEvents = async () => {
    try {
      setLoading(true);
      // api() já extrai data.data do envelope. O backend retorna o array direto em `data`.
      const data = await api<ObpcEvent[]>(
        `/obpc/events?limit=100${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`
      );
      setEvents(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [statusFilter]);

  // Filtro
  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    if (!t) return events;
    return events.filter((e) =>
      `${e.name} ${e.location || ""} ${e.hostChurch || ""} ${e.description || ""}`.toLowerCase().includes(t)
    );
  }, [events, search]);

  // Modal
  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      time: "19:30",
      location: "",
      hostChurch: "",
      fixedChurchId: "",
      membersOnly: false,
      status: "ABERTO",
    });
    loadAdminCongregations();
    setFormOpen(true);
  };

  const openEdit = (ev: ObpcEvent) => {
    setEditingId(ev.id);
    setForm({
      name: ev.name,
      description: ev.description || "",
      date: ev.date.slice(0, 10),
      time: ev.time || "19:30",
      location: ev.location || "",
      hostChurch: ev.hostChurch || "",
      fixedChurchId: ev.congregationId || "",
      membersOnly: ev.membersOnly || false,
      status: ev.status,
    });
    loadAdminCongregations();
    setFormOpen(true);
  };

  // Carrega lista de congregações (pro select do form)
  const [adminCongregations, setAdminCongregations] = useState<{ id: string; name: string }[]>([]);
  const loadAdminCongregations = async () => {
    if (adminCongregations.length > 0) return;
    try {
      const list = await api<{ id: string; name: string }[]>("/obpc/congregations");
      setAdminCongregations(list);
    } catch {}
  };

  const saveEvent = async () => {
    if (!form.name || !form.date) {
      showToast("Nome e data são obrigatórios", "error");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description || null,
        date: new Date(`${form.date}T${form.time || "00:00"}:00`).toISOString(),
        time: form.time || null,
        location: form.location || null,
        hostChurch: form.hostChurch || null,
        congregationId: form.fixedChurchId || null,
        membersOnly: form.membersOnly,
        status: form.status,
      };
      if (editingId) {
        await api(`/obpc/events/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast("Evento atualizado");
      } else {
        await api(`/obpc/events`, { method: "POST", body: JSON.stringify(payload) });
        showToast("Evento criado");
      }
      setFormOpen(false);
      await loadEvents();
    } catch (e: any) {
      showToast(e.message || "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Excluir este evento? (soft delete — pode ser restaurado)")) return;
    try {
      await api(`/obpc/events/${id}`, { method: "DELETE" });
      showToast("Removido");
      await loadEvents();
    } catch (e: any) {
      showToast(e.message || "Erro", "error");
    }
  };

  // Painel do evento
  const openEventPanel = async (ev: ObpcEvent) => {
    setSelectedEvent(ev);
    await loadEventData(ev);
  };

  const loadEventData = async (ev: ObpcEvent) => {
    try {
      const [s, a] = await Promise.all([
        api<Stats>(`/obpc/events/${ev.id}/stats`),
        api<Attendance[]>(`/obpc/events/${ev.id}/attendances`),
      ]);
      setStats(s);
      setAttendances(a);
    } catch (e: any) {
      showToast(e.message || "Erro", "error");
    }
  };

  const openEvent = async (ev: ObpcEvent) => {
    try {
      const updated = await api<ObpcEvent>(`/obpc/events/${ev.id}/open`, { method: "POST" });
      showToast("Evento aberto — QR gerado");
      await loadEvents();
      if (selectedEvent?.id === ev.id) {
        setSelectedEvent(updated);
        await loadEventData(updated);
      }
    } catch (e: any) {
      showToast(e.message || "Erro", "error");
    }
  };

  const closeEvent = async (ev: ObpcEvent) => {
    if (!confirm("Encerrar este evento? Não aceitará mais check-ins.")) return;
    try {
      await api(`/obpc/events/${ev.id}/close`, { method: "POST" });
      showToast("Evento encerrado");
      await loadEvents();
      if (selectedEvent?.id === ev.id) {
        const updated = { ...ev, status: "ENCERRADO" as ObpcEventStatus };
        setSelectedEvent(updated);
      }
    } catch (e: any) {
      showToast(e.message || "Erro", "error");
    }
  };

  const rotateQr = async (ev: ObpcEvent) => {
    if (!confirm("Rotacionar o QR? O QR atual para de funcionar imediatamente.")) return;
    try {
      const r = await api<{ qrToken: string }>(`/obpc/events/${ev.id}/rotate-qr`, { method: "POST" });
      showToast("QR rotacionado");
      if (selectedEvent?.id === ev.id) {
        setSelectedEvent({ ...ev, qrToken: r.qrToken });
      }
    } catch (e: any) {
      showToast(e.message || "Erro", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="w-7 h-7 text-emerald-700" />
            Presença por QR Code
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Crie eventos, gere QR e acompanhe as presenças em tempo real.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-5 h-5" /> Novo evento
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Todos os status</option>
          <option value="ABERTO">Abertos</option>
          <option value="ENCERRADO">Encerrados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          Nenhum evento encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{ev.name}</h3>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLOR[ev.status]}`}
                >
                  {ev.status}
                </span>
              </div>

              <div className="space-y-1 text-sm text-slate-600 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> {fmtDate(ev.date)}
                  {ev.time && (
                    <>
                      <Clock className="w-4 h-4 text-slate-400 ml-2" /> {ev.time}
                    </>
                  )}
                </div>
                {ev.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> {ev.location}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> {ev._count?.attendances || 0} presenças
                </div>
                {ev.congregationId && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-semibold">
                    <Church className="w-3 h-3" /> Chamada fechada
                  </div>
                )}
                {ev.membersOnly && (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold">
                    <User className="w-3 h-3" /> Só membros
                  </div>
                )}
              </div>

              {ev.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{ev.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openEventPanel(ev)}
                  className="flex-1 text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-1"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Painel
                </button>
                {ev.status === "ABERTO" ? (
                  <button
                    onClick={() => closeEvent(ev)}
                    className="text-xs px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg flex items-center gap-1"
                    title="Encerrar"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => openEvent(ev)}
                    className="text-xs px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg flex items-center gap-1"
                    title="Abrir"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => openEdit(ev)}
                  className="text-xs px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="text-xs px-3 py-2 bg-slate-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: criar/editar */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? "Editar evento" : "Novo evento"}
              </h2>
              <button onClick={() => setFormOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Reunião de Obreiros"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Data *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Hora</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Local</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ex: Templo Sede"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Igreja responsável</label>
                <input
                  type="text"
                  value={form.hostChurch}
                  onChange={(e) => setForm({ ...form, hostChurch: e.target.value })}
                  placeholder="Ex: OBPC Cajuru"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Igreja da chamada fechada <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select
                  value={form.fixedChurchId}
                  onChange={(e) => setForm({ ...form, fixedChurchId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">— Sem (check-in livre) —</option>
                  {adminCongregations.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Se definir, o QR do evento vira chamada fechada só dessa igreja.
                </p>
              </div>
              <label className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.membersOnly}
                  onChange={(e) => setForm({ ...form, membersOnly: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-emerald-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">Só permite membros cadastrados</p>
                  <p className="text-xs text-slate-600">
                    Esconde os botões de cadastro. Quem escanear só consegue confirmar se já estiver no cadastro.
                  </p>
                </div>
              </label>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setFormOpen(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={saveEvent}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: painel do evento */}
      {selectedEvent && (
        <EventPanelModal
          event={selectedEvent}
          stats={stats}
          attendances={attendances}
          onClose={() => setSelectedEvent(null)}
          onOpen={openEvent}
          onClose2={closeEvent}
          onRotate={rotateQr}
          onRefresh={() => loadEventData(selectedEvent)}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] px-5 py-3 rounded-xl shadow-lg font-semibold text-sm ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// =====================================================================
// Painel do evento (QR + stats + lista live via SSE)
// =====================================================================
interface PanelProps {
  event: ObpcEvent;
  stats: Stats | null;
  attendances: Attendance[];
  onClose: () => void;
  onOpen: (e: ObpcEvent) => void;
  onClose2: (e: ObpcEvent) => void;
  onRotate: (e: ObpcEvent) => void;
  onRefresh: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

const EventPanelModal: React.FC<PanelProps> = ({
  event, stats, attendances, onClose, onOpen, onClose2, onRotate, onRefresh, showToast,
}) => {
  const [liveAttendances, setLiveAttendances] = useState<Attendance[]>(attendances);
  const [liveStats, setLiveStats] = useState<Stats | null>(stats);
  const [eventExportOpen, setEventExportOpen] = useState(false);
  const [eventExporting, setEventExporting] = useState(false);
  const [editingAtt, setEditingAtt] = useState<Attendance | null>(null);
  const [editRole, setEditRole] = useState("MEMBRO");
  const [editChurchId, setEditChurchId] = useState<string>("");
  const [congregations, setCongregations] = useState<{ id: string; name: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // Carrega congregações + abre modal de edição
  const openEditAttendance = async (a: Attendance) => {
    setEditingAtt(a);
    setEditRole(a.memberRole || "MEMBRO");
    setEditChurchId("");
    if (congregations.length === 0) {
      try {
        const list = await api<{ id: string; name: string }[]>("/obpc/congregations");
        setCongregations(list);
      } catch {}
    }
  };

  const saveEditAttendance = async () => {
    if (!editingAtt) return;
    setSavingEdit(true);
    try {
      const updated = await api<Attendance>(
        `/obpc/events/${event.id}/attendances/${editingAtt.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: editRole,
            congregationId: editChurchId || null,
          }),
        }
      );
      setLiveAttendances((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      showToast("Presença atualizada");
      setEditingAtt(null);
    } catch (e: any) {
      showToast(e.message || "Erro ao salvar", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const exportEvent = async (format: "csv" | "pdf") => {
    try {
      setEventExporting(true);
      setEventExportOpen(false);
      const token = getToken();
      const url = `/api/obpc/events/${event.id}/export?format=${format}${token ? `&token=${token}` : ""}`;
      if (format === "pdf") {
        const w = window.open(url, "_blank");
        if (!w) showToast("Permita pop-ups para gerar PDF", "error");
      } else {
        const r = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error("Falha ao exportar");
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `presencas-${event.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        showToast("Lista do evento exportada");
      }
    } catch (e: any) {
      showToast(e.message || "Erro ao exportar", "error");
    } finally {
      setEventExporting(false);
    }
  };

  useEffect(() => {
    setLiveAttendances(attendances);
    setLiveStats(stats);
  }, [attendances, stats]);

  // SSE
  useEffect(() => {
    if (event.status !== "ABERTO") return;
    const token = localStorage.getItem("kairos_token");
    const url = `/api/obpc/events/${event.id}/stream${token ? `?token=${token}` : ""}`;
    const es = new EventSource(url, { withCredentials: true });
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "checkin") {
          showToast(`${payload.attendance.memberName} acabou de chegar!`);
          setLiveAttendances((prev) => [...prev, payload.attendance]);
          setLiveStats((prev) => {
            if (!prev) return prev;
            const byRole = { ...prev.byRole };
            const byChurch = { ...prev.byChurch };
            const role = payload.attendance.memberRole || "MEMBRO";
            byRole[role] = (byRole[role] || 0) + 1;
            const ch = payload.attendance.churchName || "—";
            byChurch[ch] = (byChurch[ch] || 0) + 1;
            return { ...prev, total: prev.total + 1, byRole, byChurch };
          });
        }
      } catch {}
    };
    es.onerror = () => {
      // tenta reconectar automaticamente
    };
    return () => { es.close(); };
  }, [event.id, event.status]);

  const checkinUrl = `${window.location.origin}/checkin/${event.qrToken || ""}`;
  const qrUrl = event.qrToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(checkinUrl)}`
    : null;
  const telaUrl = `${window.location.origin}/telao/${event.qrToken || ""}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{event.name}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {fmtDate(event.date)} {event.time && `· ${event.time}`} {event.location && `· ${event.location}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Coluna esquerda: QR + ações */}
          <div className="space-y-4">
            {event.status === "ABERTO" && event.qrToken ? (
              <>
                <div className="bg-gradient-to-br from-emerald-50 to-amber-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-emerald-700 mb-2">📱 APONTE A CÂMERA DO CELULAR</p>
                  {qrUrl && (
                    <img
                      src={qrUrl}
                      alt="QR Code"
                      className="w-full max-w-[280px] mx-auto rounded-xl bg-white p-2"
                    />
                  )}
                  <p className="text-xs text-slate-500 mt-2 break-all">{checkinUrl}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={telaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> Modo Telão
                  </a>
                  <button
                    onClick={() => onRotate(event)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                  >
                    <RefreshCw className="w-4 h-4" /> Rotacionar QR
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center">
                <PowerOff className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-600 font-semibold mb-3">
                  {event.status === "ENCERRADO" ? "Evento encerrado" : "Evento ainda não foi aberto"}
                </p>
                {event.status !== "ENCERRADO" && (
                  <button
                    onClick={() => onOpen(event)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                  >
                    <Power className="w-4 h-4" /> Abrir evento
                  </button>
                )}
              </div>
            )}

            {event.status === "ABERTO" && (
              <button
                onClick={() => onClose2(event)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-sm"
              >
                <StopCircle className="w-4 h-4" /> Encerrar evento
              </button>
            )}

            <div className="text-xs text-slate-500 space-y-1">
              <p>ID: {event.id}</p>
              {event.qrToken && <p>Token: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{event.qrToken}</code></p>}
              {event.qrRotatedAt && <p>QR rotacionado: {fmtTime(event.qrRotatedAt)}</p>}
            </div>
          </div>

          {/* Coluna direita: stats + lista */}
          <div className="space-y-4">
            {/* Stats card */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-3xl font-extrabold text-emerald-700">{liveStats?.total || 0}</p>
                <p className="text-xs font-semibold text-emerald-600 uppercase">Presentes</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-3xl font-extrabold text-slate-700">{Object.keys(liveStats?.byChurch || {}).length}</p>
                <p className="text-xs font-semibold text-slate-600 uppercase">Igrejas</p>
              </div>
            </div>

            {/* Contadores por função */}
            {liveStats && Object.keys(liveStats.byRole).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">Por função</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(liveStats.byRole).map(([role, count]) => (
                    <div key={role} className={`px-2 py-1 rounded-lg text-xs font-bold ${ROLE_COLOR[role] || "bg-slate-100 text-slate-700"}`}>
                      {role}: {count}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de presenças */}
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-xs font-bold text-slate-600 uppercase">Presenças (mais recentes)</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setEventExportOpen(!eventExportOpen)}
                      disabled={eventExporting || liveAttendances.length === 0}
                      title={liveAttendances.length === 0 ? "Sem presenças para exportar" : "Exportar lista deste evento"}
                      className="text-xs px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {eventExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      Exportar
                    </button>
                    {eventExportOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setEventExportOpen(false)} />
                        <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                          <button
                            onClick={() => exportEvent("csv")}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 text-left text-xs"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-slate-700">Excel / CSV</span>
                          </button>
                          <button
                            onClick={() => exportEvent("pdf")}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 text-left text-xs border-t border-slate-100"
                          >
                            <FileText className="w-4 h-4 text-rose-600" />
                            <span className="font-semibold text-slate-700">PDF (imprimir)</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={onRefresh} className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold">
                    Atualizar
                  </button>
                </div>
              </div>
              {liveAttendances.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhuma presença ainda</p>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {[...liveAttendances].reverse().map((a) => (
                    <li key={a.id} className="py-2 flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm">
                        {a.memberName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.memberName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {a.memberRole || "MEMBRO"} {a.churchName && `· ${a.churchName}`}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{fmtTime(a.createdAt)}</span>
                      <button
                        onClick={() => setEditingAtt(a)}
                        title="Editar cargo / igreja"
                        className="text-slate-400 hover:text-emerald-600 p-1 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: editar presença (completar cargo/igreja) */}
      {editingAtt && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Completar dados</h3>
                <p className="text-sm text-slate-500 mt-1">{editingAtt.memberName}</p>
              </div>
              <button onClick={() => setEditingAtt(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Função eclesiástica</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {["PASTOR", "PRESBITERO", "EVANGELISTA", "MISSIONARIA", "DIACONO", "DIACONISA", "MEMBRO"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Igreja / Congregação</label>
                <select
                  value={editChurchId}
                  onChange={(e) => setEditChurchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">(sem igreja)</option>
                  {congregations.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingAtt(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditAttendance}
                disabled={savingEdit}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObpcAdminView;
