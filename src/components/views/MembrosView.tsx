import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Calendar,
  Home,
  CheckCircle2,
  Trash2,
  Edit2,
  UserPlus,
  CreditCard,
  MapPin,
  Building2,
  Droplets,
  HeartHandshake,
  Upload,
  FileSpreadsheet,
  Cake,
  Gift,
  PartyPopper,
} from 'lucide-react';
import { Member, MemberStatus, Celula, Congregation } from '../../types';
import { MemberCardModal } from '../MemberCardModal';
import { BatchImportMembersModal } from '../BatchImportMembersModal';

interface MembrosViewProps {
  members: Member[];
  celulas: Celula[];
  congregations: Congregation[];
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onBatchAddMembers?: (newMembers: Member[]) => void;
}

export const MembrosView: React.FC<MembrosViewProps> = ({
  members,
  celulas,
  congregations,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onBatchAddMembers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'todos'>('todos');
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>('todos');
  const [birthdayFilter, setBirthdayFilter] = useState<'todos' | 'mes' | 'hoje'>('todos');
  const [cardModalMember, setCardModalMember] = useState<Member | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  // Count month birthdays
  const monthBirthdaysCount = members.filter((m) => {
    if (!m.birthDate) return false;
    const parts = m.birthDate.split('-');
    if (parts.length < 2) return false;
    return parseInt(parts[1], 10) === currentMonth;
  }).length;

  const filteredMembers = members.filter((m) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(searchLower) ||
      m.email.toLowerCase().includes(searchLower) ||
      m.phone.includes(searchTerm) ||
      (m.role && m.role.toLowerCase().includes(searchLower)) ||
      (m.cpf && m.cpf.includes(searchTerm)) ||
      (m.address && m.address.toLowerCase().includes(searchLower)) ||
      (m.filiation && m.filiation.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === 'todos' || m.status === statusFilter;
    const matchesCongregation =
      selectedCongregationId === 'todos' || m.congregationId === selectedCongregationId;

    let matchesBirthday = true;
    if (birthdayFilter === 'mes' && m.birthDate) {
      const parts = m.birthDate.split('-');
      if (parts.length >= 2) {
        matchesBirthday = parseInt(parts[1], 10) === currentMonth;
      } else {
        matchesBirthday = false;
      }
    } else if (birthdayFilter === 'mes' && !m.birthDate) {
      matchesBirthday = false;
    } else if (birthdayFilter === 'hoje' && m.birthDate) {
      const parts = m.birthDate.split('-');
      if (parts.length === 3) {
        matchesBirthday =
          parseInt(parts[1], 10) === currentMonth && parseInt(parts[2], 10) === currentDay;
      } else {
        matchesBirthday = false;
      }
    } else if (birthdayFilter === 'hoje' && !m.birthDate) {
      matchesBirthday = false;
    }

    return matchesSearch && matchesStatus && matchesCongregation && matchesBirthday;
  });

  const getStatusBadge = (status: MemberStatus) => {
    switch (status) {
      case 'lider':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a68a64]/20 text-[#5a5a40] border border-[#a68a64]/30">Líder</span>;
      case 'membro':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5a5a40]/10 text-[#5a5a40] border border-[#5a5a40]/20">Membro</span>;
      case 'visitante':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Visitante</span>;
      case 'discipulado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Discipulado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Inativo</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#2a2a20] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#5a5a40]" />
            Gestão de Membros & Carteirinhas
          </h1>
          <p className="text-xs text-[#8a8a70] mt-1">
            Ficha cadastral completa com endereço, batismo, filiação, CPF e emissão de carteirinhas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2a2a20] hover:bg-[#1f1f18] text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            title="Importar 100, 500 ou mais membros via arquivo CSV/Excel"
          >
            <Upload className="w-4 h-4 text-[#a68a64]" />
            Importar em Massa (CSV)
          </button>
          <button
            onClick={onAddMember}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-[#a68a64]" />
            + Cadastrar Novo Membro
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a70]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF, endereço, e-mail..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#f5f5f0] border border-[#e0e0d0] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20 focus:bg-white text-[#2a2a20] placeholder-[#8a8a70]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-[#f5f5f0] p-1 rounded-xl text-xs border border-[#e0e0d0]">
            <Filter className="w-3.5 h-3.5 text-[#8a8a70] ml-1.5" />
            {(['todos', 'membro', 'visitante', 'lider', 'discipulado'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-medium text-[11px] capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-[#2a2a20] shadow-xs font-bold'
                    : 'text-[#8a8a70] hover:text-[#2a2a20]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Birthday Filter */}
          <div className="flex items-center gap-1 bg-amber-500/10 p-1 rounded-xl text-xs border border-amber-500/20">
            <Cake className="w-3.5 h-3.5 text-amber-700 ml-1.5" />
            <button
              onClick={() => setBirthdayFilter('todos')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                birthdayFilter === 'todos'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setBirthdayFilter('mes')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
                birthdayFilter === 'mes'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
              title="Filtrar aniversariantes deste mês"
            >
              🎂 Mês ({monthBirthdaysCount})
            </button>
            <button
              onClick={() => setBirthdayFilter('hoje')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                birthdayFilter === 'hoje'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
              title="Filtrar quem faz aniversário hoje"
            >
              🎉 Hoje
            </button>
          </div>

          <select
            value={selectedCongregationId}
            onChange={(e) => setSelectedCongregationId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#f5f5f0] border border-[#e0e0d0] text-xs font-medium text-[#2a2a20] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
          >
            <option value="todos">Todas as Congregações</option>
            {congregations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const memberCelula = celulas.find((c) => c.id === member.celulaId);
          const memberCongregation = congregations.find((c) => c.id === member.congregationId);

          return (
            <div
              key={member.id}
              className="p-5 rounded-2xl bg-white border border-[#e0e0d0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Profile Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        member.photoUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          member.name
                        )}&background=5a5a40&color=fff&size=128`
                      }
                      alt={member.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#a68a64]/40 shadow-xs bg-[#f5f5f0]"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-[#2a2a20] text-sm leading-snug">
                        {member.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {member.role ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5a5a40] text-white border border-[#5a5a40]">
                            {member.role}
                          </span>
                        ) : (
                          getStatusBadge(member.status)
                        )}
                        {member.cpf && (
                          <span className="text-[10px] text-[#8a8a70] bg-[#f5f5f0] px-1.5 py-0.5 rounded-md font-mono">
                            {member.cpf}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditMember(member)}
                      className="p-1.5 text-[#8a8a70] hover:text-[#5a5a40] rounded-lg hover:bg-[#f5f5f0]"
                      title="Editar Ficha"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMember(member.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Member Details */}
                <div className="mt-4 space-y-2 text-xs text-[#2a2a20]">
                  {member.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#a68a64] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-[#5a5a40]">{member.address}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8a8a70]">
                    {member.birthDate && (() => {
                      const parts = member.birthDate.split('-');
                      const isThisMonth = parts.length >= 2 && parseInt(parts[1], 10) === currentMonth;
                      return (
                        <div className={`flex items-center gap-1.5 ${isThisMonth ? 'text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200' : ''}`}>
                          <Cake className={`w-3.5 h-3.5 ${isThisMonth ? 'text-amber-600 animate-pulse' : 'text-[#a68a64]'}`} />
                          <span>Aniversário: <strong className={isThisMonth ? 'text-amber-900' : 'text-[#2a2a20]'}>{member.birthDate}</strong></span>
                        </div>
                      );
                    })()}

                    {member.baptismDate && (
                      <div className="flex items-center gap-1.5">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        <span>Batismo: <strong className="text-[#2a2a20]">{member.baptismDate}</strong></span>
                      </div>
                    )}
                  </div>

                  {member.filiation && (
                    <div className="flex items-start gap-2 text-[11px] text-[#8a8a70]">
                      <HeartHandshake className="w-3.5 h-3.5 text-[#a68a64] shrink-0 mt-0.5" />
                      <span className="line-clamp-1">Pais: <strong className="text-[#2a2a20]">{member.filiation}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Mail className="w-3.5 h-3.5 text-[#8a8a70]" />
                    <span className="truncate text-[#5a5a40]">{member.email || 'Sem e-mail'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#8a8a70]" />
                      <span>{member.phone || 'Sem telefone'}</span>
                    </div>
                    {memberCelula && (
                      <span className="text-[10px] bg-[#f5f5f0] text-[#5a5a40] px-2 py-0.5 rounded-md font-semibold border border-[#e0e0d0]">
                        {memberCelula.name}
                      </span>
                    )}
                  </div>

                  {memberCongregation && (
                    <div className="text-[10px] text-[#8a8a70] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#a68a64]" />
                      Congregação: {memberCongregation.name}
                    </div>
                  )}
                </div>

                {/* Ministries */}
                {member.ministries && member.ministries.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#f5f5f0] flex flex-wrap gap-1">
                    {member.ministries.map((min, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#f5f5f0] text-[#5a5a40] text-[10px] font-medium border border-[#e0e0d0]"
                      >
                        {min}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Card Validity & Digital Card Trigger */}
              <div className="mt-4 pt-3 border-t border-[#e0e0d0] flex items-center justify-between text-[11px]">
                <div className="text-[#8a8a70]">
                  {member.cardValidity ? (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Validade: {member.cardValidity}
                    </span>
                  ) : (
                    <span>Membro desde: {member.joinedAt}</span>
                  )}
                </div>

                <button
                  onClick={() => setCardModalMember(member)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] text-[11px] font-bold shadow-xs transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#a68a64]" />
                  Carteirinha
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#e0e0d0]">
          <Users className="w-12 h-12 text-[#8a8a70] mx-auto mb-3" />
          <h3 className="font-bold text-[#2a2a20] text-sm">Nenhum membro encontrado</h3>
          <p className="text-xs text-[#8a8a70] mt-1">
            Tente mudar os filtros de busca ou cadastre um novo membro.
          </p>
        </div>
      )}

      {/* Carteirinha Modal */}
      <MemberCardModal
        isOpen={!!cardModalMember}
        onClose={() => setCardModalMember(null)}
        member={cardModalMember}
        congregations={congregations}
      />

      {/* Batch Import Modal */}
      <BatchImportMembersModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onImportMembers={(newMembers) => {
          if (onBatchAddMembers) {
            onBatchAddMembers(newMembers);
          }
        }}
        congregations={congregations}
      />
    </div>
  );
};
