import React, { useState } from 'react';
import {
  Users,
  Home,
  DollarSign,
  Calendar,
  Flame,
  BookOpen,
  ArrowUpRight,
  Plus,
  Heart,
  TrendingUp,
  Award,
  Building2,
  Cake,
  Gift,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Member,
  Celula,
  EventItem,
  FinancialTransaction,
  PrayerRequest,
  Sermon,
  Congregation,
  ViewMode,
} from '../../types';

interface DashboardViewProps {
  members: Member[];
  celulas: Celula[];
  events: EventItem[];
  finances: FinancialTransaction[];
  prayers: PrayerRequest[];
  sermons: Sermon[];
  congregations: Congregation[];
  onNavigate: (view: ViewMode) => void;
  onQuickAction: (actionType: string) => void;
  onPrayForRequest: (id: string) => void;
}

interface BirthdayMember extends Member {
  bdayThisYear: Date;
  age: number;
  formattedDate: string;
  isToday: boolean;
  dayName: string;
}

const getWeekBirthdays = (membersList: Member[], congId: string): BirthdayMember[] => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Sunday of current week
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);

  // Saturday of current week
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  const currentYear = now.getFullYear();

  const filtered = congId && congId !== 'all'
    ? membersList.filter((m) => m.congregationId === congId)
    : membersList;

  const results: BirthdayMember[] = [];

  for (const member of filtered) {
    if (!member.birthDate) continue;

    let birthYear = 1990;
    let birthMonth = 1;
    let birthDay = 1;

    if (member.birthDate.includes('-')) {
      const parts = member.birthDate.split('-');
      if (parts.length === 3) {
        birthYear = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10);
        birthDay = parseInt(parts[2], 10);
      }
    } else if (member.birthDate.includes('/')) {
      const parts = member.birthDate.split('/');
      if (parts.length === 3) {
        birthDay = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10);
        birthYear = parseInt(parts[2], 10);
      }
    }

    if (isNaN(birthMonth) || isNaN(birthDay) || birthMonth < 1 || birthMonth > 12) continue;

    let bdayThisYear = new Date(currentYear, birthMonth - 1, birthDay, 12, 0, 0);

    if (bdayThisYear < sunday && sunday.getMonth() === 11) {
      bdayThisYear = new Date(currentYear + 1, birthMonth - 1, birthDay, 12, 0, 0);
    } else if (bdayThisYear > saturday && saturday.getMonth() === 0) {
      bdayThisYear = new Date(currentYear - 1, birthMonth - 1, birthDay, 12, 0, 0);
    }

    if (bdayThisYear >= sunday && bdayThisYear <= saturday) {
      const isToday =
        now.getFullYear() === bdayThisYear.getFullYear() &&
        now.getMonth() === bdayThisYear.getMonth() &&
        now.getDate() === bdayThisYear.getDate();

      const age = currentYear - birthYear;
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const dayName = dayNames[bdayThisYear.getDay()];
      const formattedDate = `${String(birthDay).padStart(2, '0')}/${String(birthMonth).padStart(2, '0')}`;

      results.push({
        ...member,
        bdayThisYear,
        age,
        formattedDate,
        isToday,
        dayName,
      });
    }
  }

  return results.sort((a, b) => a.bdayThisYear.getTime() - b.bdayThisYear.getTime());
};

