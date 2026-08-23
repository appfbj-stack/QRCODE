import React, { useState, useEffect } from 'react';
import {
  X,
  Home,
  User,
  Phone,
  Clock,
  MapPin,
  Users,
  Building2,
  CheckCircle2,
  Tag,
  Calendar,
} from 'lucide-react';
import { Celula, Congregation } from '../types';

interface CelulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (celulaData: Partial<Celula>) => void;
  initialData?: Celula | null;
  congregations: Congregation[];
}

const CATEGORIES: Array<'Jovens' | 'Casais' | 'Mista' | 'Mulheres' | 'Homens' | 'Kids'> = [
  'Jovens',
  'Casais',
  'Mista',
  'Mulheres',
  'Homens',
  'Kids',
];

const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export const CelulaModal: React.FC<CelulaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  congregations,
}) => {
  const [name, setName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [hostName, setHostName] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Quinta-feira');
  const [time, setTime] = useState('20:00h');
  const [category, setCategory] = useState<'Jovens' | 'Casais' | 'Mista' | 'Mulheres' | 'Homens' | 'Kids'>('Jovens');
  const [membersCount, setMembersCount] = useState<number>(10);
  const [congregationId, setCongregationId] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setLeaderName(initialData.leaderName || '');
      setLeaderPhone(initialData.leaderPhone || '');
      setHostName(initialData.hostName || '');
      setAddress(initialData.address || '');
      setNeighborhood(initialData.neighborhood || '');
      setDayOfWeek(initialData.dayOfWeek || 'Quinta-feira');
      setTime(initialData.time || '20:00h');
      setCategory(initialData.category || 'Jovens');
      setMembersCount(initialData.membersCount || 10);
      setCongregationId(initialData.congregationId || congregations[0]?.id || '');
    } else {
      setName('');
      setLeaderName('');
      setLeaderPhone('');
      setHostName('');
      setAddress('');
      setNeighborhood('');
      setDayOfWeek('Quinta-feira');
      setTime('20:00h');
      setCategory('Jovens');
      setMembersCount(10);
      setCongregationId(congregations[0]?.id || '');
    }
  }, [initialData, isOpen, congregations]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      name: name || 'Célula Kairos',
      leaderName,
      leaderPhone,
      hostName: hostName || leaderName,
      address,
      neighborhood,
      dayOfWeek,
      time,
      category,
      membersCount: Number(membersCount) || 1,
      congregationId: congregationId || congregations[0]?.id || 'cong-1',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-900">
                {initialData ? 'Editar Célula' : 'Cadastrar Nova Célula'}
              </h2>
              <p className="text-xs text-slate-500">
                Preencha as informações para {initialData ? 'atualizar' : 'criar'} a célula/pequeno grupo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Nome da Célula & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-amber-500" />
                Nome da Célula *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Célula Atos, Célula Shammah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Líder & Telefone do Líder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-500" />
                Nome do Líder *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Pr. Marcos Silva"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                Telefone / WhatsApp do Líder
              </label>
              <input
                type="text"
                placeholder="(11) 99999-8888"
                value={leaderPhone}
                onChange={(e) => setLeaderPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Anfitrião & Participantes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-500" />
                Nome do Anfitrião (Quem recebe a Célula)
              </label>
              <input
                type="text"
                placeholder="Ex: Irmã Maria e Família"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                Quantidade de Participantes
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={membersCount}
                onChange={(e) => setMembersCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Dia da Semana & Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Dia do Encontro
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Horário
              </label>
              <input
                type="text"
                placeholder="Ex: 20:00h ou 19:30h"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Endereço & Bairro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Endereço
              </label>
              <input
                type="text"
                placeholder="Rua das Flores, 123"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Bairro
              </label>
              <input
                type="text"
                placeholder="Ex: Centro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Congregação Pertencente */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              Congregação
            </label>
            <select
              value={congregationId}
              onChange={(e) => setCongregationId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
            >
              {congregations.map((cong) => (
                <option key={cong.id} value={cong.id}>
                  {cong.name}
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-200 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialData ? 'Salvar Alterações' : 'Criar Célula'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
