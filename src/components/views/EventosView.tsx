import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, MapPin, User, Plus, Users, CheckCircle2,
  Sparkles, Edit2, Trash2, X, AlertCircle, Search, Filter,
  CalendarDays, Video,
} from 'lucide-react';
import { EventItem, Congregation } from '../../types';
import { dataService } from '../../services/dataService';

interface EventosViewProps {
  events: EventItem[];
  congregations: Congregation[];
  onAddEvent: () => void;
  onRegisterEvent: (eventId: string) => void;
  onReload: () => Promise<void> | void;
}

const TYPE_OPTIONS = [
  { value: 'Culto', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { value: 'Conferência', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'Batismo', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'Retiro', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'Treinamento', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'Social', color: 'bg-pink-100 text-pink-700 border-pink-300' },
];

const TYPE_COLOR: Record<string, string> = TYPE_OPTIONS.reduce((acc, t) => {
  acc[t.value] = t.color;
  return acc;
}, {} as Record<string, string>);

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const EventosView: React.FC<EventosViewProps> = ({
  events,
  congregations,
  onAddEvent,
  onRegisterEvent,
  onReload,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [congregationFilter, setCongregationFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'upcoming' | 'past'>('list');

  // Modal state
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<EventItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  // ─────── Filtros ───────
  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return events
      .filter((e) => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false;
        if (congregationFilter !== 'all' && (e.congregationId || '') !== congregationFilter) return false;
        if (t) {
          const hay = `${e.title} ${e.location || ''} ${e.description || ''} ${e.speaker || ''}`.toLowerCase();
          if (!hay.includes(t)) return false;
        }
        const d = new Date(e.date);
        if (view === 'upcoming' && d < today) return false;
        if (view === 'past' && d >= today) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, search, typeFilter, congregationFilter, view]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = events.filter((e) => new Date(e.date) >= today).length;
    const past = events.length - upcoming;
    return { total: events.length, upcoming, past };
  }, [events]);

  // ─────── Handlers ───────
  const handleAddClick = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (e: EventItem) => {
    setEditingEvent(e);
    setIsFormOpen(true);
  };

  const handleDelete = async (e: EventItem) => {
    try {
      await dataService.remove('events', e.id);
      setDeleteConfirm(null);
      showToast('Evento removido', 'success');
      await onReload();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover', 'error');
    }
  };

  const handleFormSave = async (form: EventFormData) => {
    if (!form.title.trim()) {
      showToast('Título é obrigatório', 'error');
      return;
    }
    if (!form.date) {
      showToast('Data é obrigatória', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        location: form.location?.trim() || null,
        speaker: form.speaker?.trim() || null,
        bannerUrl: form.bannerUrl?.trim() || null,
        congregationId: form.congregationId || null,
        // Converte "YYYY-MM-DD" para ISO datetime
        date: new Date(`${form.date}T${form.time || '00:00'}:00`).toISOString(),
        time: form.time || null,
        type: form.type || null,
        capacity: form.capacity ? Number(form.capacity) : null,
      };
      if (editingEvent) {
        await dataService.update('events', editingEvent.id, payload);
        showToast('Evento atualizado', 'success');
      } else {
        await dataService.create('events', payload);
        showToast('Evento criado', 'success');
      }
      setIsFormOpen(false);
      setEditingEvent(null);
      await onReload();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f5f0] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-[#e8e4d8]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#2a2a20] flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#a68a64]" />
              Agenda & Eventos
            </h1>
            <p className="text-xs text-[#7a7060] mt-1">
              Cultos, conferências, batismos e encontros especiais.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] rounded-2xl text-sm font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </div>

        {/* Stats + view tabs */}
        <div className="flex flex-wrap gap-3 mt-5">
          <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">{stats.total}</span>
            <span className="text-slate-500">total</span>
          </div>
          <div className="px-3 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-emerald-700">{stats.upcoming}</span>
            <span className="text-emerald-600">próximos</span>
          </div>
          <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">{stats.past}</span>
            <span className="text-slate-500">realizados</span>
          </div>
          {/* Tabs */}
          <div className="ml-auto flex gap-1 p-1 bg-[#faf8f0] rounded-2xl border border-[#e8e4d8]">
            {([
              { v: 'list', label: 'Todos' },
              { v: 'upcoming', label: 'Próximos' },
              { v: 'past', label: 'Realizados' },
            ] as const).map((t) => (
              <button
                key={t.v}
                onClick={() => setView(t.v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  view === t.v
                    ? 'bg-[#5a5a40] text-white shadow-md'
                    : 'text-[#7a7060] hover:text-[#2a2a20]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 bg-[#faf8f0] border-b border-[#e8e4d8] flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-[#a68a64] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar evento, local, preletor..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm text-[#2a2a20] focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none"
        >
          <option value="all">Todos os tipos</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.value}</option>
          ))}
        </select>
        <select
          value={congregationFilter}
          onChange={(e) => setCongregationFilter(e.target.value)}
          className="px-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none"
        >
          <option value="all">Todas as congregações</option>
          {congregations.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-[#e8e4d8] p-12 text-center">
            <Calendar className="w-12 h-12 text-[#a68a64] mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-serif font-bold text-[#2a2a20] mb-1">Nenhum evento</h3>
            <p className="text-sm text-[#7a7060] mb-5">
              {view === 'upcoming' ? 'Sem eventos próximos.' :
               view === 'past' ? 'Sem eventos passados.' :
               'Crie o primeiro culto ou conferência.'}
            </p>
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5a5a40] hover:bg-[#4d4d36] text-white rounded-2xl text-sm font-bold shadow-md"
            >
              <Plus className="w-4 h-4" />
              Criar Evento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((evt) => {
              const cong = congregations.find((c) => c.id === evt.congregationId);
              return (
                <EventCard
                  key={evt.id}
                  event={evt}
                  congregationName={cong?.name}
                  onEdit={() => handleEditClick(evt)}
                  onDelete={() => setDeleteConfirm(evt)}
                  onRegister={() => onRegisterEvent(evt.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de criar/editar */}
      {isFormOpen && (
        <EventFormModal
          event={editingEvent}
          congregations={congregations}
          saving={saving}
          onClose={() => { setIsFormOpen(false); setEditingEvent(null); }}
          onSave={handleFormSave}
        />
      )}

      {/* Confirmação de exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Remover evento?
            </h2>
            <p className="text-sm text-[#5a5a40] mb-1">
              <strong>{deleteConfirm.title}</strong>
            </p>
            <p className="text-xs text-[#7a7060] mb-5">
              {formatDate(deleteConfirm.date)} {deleteConfirm.time && `· ${deleteConfirm.time}`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-md"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] transition-all">
          <div className={`px-4 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
            <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// EventCard — versão compacta (similar ao DocumentCard)
// ═══════════════════════════════════════════════════════════
const EventCard: React.FC<{
  event: EventItem;
  congregationName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onRegister: () => void;
}> = ({ event, congregationName, onEdit, onDelete, onRegister }) => {
  const typeColor = TYPE_COLOR[event.type || ''] || 'bg-slate-100 text-slate-700 border-slate-300';
  const dateObj = new Date(event.date);
  const isPast = dateObj < new Date();
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-[#e8e4d8] shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Cabeçalho com data */}
      <div className={`px-4 py-3 flex items-center gap-3 ${isPast ? 'bg-slate-50' : 'bg-gradient-to-r from-[#5a5a40]/10 to-[#a68a64]/10'}`}>
        <div className="shrink-0 w-14 h-14 rounded-xl bg-white border border-[#e8e4d8] flex flex-col items-center justify-center shadow-sm">
          <span className="text-lg font-extrabold text-[#2a2a20] leading-none">{day}</span>
          <span className="text-[9px] font-bold text-[#a68a64] tracking-wider">{month}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-extrabold tracking-wider uppercase ${typeColor}`}>
            {event.type || 'Evento'}
          </span>
          <h3 className="font-bold text-sm text-[#2a2a20] mt-1 truncate" title={event.title}>
            {event.title}
          </h3>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-4 flex-1 flex flex-col">
        {event.description && (
          <p className="text-xs text-[#7a7060] line-clamp-2 mb-3">{event.description}</p>
        )}
        <div className="space-y-1.5 text-[11px] text-[#7a7060]">
          {event.time && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>{event.time}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              <span className="truncate" title={event.location}>{event.location}</span>
            </div>
          )}
          {congregationName && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span className="truncate">{congregationName}</span>
            </div>
          )}
          {event.speaker && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3" />
              <span className="truncate">Preletor: <strong>{event.speaker}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            <span>
              <strong>{event.registeredCount || 0}</strong>
              {event.capacity ? ` / ${event.capacity} vagas` : ' inscritos'}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-auto pt-3 flex items-center gap-1 border-t border-[#f5f0e0]">
          {!isPast && (
            <button
              onClick={onRegister}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold"
              title="Inscrever-se"
            >
              <CheckCircle2 className="w-3 h-3" />
              Inscrever
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-[#a68a64] hover:bg-[#a68a64]/10 hover:text-[#5a5a40]"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
            title="Remover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// EventFormModal
// ═══════════════════════════════════════════════════════════
interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: string;
  speaker: string;
  capacity: string;
  bannerUrl: string;
  congregationId: string;
}

const EventFormModal: React.FC<{
  event: EventItem | null;
  congregations: Congregation[];
  saving: boolean;
  onClose: () => void;
  onSave: (form: EventFormData) => void;
}> = ({ event, congregations, saving, onClose, onSave }) => {
  const [form, setForm] = useState<EventFormData>({
    title: event?.title || '',
    description: event?.description || '',
    date: event ? new Date(event.date).toISOString().slice(0, 10) : todayISO(),
    time: event?.time || '',
    location: event?.location || '',
    type: event?.type || 'Culto',
    speaker: event?.speaker || '',
    capacity: event?.capacity ? String(event.capacity) : '',
    bannerUrl: event?.bannerUrl || '',
    congregationId: event?.congregationId || '',
  });

  const set = (patch: Partial<EventFormData>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#e8e4d8] flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
            {event ? <Edit2 className="w-5 h-5 text-[#a68a64]" /> : <Plus className="w-5 h-5 text-[#a68a64]" />}
            {event ? 'Editar evento' : 'Novo evento'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f0e0] text-[#7a7060]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Ex: Culto da Família"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
            />
          </div>

          {/* Tipo + Congregação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
                Tipo *
              </label>
              <select
                value={form.type}
                onChange={(e) => set({ type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
                Congregação
              </label>
              <select
                value={form.congregationId}
                onChange={(e) => set({ congregationId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              >
                <option value="">— Todas (rede) —</option>
                {congregations.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data + Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
                Data *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
                Hora
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => set({ time: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
                Capacidade
              </label>
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => set({ capacity: e.target.value })}
                placeholder="Ilimitado"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              />
            </div>
          </div>

          {/* Local + Preletor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
                Local
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set({ location: e.target.value })}
                placeholder="Ex: Templo Sede"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
                Preletor / Ministro
              </label>
              <input
                type="text"
                value={form.speaker}
                onChange={(e) => set({ speaker: e.target.value })}
                placeholder="Ex: Pr. Carlos Silva"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
              Descrição
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Detalhes do evento, tema, programação..."
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
            />
          </div>

          {/* Banner URL */}
          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
              URL do banner (opcional)
            </label>
            <input
              type="url"
              value={form.bannerUrl}
              onChange={(e) => set({ bannerUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
            />
            <p className="text-[10px] text-[#a68a64] mt-1">Cole o link de uma imagem para usar como capa.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e8e4d8] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={saving || !form.title.trim() || !form.date}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-sm font-bold shadow-md disabled:opacity-50"
          >
            {saving ? 'Salvando...' : event ? 'Salvar alterações' : 'Criar evento'}
          </button>
        </div>
      </div>
    </div>
  );
};
