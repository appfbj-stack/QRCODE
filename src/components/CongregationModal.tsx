import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Phone, User, Users, Home, Clock, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Congregation } from '../types';

interface CongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (congregation: Omit<Congregation, 'id'> | Congregation) => void;
  initialData?: Congregation | null;
}

export const CongregationModal: React.FC<CongregationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [isHeadquarters, setIsHeadquarters] = useState(false);
  const [leadPastor, setLeadPastor] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [membersCount, setMembersCount] = useState<number>(0);
  const [celulasCount, setCelulasCount] = useState<number>(0);
  const [servicesSchedule, setServicesSchedule] = useState<string[]>([]);
  const [newSchedule, setNewSchedule] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setIsHeadquarters(initialData.isHeadquarters || false);
      setLeadPastor(initialData.leadPastor || '');
      setAddress(initialData.address || '');
      setCity(initialData.city || '');
      setPhone(initialData.phone || '');
      setMembersCount(initialData.membersCount || 0);
      setCelulasCount(initialData.celulasCount || 0);
      setServicesSchedule(initialData.servicesSchedule || ['Domingo 09:00h', 'Domingo 18:00h']);
    } else {
      setName('');
      setIsHeadquarters(false);
      setLeadPastor('');
      setAddress('');
      setCity('São Paulo - SP');
      setPhone('');
      setMembersCount(0);
      setCelulasCount(0);
      setServicesSchedule(['Domingo 09:00h', 'Domingo 18:00h', 'Quarta 19:30h']);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddSchedule = () => {
    if (newSchedule.trim()) {
      setServicesSchedule([...servicesSchedule, newSchedule.trim()]);
      setNewSchedule('');
    }
  };

  const handleRemoveSchedule = (index: number) => {
    setServicesSchedule(servicesSchedule.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      name,
      isHeadquarters,
      leadPastor: leadPastor || 'Pr. Responsável',
      address,
      city: city || 'São Paulo - SP',
      phone,
      membersCount: Number(membersCount) || 0,
      celulasCount: Number(celulasCount) || 0,
      servicesSchedule: servicesSchedule.length > 0 ? servicesSchedule : ['Domingo 10:00h'],
    };

    onSave(payload as Congregation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#f5f5f0] text-[#2a2a20] rounded-[28px] border border-[#e0e0d0] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#5a5a40] text-[#f5f5f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#4d4d36] text-[#a68a64] border border-[#a68a64]/30">
              <Building2 className="w-5 h-5 text-[#f5f5f0]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg leading-tight">
                {initialData ? 'Editar Congregação / Campus' : 'Nova Congregação / Campus'}
              </h2>
              <p className="text-xs text-[#e0d8c0]">
                {initialData ? 'Atualize as informações da igreja salvação' : 'Cadastre uma nova igreja no ecossistema Kairos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#e0d8c0] hover:bg-[#4d4d36] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Is Headquarters Switch */}
          <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#a68a64]" />
              <div>
                <p className="font-bold text-[#2a2a20]">Matriz / Sede Central</p>
                <p className="text-[11px] text-[#8a8a70]">
                  Marque se este campus é a sede principal do ministério
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isHeadquarters}
                onChange={(e) => setIsHeadquarters(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#e0e0d0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5a5a40]"></div>
            </label>
          </div>

          {/* Name & Lead Pastor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#2a2a20] mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#a68a64]" />
                Nome do Campus / Igreja *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Kairos Sede Central, Kairos Zone Sul"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 focus:border-[#5a5a40] outline-none text-[#2a2a20]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2a2a20] mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#a68a64]" />
                Pastor(es) Responsável(eis)
              </label>
              <input
                type="text"
                value={leadPastor}
                onChange={(e) => setLeadPastor(e.target.value)}
                placeholder="Ex: Pr. Lucas Andrade & Pra. Camila"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 focus:border-[#5a5a40] outline-none text-[#2a2a20]"
              />
            </div>
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#2a2a20] mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#a68a64]" />
                Endereço Completo
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Paulista, 1500 - Centro"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 focus:border-[#5a5a40] outline-none text-[#2a2a20]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2a2a20] mb-1.5">
                Cidade - UF
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo - SP"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 focus:border-[#5a5a40] outline-none text-[#2a2a20]"
              />
            </div>
          </div>

          {/* Phone & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[#2a2a20] mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#a68a64]" />
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 focus:border-[#5a5a40] outline-none text-[#2a2a20]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2a2a20] mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#5a5a40]" />
                Nº de Membros
              </label>
              <input
                type="number"
                min="0"
                value={membersCount}
                onChange={(e) => setMembersCount(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 focus:border-[#5a5a40] outline-none text-[#2a2a20]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2a2a20] mb-1.5 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-[#a68a64]" />
                Nº de Células
              </label>
              <input
                type="number"
                min="0"
                value={celulasCount}
                onChange={(e) => setCelulasCount(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 focus:border-[#5a5a40] outline-none text-[#2a2a20]"
              />
            </div>
          </div>

          {/* Horários dos Cultos */}
          <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0]">
            <label className="block font-bold text-[#2a2a20] mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#a68a64]" />
              Horários dos Cultos
            </label>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder="Ex: Domingo 18:00h ou Quarta 19:30h"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSchedule();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-[#f5f5f0] border border-[#e0e0d0] focus:bg-white text-xs text-[#2a2a20]"
              />
              <button
                type="button"
                onClick={handleAddSchedule}
                className="px-3 py-2 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {servicesSchedule.map((schedule, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#ecece0] text-[#2a2a20] font-semibold text-[11px]"
                >
                  {schedule}
                  <button
                    type="button"
                    onClick={() => handleRemoveSchedule(idx)}
                    className="text-[#8a8a70] hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {servicesSchedule.length === 0 && (
                <span className="text-[11px] text-[#8a8a70]">
                  Nenhum horário adicionado.
                </span>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#e0e0d0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e0e0d0] text-[#2a2a20] font-semibold hover:bg-[#e0e0d0]/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] font-bold shadow-md transition-all flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              {initialData ? 'Salvar Alterações' : 'Cadastrar Congregação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
