import React, { useState } from 'react';
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Filter,
  User,
  Shield,
} from 'lucide-react';
import { VolunteerRoster } from '../../types';

interface VoluntariosViewProps {
  rosters: VolunteerRoster[];
  onAddRoster: () => void;
  onUpdateStatus: (id: string, status: 'confirmado' | 'pendente' | 'recusado') => void;
}

export const VoluntariosView: React.FC<VoluntariosViewProps> = ({
  rosters,
  onAddRoster,
  onUpdateStatus,
}) => {
  const [ministryFilter, setMinistryFilter] = useState<string>('todos');

  const filteredRosters = rosters.filter((r) => {
    if (ministryFilter === 'todos') return true;
    return r.ministryName.toLowerCase().includes(ministryFilter.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-600" />
            Escala de Voluntários & Servidores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organização das equipes nos cultos e eventos da semana.
          </p>
        </div>

        <button
          onClick={onAddRoster}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-md shadow-sky-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Adicionar Voluntário na Escala
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80">
        <span className="text-xs font-bold text-slate-400 uppercase ml-2 mr-1">Filtrar por:</span>
        {['todos', 'Louvor', 'Mídia', 'Diaconato', 'Kids'].map((min) => (
          <button
            key={min}
            onClick={() => setMinistryFilter(min)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              ministryFilter === min
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {min}
          </button>
        ))}
      </div>

      {/* Rosters Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRosters.map((ros) => (
          <div
            key={ros.id}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900">
                  {ros.ministryName}
                </span>
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {ros.date}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mt-3">{ros.serviceName}</h3>

              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-800">{ros.volunteerName}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pl-6">Função: {ros.role}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                {ros.status === 'confirmado' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado
                  </span>
                )}
                {ros.status === 'pendente' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" /> Pendente
                  </span>
                )}
                {ros.status === 'recusado' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Substituir
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateStatus(ros.id, 'confirmado')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => onUpdateStatus(ros.id, 'recusado')}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-[10px] font-bold transition-all"
                >
                  Trocar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
