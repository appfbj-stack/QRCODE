/**
 * UsuariosView.tsx
 *
 * Painel ADMIN-only para gestão de usuários da rede Kairos.
 *
 * Recursos:
 *  - Tabela com todos os usuários (nome, email, congregação, role, último login, status)
 *  - Criar novo usuário (admin gera nome+email+senha inicial)
 *  - Editar role / congregação / status
 *  - Resetar senha (gera senha temporária Kairos-XXXXXX que admin envia pro pastor)
 *  - Desativar (soft delete) — bloqueia login mas preserva histórico
 *
 * Quem vê: apenas ADMIN/SUPER_ADMIN (definido no backend).
 */

import React, { useState, useMemo } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Mail,
  Shield,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit2,
  KeyRound,
  Trash2,
  Copy,
  X,
  AlertTriangle,
  Sparkles,
  User as UserIcon,
  Filter,
} from 'lucide-react';
import { SystemUser, UserRole, Congregation } from '../../types';
import { dataService } from '../../services/dataService';

interface UsuariosViewProps {
  users: SystemUser[];
  congregations: Congregation[];
  currentUserId: string;
  onReload: () => Promise<void> | void;
}

type FilterRole = 'all' | UserRole;
type FilterStatus = 'all' | 'active' | 'inactive';

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  GERENTE: 'Gerente (Pastor)',
  OPERADOR: 'Operador',
  USUARIO: 'Usuário',
};