const ATTENDANCE_DATA = [
  { month: 'Jan', membros: 310, celulas: 12, dizimos: 18500 },
  { month: 'Fev', membros: 335, celulas: 14, dizimos: 21000 },
  { month: 'Mar', membros: 360, celulas: 15, dizimos: 19800 },
  { month: 'Abr', membros: 380, celulas: 16, dizimos: 22400 },
  { month: 'Mai', membros: 410, celulas: 17, dizimos: 24100 },
  { month: 'Jun', membros: 420, celulas: 18, dizimos: 26300 },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  celulas,
  events,
  finances,
  prayers,
  sermons,
  congregations,
  onNavigate,
  onQuickAction,
  onPrayForRequest,
}) => {
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>('all');

  const totalMembersCount = members.filter((m) => m.status === 'membro' || m.status === 'lider').length;
  const totalVisitorsCount = members.filter((m) => m.status === 'visitante').length;

  const totalReceitas = finances
    .filter((f) => f.type === 'receita')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDespesas = finances
    .filter((f) => f.type === 'despesa')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const saldoAtual = totalReceitas - totalDespesas;

  const featuredSermon = sermons[0];
  const pendingPrayers = prayers.filter((p) => p.status !== 'atendido');

  const birthdayMembers = getWeekBirthdays(members, selectedCongregationId);
  const selectedCongregationObj = congregations.find((c) => c.id === selectedCongregationId);

  const handleSendCongratulations = (member: BirthdayMember) => {
    const congName = congregations.find((c) => c.id === member.congregationId)?.name || 'Igreja Kairos';
    const cleanPhone = member.phone ? member.phone.replace(/\D/g, '') : '';
    const message = `A Paz do Senhor, ${member.name}! 🎉🎂 Parabéns pelo seu aniversário! Que Deus continue abençoando grandemente a sua vida, sua família e seu ministério na ${congName}! 🙌✨`;

    if (cleanPhone) {
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      alert(`Mensagem de parabéns copiada para a área de transferência:\n\n"${message}"`);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#5a5a40] text-[#f5f5f0] p-6 sm:p-8 shadow-xl border border-[#4d4d36]">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-[#a68a64]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4d4d36] text-[#a68a64] text-xs font-bold mb-3 border border-[#a68a64]/30">
            <Award className="w-3.5 h-3.5 text-[#a68a64]" />
            Visão Geral Pastoral & Administrativa
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
            Bem-vindo à Igreja Kairos
          </h1>
          <p className="text-[#e0d8c0] text-xs sm:text-sm mt-2 leading-relaxed">
            "Para tudo há uma ocasião certa, há um tempo certo para cada propósito debaixo do céu." (Eclesiastes 3:1)
          </p>

          <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => onQuickAction('membro')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a68a64] hover:bg-[#8f7451] text-[#2a2a20] font-extrabold text-xs transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Cadastrar Membro
            </button>
            <button
              onClick={() => onQuickAction('financas')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4d4d36] hover:bg-[#3d3d2a] text-[#f5f5f0] font-semibold text-xs border border-[#a68a64]/30 transition-all active:scale-95"
            >
              <DollarSign className="w-4 h-4 text-[#a68a64]" />
              Lançar Entrada/Saída
            </button>
            <button
              onClick={() => onQuickAction('oracao')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a68a64]/20 hover:bg-[#a68a64]/30 text-[#f5f5f0] font-semibold text-xs transition-all border border-[#a68a64]/30 active:scale-95"
            >
              <Flame className="w-4 h-4 text-[#a68a64]" />
              Pedido de Oração
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Membros */}
        <div
          onClick={() => onNavigate('membros')}
          className="p-5 rounded-2xl bg-white border border-[#e0e0d0] shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a8a70] uppercase tracking-wider">
              Membros Ativos
            </span>
            <div className="p-2.5 rounded-xl bg-[#f5f5f0] text-[#5a5a40] group-hover:bg-[#5a5a40] group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#2a2a20]">{totalMembersCount}</span>
            <span className="text-xs font-bold text-[#5a5a40] bg-[#f5f5f0] px-2 py-0.5 rounded-full border border-[#e0e0d0]">
              +{totalVisitorsCount} visitantes
            </span>
          </div>
          <p className="text-[11px] text-[#8a8a70] mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#5a5a40]" /> Crescimento constante
          </p>
        </div>

        {/* Total Células */}
        <div
          onClick={() => onNavigate('celulas')}
          className="p-5 rounded-2xl bg-white border border-[#e0e0d0] shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a8a70] uppercase tracking-wider">
              Células
            </span>
            <div className="p-2.5 rounded-xl bg-[#f5f5f0] text-[#a68a64] group-hover:bg-[#a68a64] group-hover:text-white transition-colors">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#2a2a20]">{celulas.length}</span>
            <span className="text-xs font-medium text-[#8a8a70]">Pequenos Grupos</span>
          </div>
          <p className="text-[11px] text-[#8a8a70] mt-2">
            Média de 15 pessoas por célula
          </p>
        </div>

        {/* Saldo Financeiro */}
        <div
          onClick={() => onNavigate('financas')}
          className="p-5 rounded-2xl bg-white border border-[#e0e0d0] shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a8a70] uppercase tracking-wider">
              Saldo em Caixa
            </span>
            <div className="p-2.5 rounded-xl bg-[#f5f5f0] text-[#5a5a40] group-hover:bg-[#5a5a40] group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-[#2a2a20]">
              R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-[#8a8a70] mt-2 flex items-center gap-1">
            <span className="text-[#5a5a40] font-bold">+R$ {totalReceitas.toLocaleString()}</span> entradas
          </p>
        </div>

        {/* Próximos Eventos */}
        <div
          onClick={() => onNavigate('eventos')}
          className="p-5 rounded-2xl bg-white border border-[#e0e0d0] shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a8a70] uppercase tracking-wider">
              Eventos Agendados
            </span>
            <div className="p-2.5 rounded-xl bg-[#f5f5f0] text-[#a68a64] group-hover:bg-[#a68a64] group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#2a2a20]">{events.length}</span>
            <span className="text-xs font-bold text-[#2a2a20] bg-[#a68a64]/20 px-2 py-0.5 rounded-full">
              Ativos
            </span>
          </div>
          <p className="text-[11px] text-[#8a8a70] mt-2 truncate">
            Próximo: {events[0]?.title || 'Conferência Kairos'}
          </p>
        </div>
      </div>

      {/* Main Grid: Chart & Prayer Wall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth & Finance Chart */}
        <div className="lg:col-span-2 p-6 rounded-[28px] bg-white border border-[#e0e0d0] shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif font-bold text-[#2a2a20] text-base">Evolução de Membros & Arrecadação</h2>
              <p className="text-xs text-[#8a8a70]">Crescimento constante do corpo e dos recursos</p>
            </div>
            <button
              onClick={() => onNavigate('financas')}
              className="text-xs font-bold text-[#5a5a40] hover:text-[#2a2a20] flex items-center gap-1"
            >
              Relatório Completo <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ATTENDANCE_DATA}>
                <defs>
                  <linearGradient id="colorMembros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5a5a40" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#5a5a40" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0d0" />
                <XAxis dataKey="month" stroke="#8a8a70" fontSize={11} tickLine={false} />
                <YAxis stroke="#8a8a70" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#5a5a40',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#f5f5f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="membros"
                  name="Membros"
                  stroke="#5a5a40"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMembros)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Prayer Wall Column */}
        <div className="p-6 rounded-[28px] bg-white border border-[#e0e0d0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f5f5f0] text-[#a68a64]">
                  <Flame className="w-4 h-4" />
                </div>
                <h2 className="font-serif font-bold text-[#2a2a20] text-base">Mural de Oração</h2>
              </div>
              <button
                onClick={() => onNavigate('oracao')}
                className="text-xs text-[#5a5a40] font-bold hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="space-y-3">
              {pendingPrayers.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl bg-[#f5f5f0] hover:bg-[#ecece0] transition-colors border border-[#e0e0d0]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#2a2a20] bg-[#a68a64]/20 px-2 py-0.5 rounded-full">
                      {req.category}
                    </span>
                    <span className="text-[10px] text-[#8a8a70]">{req.date}</span>
                  </div>
                  <h3 className="font-bold text-[#2a2a20] text-xs mt-2 line-clamp-1">
                    {req.title}
                  </h3>
                  <p className="text-[11px] text-[#8a8a70] line-clamp-2 mt-1">
                    {req.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-[#8a8a70] font-medium">
                      {req.isAnonymous ? 'Anônimo' : req.authorName}
                    </span>
                    <button
                      onClick={() => onPrayForRequest(req.id)}
                      className="flex items-center gap-1 text-[#5a5a40] font-bold hover:bg-[#5a5a40]/10 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Heart className="w-3.5 h-3.5 fill-[#a68a64] text-[#a68a64]" />
                      <span>{req.prayedCount} oraram</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onQuickAction('oracao')}
            className="w-full mt-4 py-2.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] font-bold text-xs text-center transition-colors shadow-sm"
          >
            + Enviar Pedido de Oração
          </button>
        </div>
      </div>

      {/* Card: Aniversariantes da Semana da Congregação */}
      <div className="p-6 rounded-[28px] bg-white border border-[#e0e0d0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e0e0d0]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#a68a64]/15 text-[#a68a64] border border-[#a68a64]/30">
              <Cake className="w-6 h-6 text-[#a68a64]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-[#2a2a20] text-lg">
                  Aniversariantes da Semana
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5a5a40] text-white">
                  {birthdayMembers.length}
                </span>
              </div>
              <p className="text-xs text-[#8a8a70] mt-0.5">
                Exibição automática dos membros que fazem aniversário na semana corrente (domingo a sábado)
              </p>
            </div>
          </div>

          {/* Congregation Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#f5f5f0] p-1.5 rounded-2xl border border-[#e0e0d0] min-w-[240px]">
            <Building2 className="w-4 h-4 text-[#a68a64] ml-2 shrink-0" />
            <select
              value={selectedCongregationId}
              onChange={(e) => setSelectedCongregationId(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-[#2a2a20] focus:outline-none cursor-pointer py-1 pr-2"
            >
              <option value="all">Todas as Congregações</option>
              {congregations.map((cong) => (
                <option key={cong.id} value={cong.id}>
                  {cong.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Celebrants Grid / List */}
        {birthdayMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {birthdayMembers.map((member) => {
              const cong = congregations.find((c) => c.id === member.congregationId);
              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl transition-all border relative flex flex-col justify-between gap-3 ${
                    member.isToday
                      ? 'bg-gradient-to-br from-[#fcf8f2] via-white to-[#f5f5f0] border-[#a68a64] shadow-md ring-2 ring-[#a68a64]/30'
                      : 'bg-[#f5f5f0] hover:bg-[#ecece0] border-[#e0e0d0]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-[#5a5a40] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                        {member.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-[#2a2a20] text-sm truncate">
                          {member.name}
                        </h3>
                        {member.isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#a68a64] text-white uppercase tracking-wider flex items-center gap-1 shadow-xs animate-pulse">
                            <Sparkles className="w-3 h-3" /> Hoje!
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="font-medium text-[#5a5a40]">
                          {member.role || (member.status === 'lider' ? 'Líder' : 'Membro')}
                        </span>
                        {selectedCongregationId === 'all' && cong && (
                          <span className="text-[10px] text-[#8a8a70] bg-white/80 px-1.5 py-0.5 rounded border border-[#e0e0d0]">
                            {cong.name.replace('Kairos ', '')}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs font-semibold text-[#8a8a70] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#a68a64]" />
                        <span>
                          {member.dayName}, {member.formattedDate}
                        </span>
                        <span className="text-[#a68a64] font-bold">
                          • {member.age} anos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#e0e0d0]/60 flex items-center justify-between">
                    <span className="text-[11px] text-[#8a8a70]">
                      {member.phone ? member.phone : 'Sem telefone'}
                    </span>
                    <button
                      onClick={() => handleSendCongratulations(member)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#a68a64]" />
                      <span>Parabenizar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#f5f5f0] rounded-2xl border border-dashed border-[#e0e0d0] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white text-[#a68a64] flex items-center justify-center mb-3 shadow-xs">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-[#2a2a20] text-sm">
              Nenhum aniversariante nesta semana
            </h3>
            <p className="text-xs text-[#8a8a70] mt-1 max-w-sm">
              Não há membros registrados fazendo aniversário nesta semana para a congregação:{' '}
              <span className="font-bold text-[#5a5a40]">
                {selectedCongregationId === 'all'
                  ? 'Todas as Congregações'
                  : selectedCongregationObj?.name || 'Selecionada'}
              </span>
            </p>
            <button
              onClick={() => onQuickAction('membro')}
              className="mt-4 px-4 py-2 rounded-xl bg-[#5a5a40] text-white text-xs font-bold hover:bg-[#4d4d36] transition-colors"
            >
              + Cadastrar Novo Membro
            </button>
          </div>
        )}
      </div>

      {/* Featured Sermon & Quick Module Navigation Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Featured Sermon */}
        {featuredSermon && (
          <div className="p-6 rounded-[28px] bg-[#5a5a40] text-[#f5f5f0] flex flex-col justify-between relative overflow-hidden border border-[#4d4d36]">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-[#a68a64] text-xs font-bold uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4" />
                Sermão em Destaque
              </div>
              <h2 className="text-xl font-serif font-bold text-white">{featuredSermon.title}</h2>
              <p className="text-xs text-[#e0d8c0] mt-1 font-medium">
                {featuredSermon.preacher} • {featuredSermon.biblePassage}
              </p>
              <p className="text-xs text-[#e0d8c0]/90 mt-3 leading-relaxed line-clamp-3">
                {featuredSermon.summary}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#4d4d36] relative z-10">
              <span className="text-[11px] text-[#e0d8c0]/80">
                Série: {featuredSermon.series || 'Mensagem Especial'}
              </span>
              <button
                onClick={() => onNavigate('sermoes')}
                className="px-4 py-2 rounded-xl bg-[#a68a64] hover:bg-[#8f7451] text-[#2a2a20] text-xs font-extrabold transition-all shadow-md"
              >
                Ouvir / Ler Esboço
              </button>
            </div>
          </div>
        )}

        {/* Quick Module Navigation Shortcuts */}
        <div className="p-6 rounded-[28px] bg-white border border-[#e0e0d0] shadow-xs">
          <h2 className="font-serif font-bold text-[#2a2a20] text-base mb-1">Acesso Rápido aos Módulos</h2>
          <p className="text-xs text-[#8a8a70] mb-4">Gerencie as áreas da igreja com 1 clique</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'membros', label: 'Membros', icon: Users, color: 'text-[#5a5a40] bg-[#f5f5f0]' },
              { id: 'celulas', label: 'Células', icon: Home, color: 'text-[#a68a64] bg-[#f5f5f0]' },
              { id: 'congregacoes', label: 'Congregações', icon: Building2, color: 'text-[#5a5a40] bg-[#f5f5f0]' },
              { id: 'financas', label: 'Finanças', icon: DollarSign, color: 'text-[#5a5a40] bg-[#f5f5f0]' },
              { id: 'voluntarios', label: 'Voluntários', icon: Users, color: 'text-[#a68a64] bg-[#f5f5f0]' },
              { id: 'chat', label: 'Chat da Igreja', icon: Users, color: 'text-[#5a5a40] bg-[#f5f5f0]' },
            ].map((mod) => (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id as ViewMode)}
                className="p-3 rounded-2xl bg-[#f5f5f0] hover:bg-[#ecece0] text-left transition-all border border-[#e0e0d0] flex flex-col justify-between h-24"
              >
                <div className={`w-8 h-8 rounded-xl ${mod.color} flex items-center justify-center border border-[#e0e0d0]`}>
                  <mod.icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-[#2a2a20]">{mod.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
