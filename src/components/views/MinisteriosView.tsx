import React from 'react';
import {
  Briefcase,
  Plus,
  Users,
  UserCheck,
  CheckSquare,
  Music,
  Smile,
  Video,
  HeartHandshake,
  Flame,
  HandHeart,
  ChevronRight,
} from 'lucide-react';
import { Ministry } from '../../types';

interface MinisteriosViewProps {
  ministries: Ministry[];
  onAddMinistry: () => void;
}

export const MinisteriosView: React.FC<MinisteriosViewProps> = ({
  ministries,
  onAddMinistry,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Music':
        return <Music className="w-5 h-5 text-indigo-600" />;
      case 'Smile':
        return <Smile className="w-5 h-5 text-amber-600" />;
      case 'Video':
        return <Video className="w-5 h-5 text-sky-600" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-5 h-5 text-emerald-600" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-600" />;
      case 'HandHeart':
        return <HandHeart className="w-5 h-5 text-purple-600" />;
      default:
        return <Briefcase className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-600" />
            Ministérios & Departamentos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Servindo ao Reino através dos dons e vocações dadas por Deus.
          </p>
        </div>

        <button
          onClick={onAddMinistry}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Novo Ministério
        </button>
      </div>

      {/* Ministries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ministries.map((min) => (
          <div
            key={min.id}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-slate-100">{getIcon(min.iconName)}</div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {min.membersCount} voluntários
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-lg mt-4">{min.name}</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{min.description}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Líder</span>
                <span className="font-semibold text-slate-800">{min.leaderName}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Demandas</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" /> {min.activeTasks} ativas
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