const ROLE_COLOR: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 border-purple-300',
  ADMIN: 'bg-amber-100 text-amber-700 border-amber-300',
  GERENTE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  OPERADOR: 'bg-blue-100 text-blue-700 border-blue-300',
  USUARIO: 'bg-slate-100 text-slate-700 border-slate-300',
};

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  users,
  congregations,
  currentUserId,
  onReload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [congFilter, setCongFilter] = useState<string>('all');

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [resetData, setResetData] = useState<{ user: SystemUser; tempPassword: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SystemUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // Filtro + stats
  // ─────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const t = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.active) return false;
      if (statusFilter === 'inactive' && u.active) return false;
      if (congFilter !== 'all' && (u.congregationId ?? 'null') !== congFilter) return false;
      if (t && !`${u.name} ${u.email}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter, congFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const ativos = users.filter((u) => u.active).length;
    const admins = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
    const gerentes = users.filter((u) => u.role === 'GERENTE').length;
    return { total, ativos, admins, gerentes };
  }, [users]);

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────
  const flash = (msg: string, ok = true) => {
    if (ok) setSuccess(msg);
    else setError(msg);
    setTimeout(() => { setSuccess(null); setError(null); }, 3500);
  };

  const openCreate = () => {
    setEditingUser(null);
    setError(null);
    setIsFormOpen(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditingUser(u);
    setError(null);
    setIsFormOpen(true);
  };

  const submitForm = async (data: FormData) => {
    setBusy(true);
    setError(null);
    try {
      if (editingUser) {
        // PATCH — atualização
        await dataService.request(`/users/${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: data.name,
            role: data.role,
            congregationId: data.congregationId || null,
            active: data.active,
          }),
        });
        flash('Usuário atualizado com sucesso');
      } else {
        // POST — criação
        await dataService.request('/users', {
          method: 'POST',
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            congregationId: data.congregationId || null,
          }),
        });
        flash('Usuário criado com sucesso');
      }
      setIsFormOpen(false);
      await onReload();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (u: SystemUser) => {
    if (!confirm(`Resetar a senha de ${u.name}?\n\nUma senha temporária será gerada e você poderá enviar ao pastor por WhatsApp.`)) return;
    setBusy(true);
    try {
      const res = await dataService.request<{ tempPassword: string; userEmail: string }>(`/users/${u.id}/reset-password`, {
        method: 'POST',
      });
      setResetData({ user: u, tempPassword: res.tempPassword });
    } catch (e: any) {
      flash(e.message || 'Erro ao resetar senha', false);
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async (u: SystemUser) => {
    setBusy(true);
    try {
      await dataService.remove('users', u.id);
      flash(`Usuário ${u.name} desativado`);
      setDeleteConfirm(null);
      await onReload();
    } catch (e: any) {
      flash(e.message || 'Erro ao desativar', false);
    } finally {
      setBusy(false);
    }
  };

  const handleReactivate = async (u: SystemUser) => {
    setBusy(true);
    try {
      await dataService.request(`/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      });
      flash(`${u.name} reativado`);
      await onReload();
    } catch (e: any) {
      flash(e.message || 'Erro ao reativar', false);
    } finally {
      setBusy(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f5f0] overflow-hidden">
      {/* Banner de feedback */}
      {success && (
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="px-6 py-5 bg-white border-b border-[#e8e4d8]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#2a2a20] flex items-center gap-2">
              <UserCog className="w-6 h-6 text-[#a68a64]" />
              Usuários da Rede
            </h1>
            <p className="text-xs text-[#7a7060] mt-1">
              Gerencie os logins de cada congregação. Apenas administradores veem esta tela.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] rounded-2xl text-sm font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>

        {/* Cards de stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <StatCard icon={UserIcon} label="Total" value={stats.total} color="slate" />
          <StatCard icon={CheckCircle2} label="Ativos" value={stats.ativos} color="emerald" />
          <StatCard icon={Shield} label="Admins" value={stats.admins} color="amber" />
          <StatCard icon={Building2} label="Pastores (GERENTE)" value={stats.gerentes} color="blue" />
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 bg-[#faf8f0] border-b border-[#e8e4d8] flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-[#a68a64] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm text-[#2a2a20] focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
          />
        </div>
        <select
          value={congFilter}
          onChange={(e) => setCongFilter(e.target.value)}
          className="px-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none"
        >
          <option value="all">Todas as congregações</option>
          {congregations.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
          <option value="null">🌐 Sem congregação (Admin global)</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as FilterRole)}
          className="px-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none"
        >
          <option value="all">Todos os papéis</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Administrador</option>
          <option value="GERENTE">Gerente (Pastor)</option>
          <option value="OPERADOR">Operador</option>
          <option value="USUARIO">Usuário</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          className="px-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredUsers.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4d8] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#faf8f0] border-b border-[#e8e4d8]">
                <tr className="text-[10px] font-extrabold tracking-widest text-[#7a7060] uppercase">
                  <th className="text-left px-5 py-3">Usuário</th>
                  <th className="text-left px-5 py-3">Papel</th>
                  <th className="text-left px-5 py-3">Congregação</th>
                  <th className="text-left px-5 py-3">Último login</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isMe={u.id === currentUserId}
                    onEdit={() => openEdit(u)}
                    onResetPassword={() => handleResetPassword(u)}
                    onDeactivate={() => setDeleteConfirm(u)}
                    onReactivate={() => handleReactivate(u)}
                    busy={busy}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {isFormOpen && (
        <UserFormModal
          user={editingUser}
          congregations={congregations}
          busy={busy}
          error={error}
          onClose={() => { setIsFormOpen(false); setError(null); }}
          onSubmit={submitForm}
        />
      )}

      {/* Modal de Reset Password */}
      {resetData && (
        <ResetPasswordModal
          data={resetData}
          onClose={() => setResetData(null)}
        />
      )}

      {/* Confirmação de Desativar */}
      {deleteConfirm && (
        <ConfirmModal
          title="Desativar usuário?"
          message={`Tem certeza que deseja desativar ${deleteConfirm.name}?\n\nO usuário não conseguirá mais fazer login, mas o histórico de ações será preservado.`}
          confirmText="Desativar"
          confirmColor="rose"
          busy={busy}
          onConfirm={() => handleDeactivate(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Sub-componentes
// ═══════════════════════════════════════════════════════════

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'slate' | 'emerald' | 'amber' | 'blue';
}> = ({ icon: Icon, label, value, color }) => {
  const colors: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`p-3 rounded-2xl border ${colors[color]} flex items-center gap-3`}>
      <div className="p-2 rounded-xl bg-white/60">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-extrabold tracking-widest uppercase opacity-70">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
};

const UserRow: React.FC<{
  user: SystemUser;
  isMe: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  busy: boolean;
}> = ({ user, isMe, onEdit, onResetPassword, onDeactivate, onReactivate, busy }) => {
  const initials = user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return (
    <tr className="border-b border-[#f0ebd8] hover:bg-[#faf8f0] transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a68a64] to-[#5a5a40] text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {initials}
          </div>
          <div>
            <p className="text-sm font-bold text-[#2a2a20] flex items-center gap-2">
              {user.name}
              {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">VOCÊ</span>}
            </p>
            <p className="text-xs text-[#7a7060] flex items-center gap-1">
              <Mail className="w-3 h-3" /> {user.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2 py-1 rounded-full border ${ROLE_COLOR[user.role as UserRole]}`}>
          {ROLE_LABEL[user.role as UserRole]}
        </span>
      </td>
      <td className="px-5 py-3 text-sm text-[#2a2a20]">
        {user.congregationName ? (
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#a68a64]" />
            {user.congregationName}
          </span>
        ) : (
          <span className="text-[#a68a64] font-bold text-xs">🌐 Global (vê tudo)</span>
        )}
      </td>
      <td className="px-5 py-3 text-xs text-[#7a7060]">
        {user.lastLoginAt
          ? <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{formatRelative(user.lastLoginAt)}</span>
          : <span className="italic opacity-60">Nunca</span>}
      </td>
      <td className="px-5 py-3">
        {user.active ? (
          <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Ativo
          </span>
        ) : (
          <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-1 rounded-full bg-slate-200 text-slate-600 flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" /> Inativo
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={onEdit}
            disabled={busy}
            className="p-2 rounded-xl text-[#7a7060] hover:bg-[#f0ebd8] hover:text-[#5a5a40] transition-colors disabled:opacity-30"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onResetPassword}
            disabled={busy || !user.active}
            className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30"
            title="Resetar senha"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          {user.active ? (
            <button
              onClick={onDeactivate}
              disabled={busy || isMe}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
              title={isMe ? "Você não pode desativar seu próprio usuário" : "Desativar"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onReactivate}
              disabled={busy}
              className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30"
              title="Reativar"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const UserFormModal: React.FC<{
  user: SystemUser | null;
  congregations: Congregation[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
}> = ({ user, congregations, busy, error, onClose, onSubmit }) => {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>((user?.role as UserRole) ?? 'GERENTE');
  const [congregationId, setCongregationId] = useState(user?.congregationId ?? '');
  const [active, setActive] = useState(user?.active ?? true);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pwd = 'Kairos-';
    for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!user && (!email.trim() || !password)) return;
    onSubmit({ name: name.trim(), email: email.trim().toLowerCase(), password, role, congregationId, active });
  };

  const isEdit = !!user;
  const isGlobalRole = role === 'ADMIN' || role === 'SUPER_ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#e8e4d8] flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
            {isEdit ? <Edit2 className="w-5 h-5 text-[#a68a64]" /> : <Sparkles className="w-5 h-5 text-[#a68a64]" />}
            {isEdit ? 'Editar usuário' : 'Novo usuário'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f0e0] text-[#7a7060]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Nome completo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pr. Carlos Silva"
              required
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pastor.cajuru@kairos.com"
              required
              disabled={isEdit}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none disabled:opacity-50 disabled:bg-[#f5f0e0]"
            />
            {isEdit && <p className="text-[10px] text-[#7a7060] mt-1">Email não pode ser alterado.</p>}
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Senha inicial *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-3 py-2.5 rounded-2xl bg-[#a68a64]/10 hover:bg-[#a68a64]/20 text-[#5a5a40] text-xs font-bold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar
                </button>
              </div>
              <p className="text-[10px] text-[#7a7060] mt-1">O pastor poderá alterar a senha depois do primeiro login.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Papel *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              >
                <option value="GERENTE">Gerente (Pastor)</option>
                <option value="ADMIN">Administrador</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="OPERADOR">Operador</option>
                <option value="USUARIO">Usuário</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Congregação</label>
              <select
                value={congregationId}
                onChange={(e) => setCongregationId(e.target.value)}
                disabled={isGlobalRole}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none disabled:opacity-50 disabled:bg-[#f5f0e0]"
              >
                <option value="">{isGlobalRole ? '🌐 Global (vê tudo)' : '— Selecione —'}</option>
                {congregations.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {isGlobalRole && <p className="text-[10px] text-[#7a7060] mt-1">Admin global não tem congregação.</p>}
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-[#a68a64] text-[#5a5a40] focus:ring-[#a68a64]"
              />
              <label htmlFor="active" className="text-sm text-[#2a2a20]">Usuário ativo (pode fazer login)</label>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-[#e8e4d8]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-sm font-bold shadow-md disabled:opacity-50"
            >
              {busy ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Criar usuário')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ResetPasswordModal: React.FC<{
  data: { user: SystemUser; tempPassword: string };
  onClose: () => void;
}> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Olá ${data.user.name.split(' ')[0]}!\n\nSua nova senha de acesso ao Kairos Igreja é:\n\n*${data.tempPassword}*\n\nAcesse: https://igrejasede.fbautomacao.space\n\n— Administração da Rede Kairos`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-br from-amber-50 to-amber-100 border-b border-amber-200 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-200 text-amber-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-serif font-bold text-amber-900">Senha resetada</h2>
            <p className="text-xs text-amber-700">Envie ao pastor por WhatsApp</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-200/50 text-amber-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-[#7a7060] mb-1">Usuário</p>
            <p className="text-sm font-bold text-[#2a2a20]">{data.user.name}</p>
            <p className="text-xs text-[#7a7060]">{data.user.email}</p>
          </div>

          <div>
            <p className="text-xs text-[#7a7060] mb-1.5">Senha temporária</p>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-3 rounded-2xl bg-[#faf8f0] border-2 border-amber-300 font-mono text-lg font-bold text-amber-900 text-center tracking-wider">
                {data.tempPassword}
              </div>
              <button
                onClick={copy}
                className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
          >
            📱 Enviar por WhatsApp
          </a>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <p className="font-bold mb-1">⚠️ Importante</p>
            <p>Esta senha aparece <strong>uma única vez</strong>. Copie ou envie agora. Depois disso, não há como recuperá-la — só resetando de novo.</p>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmModal: React.FC<{
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'rose' | 'amber';
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ title, message, confirmText, confirmColor, busy, onConfirm, onClose }) => {
  const colorClass = confirmColor === 'rose'
    ? 'bg-rose-500 hover:bg-rose-600'
    : 'bg-amber-500 hover:bg-amber-600';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2 mb-3">
          <AlertTriangle className={`w-5 h-5 ${confirmColor === 'rose' ? 'text-rose-500' : 'text-amber-500'}`} />
          {title}
        </h2>
        <p className="text-sm text-[#5a5a40] whitespace-pre-line mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-md disabled:opacity-50 ${colorClass}`}
          >
            {busy ? 'Aguarde...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="bg-white rounded-2xl border-2 border-dashed border-[#e8e4d8] p-12 text-center">
    <UserCog className="w-12 h-12 text-[#a68a64] mx-auto mb-3 opacity-50" />
    <h3 className="text-lg font-serif font-bold text-[#2a2a20] mb-1">Nenhum usuário encontrado</h3>
    <p className="text-sm text-[#7a7060] mb-5">Tente ajustar os filtros ou cadastre um novo usuário.</p>
    <button
      onClick={onCreate}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5a5a40] hover:bg-[#4d4d36] text-white rounded-2xl text-sm font-bold shadow-md"
    >
      <Plus className="w-4 h-4" />
      Novo Usuário
    </button>
  </div>
);

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  congregationId: string;
  active: boolean;
}
