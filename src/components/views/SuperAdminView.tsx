/**
 * SuperAdminView.tsx
 *
 * Painel administrativo da plataforma Kairos Igreja.
 * Visível APENAS para role SUPER_ADMIN.
 *
 * Mostra:
 *  - Cards de indicadores (total, ativas, bloqueadas, em trial, etc)
 *  - Tabela de todas as igrejas com busca + ações
 *  - Modal de edição (dados, plano, vencimento, tolerância)
 *  - Modal de bloqueio (com motivo)
 *
 * Acesso: SUPER_ADMIN (role global, não escopado por tenant)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Building2, Users, CheckCircle2, AlertTriangle, X,
  Lock, Unlock, RotateCcw, Edit2, ExternalLink, Search,
  Calendar, Mail, Phone, Hash, MapPin, Sparkles, RefreshCw,
  Activity, AlertCircle, Trash2, Plus, Save,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  logo?: string;
  active: boolean;
  planKey: string;
  subscriptionStatus: string;
  subscriptionEndsAt?: string;
  trialEndsAt?: string;
  diasTolerancia: number;
  motivoBloqueio?: string;
  bloqueadoEm?: string;
  createdAt: string;
  _count?: { users: number; congregations: number; members: number };
}

interface Stats {
  total: number;
  trial: number;
  active: number;
  overdue: number;
  blocked: number;
  cancelled: number;
  expiringIn7Days: number;
  totalUsers: number;
  totalMembers: number;
}

const STATUS_COLOR: Record<string, string> = {
  TRIAL: 'bg-amber-100 text-amber-700 border-amber-300',
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  OVERDUE: 'bg-orange-100 text-orange-700 border-orange-300',
  BLOCKED: 'bg-rose-100 text-rose-700 border-rose-300',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-300',
  EXPIRED: 'bg-rose-100 text-rose-700 border-rose-300',
};

const STATUS_LABEL: Record<string, string> = {
  TRIAL: 'Em Teste',
  ACTIVE: 'Ativa',
  OVERDUE: 'Atrasada',
  BLOCKED: 'Bloqueada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

export const SuperAdminView: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [blockingTenant, setBlockingTenant] = useState<Tenant | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const token = localStorage.getItem('kairos_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        fetch('/api/super-admin/stats', { headers }),
        fetch('/api/super-admin/tenants?limit=200', { headers }),
      ]);
      const statsJson = await statsRes.json();
      const tenantsJson = await tenantsRes.json();
      if (statsJson.success) setStats(statsJson);
      if (tenantsJson.success) setTenants(tenantsJson.data);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    return tenants.filter((tn) => {
      if (statusFilter !== 'all' && tn.subscriptionStatus !== statusFilter) return false;
      if (t) {
        const hay = `${tn.name} ${tn.slug} ${tn.cnpj || ''} ${tn.email || ''}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [tenants, search, statusFilter]);

  const block = async (id: string, motivo: string) => {
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/block`, {
        method: 'POST', headers, body: JSON.stringify({ motivo }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      showToast('Igreja bloqueada', 'success');
      setBlockingTenant(null);
      await loadAll();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const unblock = async (id: string) => {
    if (!confirm('Desbloquear esta igreja (ativa por 30 dias)?')) return;
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/unblock`, {
        method: 'POST', headers,
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      showToast('Igreja desbloqueada', 'success');
      await loadAll();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const resetTrial = async (id: string) => {
    if (!confirm('Resetar trial para 10 dias a partir de hoje?')) return;
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/trial`, {
        method: 'POST', headers,
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      showToast('Trial resetado (10 dias)', 'success');
      await loadAll();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const deleteTenant = async (id: string, name: string) => {
    if (!confirm(`DESATIVAR "${name}"? (soft delete — pode reverter manualmente no banco)`)) return;
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}`, {
        method: 'DELETE', headers,
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      showToast('Igreja desativada', 'success');
      await loadAll();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#a68a64] mx-auto mb-2 animate-spin" />
          <p className="text-sm text-[#7a7060]">Carregando painel Super Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f5f0] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-[#2a2a20] to-[#5a5a40] text-white">
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-400" />
          Painel Super Admin — Kairos Igreja
        </h1>
        <p className="text-xs text-amber-200/80 mt-1">
          Acesso restrito. Todas as ações ficam registradas.
        </p>
      </div>

      <div className="p-6 space-y-6 max-w-7xl">
        {/* Cards de stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatCard icon={Building2} label="Total de Igrejas" value={stats.total} color="slate" />
            <StatCard icon={Sparkles} label="Em Teste" value={stats.trial} color="amber" />
            <StatCard icon={CheckCircle2} label="Ativas" value={stats.active} color="emerald" />
            <StatCard icon={AlertCircle} label="Atrasadas" value={stats.overdue} color="orange" />
            <StatCard icon={Lock} label="Bloqueadas" value={stats.blocked} color="rose" />
            <StatCard icon={Activity} label="Vencem em 7d" value={stats.expiringIn7Days} color="indigo" />
            <StatCard icon={Users} label="Total Usuários" value={stats.totalUsers} color="sky" />
            <StatCard icon={Users} label="Total Membros" value={stats.totalMembers} color="teal" />
            <button
              onClick={() => setCreating(true)}
              className="flex flex-col items-center justify-center bg-[#5a5a40] hover:bg-[#4d4d36] text-white rounded-2xl p-4 transition-colors shadow-md"
            >
              <Plus className="w-7 h-7 mb-1" />
              <span className="text-xs font-bold">Nova Igreja</span>
            </button>
          </div>
        )}

        {/* Filtros + Tabela */}
        <div className="bg-white rounded-2xl border border-[#e8e4d8] p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#a68a64]" />
              Igrejas ({filtered.length})
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-[#a68a64] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, slug, CNPJ..."
                  className="pl-9 pr-3 py-2 rounded-2xl bg-[#faf8f0] border border-[#e8e4d8] text-sm text-[#2a2a20] focus:border-[#a68a64] outline-none w-72"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-[#faf8f0] border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none"
              >
                <option value="all">Todos os status</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={loadAll}
                className="p-2 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white"
                title="Atualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-[#a68a64] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[#7a7060]">Nenhuma igreja encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e4d8] text-left text-[10px] uppercase tracking-wider text-[#7a7060]">
                    <th className="px-3 py-2">Igreja</th>
                    <th className="px-3 py-2">Plano</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Vencimento</th>
                    <th className="px-3 py-2">Membros</th>
                    <th className="px-3 py-2">Congregações</th>
                    <th className="px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tn) => (
                    <tr key={tn.id} className="border-b border-[#f5f0e0] hover:bg-[#faf8f0]">
                      <td className="px-3 py-3">
                        <div className="font-bold text-[#2a2a20]">{tn.name}</div>
                        <div className="text-[10px] text-[#7a7060]">/{tn.slug}</div>
                        {tn.cnpj && <div className="text-[10px] text-[#7a7060]">CNPJ: {tn.cnpj}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-bold uppercase text-[#5a5a40]">{tn.planKey}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${STATUS_COLOR[tn.subscriptionStatus] || STATUS_COLOR.CANCELLED}`}>
                          {STATUS_LABEL[tn.subscriptionStatus] || tn.subscriptionStatus}
                        </span>
                        {tn.motivoBloqueio && (
                          <div className="text-[10px] text-rose-600 mt-1 italic">"{tn.motivoBloqueio}"</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#5a5a40]">
                        {tn.subscriptionStatus === 'TRIAL' && tn.trialEndsAt && (
                          <div>trial: {new Date(tn.trialEndsAt).toLocaleDateString('pt-BR')}</div>
                        )}
                        {tn.subscriptionEndsAt && (
                          <div>vence: {new Date(tn.subscriptionEndsAt).toLocaleDateString('pt-BR')}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-bold">{tn._count?.members ?? 0}</td>
                      <td className="px-3 py-3 text-center">{tn._count?.congregations ?? 0}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingTenant(tn)} className="p-1.5 rounded-lg text-[#a68a64] hover:bg-[#a68a64]/10" title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {tn.subscriptionStatus === 'BLOCKED' ? (
                            <button onClick={() => unblock(tn.id)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Desbloquear">
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => setBlockingTenant(tn)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50" title="Bloquear">
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => resetTrial(tn.id)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50" title="Resetar Trial (10 dias)">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteTenant(tn.id, tn.name)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50" title="Desativar (soft delete)">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSave={async (data) => {
            try {
              const res = await fetch(`/api/super-admin/tenants/${editingTenant.id}`, {
                method: 'PATCH', headers, body: JSON.stringify(data),
              });
              const j = await res.json();
              if (!j.success) throw new Error(j.error);
              showToast('Igreja atualizada', 'success');
              setEditingTenant(null);
              await loadAll();
            } catch (e: any) { showToast(e.message, 'error'); }
          }}
        />
      )}

      {blockingTenant && (
        <BlockModal
          tenant={blockingTenant}
          onClose={() => setBlockingTenant(null)}
          onConfirm={(motivo) => block(blockingTenant.id, motivo)}
        />
      )}

      {creating && (
        <CreateTenantModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); loadAll(); }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
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
// Sub-componentes
// ═══════════════════════════════════════════════════════════

const StatCard: React.FC<{ icon: any; label: string; value: number; color: string }> = ({ icon: Icon, label, value, color }) => {
  const colors: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <Icon className="w-5 h-5 mb-2 opacity-70" />
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
};

const EditTenantModal: React.FC<{
  tenant: Tenant;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}> = ({ tenant, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: tenant.name,
    cnpj: tenant.cnpj || '',
    telefone: tenant.telefone || '',
    email: tenant.email || '',
    endereco: tenant.endereco || '',
    planKey: tenant.planKey,
    subscriptionStatus: tenant.subscriptionStatus,
    subscriptionEndsAt: tenant.subscriptionEndsAt ? tenant.subscriptionEndsAt.slice(0, 10) : '',
    diasTolerancia: tenant.diasTolerancia || 3,
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: any) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#e8e4d8] flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-[#a68a64]" />
            Editar: {tenant.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f0e0] text-[#7a7060]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome" value={form.name} onChange={(v) => set({ name: v })} />
            <Field label="CNPJ" value={form.cnpj} onChange={(v) => set({ cnpj: v })} placeholder="00.000.000/0000-00" />
            <Field label="Telefone" value={form.telefone} onChange={(v) => set({ telefone: v })} placeholder="(11) 99999-9999" />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set({ email: v })} />
          </div>
          <Field label="Endereço" value={form.endereco} onChange={(v) => set({ endereco: v })} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Plano</Label>
              <select value={form.planKey} onChange={(e) => set({ planKey: e.target.value })} className={inputClass}>
                <option value="BASICO">Básico (R$ 49,90)</option>
                <option value="PRO">Pro (R$ 99,90)</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select value={form.subscriptionStatus} onChange={(e) => set({ subscriptionStatus: e.target.value })} className={inputClass}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <Field label="Dias Tolerância" type="number" value={String(form.diasTolerancia)} onChange={(v) => set({ diasTolerancia: Number(v) || 0 })} />
          </div>
          <Field label="Vencimento da Assinatura" type="date" value={form.subscriptionEndsAt} onChange={(v) => set({ subscriptionEndsAt: v })} />
        </div>
        <div className="px-6 py-4 border-t border-[#e8e4d8] flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]">
            Cancelar
          </button>
          <button
            onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-sm font-bold shadow-md disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BlockModal: React.FC<{ tenant: Tenant; onClose: () => void; onConfirm: (m: string) => void }> = ({ tenant, onClose, onConfirm }) => {
  const [motivo, setMotivo] = useState(tenant.motivoBloqueio || 'Bloqueio administrativo');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2 mb-3">
          <Lock className="w-5 h-5 text-rose-500" />
          Bloquear {tenant.name}?
        </h2>
        <p className="text-xs text-[#7a7060] mb-3">
          A igreja não conseguirá mais acessar o sistema. Você pode desbloquear depois.
        </p>
        <label className="block text-[10px] font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
          Motivo
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none mb-5"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-md"
          >
            <Lock className="w-3.5 h-3.5 inline mr-1" />
            Bloquear
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateTenantModal: React.FC<{ onClose: () => void; onCreated: () => void; showToast: (m: string, t: 'success' | 'error') => void }> = ({ onClose, onCreated, showToast }) => {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    adminName: '',
    adminEmail: '',
    planKey: 'BASICO',
  });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ tenant: Tenant; admin: any; generatedPassword: string } | null>(null);
  const set = (patch: any) => setForm((f) => ({ ...f, ...patch }));
  const autoSlug = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

  const submit = async () => {
    if (!form.name || !form.slug) {
      showToast('Nome e slug são obrigatórios', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST', headers, body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setCreated(j);
      showToast('Igreja criada!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Senha copiada!', 'success');
  };

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-serif font-bold text-[#2a2a20] mb-1">Igreja criada com sucesso!</h2>
            <p className="text-sm text-[#7a7060] mb-4">
              <strong>{created.tenant.name}</strong> — trial de 10 dias
            </p>
            {created.admin && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left mb-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 mb-2">
                  ⚠️ Credenciais do Admin inicial
                </p>
                <p className="text-xs text-[#5a5a40]"><strong>Email:</strong> {created.admin.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-white rounded-xl border border-amber-300 font-mono text-xs">
                    {created.generatedPassword}
                  </div>
                  <button onClick={() => copy(created.generatedPassword!)} className="p-2 rounded-xl bg-[#5a5a40] text-white">
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-amber-700 mt-2">Anote essa senha. Ela não será mostrada de novo.</p>
              </div>
            )}
            <button onClick={onCreated} className="w-full px-4 py-2.5 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-sm font-bold">
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#e8e4d8] flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-500" />
            Nova Igreja
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f0e0] text-[#7a7060]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-[10px] font-extrabold tracking-widest text-[#7a7060] uppercase">Dados da Igreja</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome *" value={form.name} onChange={(v) => set({ name: v, slug: form.slug || autoSlug(v) })} />
            <Field label="Slug (URL) *" value={form.slug} onChange={(v) => set({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="obpc-sede" />
            <Field label="CNPJ" value={form.cnpj} onChange={(v) => set({ cnpj: v })} />
            <Field label="Telefone" value={form.telefone} onChange={(v) => set({ telefone: v })} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set({ email: v })} />
            <div>
              <Label>Plano</Label>
              <select value={form.planKey} onChange={(e) => set({ planKey: e.target.value })} className={inputClass}>
                <option value="BASICO">Básico (R$ 49,90)</option>
                <option value="PRO">Pro (R$ 99,90)</option>
              </select>
            </div>
          </div>
          <Field label="Endereço" value={form.endereco} onChange={(v) => set({ endereco: v })} />

          <hr className="border-[#e8e4d8]" />

          <p className="text-[10px] font-extrabold tracking-widest text-[#7a7060] uppercase">Admin Inicial (opcional)</p>
          <p className="text-xs text-[#7a7060] -mt-2">Se preencher, criamos um admin com senha aleatória forte.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome" value={form.adminName} onChange={(v) => set({ adminName: v })} />
            <Field label="Email" type="email" value={form.adminEmail} onChange={(v) => set({ adminEmail: v })} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#e8e4d8] flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !form.name || !form.slug}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-md disabled:opacity-50"
          >
            {busy ? 'Criando...' : 'Criar Igreja (10 dias trial)'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helpers
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[10px] font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">
    {children}
  </label>
);

const inputClass = "w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none";

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div>
    <Label>{label}</Label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  </div>
);
