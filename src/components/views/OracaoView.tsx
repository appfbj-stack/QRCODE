import React, { useState } from 'react';
import {
  Flame,
  Heart,
  Plus,
  CheckCircle2,
  Clock,
  MessageCircle,
  Filter,
  Sparkles,
  Shield,
} from 'lucide-react';
import { PrayerRequest } from '../../types';

interface OracaoViewProps {
  prayers: PrayerRequest[];
  onAddPrayer: () => void;
  onPrayForRequest: (id: string) => void;
}

export const OracaoView: React.FC<OracaoViewProps> = ({
  prayers,
  onAddPrayer,
  onPrayForRequest,
}) => {
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_oracao' | 'atendido'>('todos');
  const [prayedSet, setPrayedSet] = useState<Set<string>>(new Set());

  const handlePrayClick = (id: string) => {
    onPrayForRequest(id);
    const newSet = new Set(prayedSet);
    newSet.add(id);
    setPrayedSet(newSet);
  };

  const filteredPrayers = prayers.filter((p) => {
    if (statusFilter === 'todos') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-500" />
            Mural de Oração & Intercessão
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            "A oração de um justo é poderosa e eficaz." (Tiago 5:16)
          </p>
        </div>

        <button
          onClick={onAddPrayer}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Pedir Oração
        </button>
      </div>

      {/* Filter Options */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 w-fit">
        {(['todos', 'em_oracao', 'atendido'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st === 'em_oracao' ? 'Em Oração' : st === 'atendido' ? 'Testemunhos / Atendidos' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Prayer Request Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPrayers.map((req) => {
          const hasPrayed = prayedSet.has(req.id);

          return (
            <div
              key={req.id}
              className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between ${
                req.status === 'atendido'
                  ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/30 to-white shadow-xs'
                  : 'border-slate-200/80 shadow-xs hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {req.category}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {req.date}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-3">{req.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{req.description}</p>

                {req.testimony && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Testemunho da Vitória:
                    </div>
                    <p className="italic">{req.testimony}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {req.isAnonymous ? 'Pedido Anônimo' : req.authorName}
                </span>

                <button
                  onClick={() => handlePrayClick(req.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    hasPrayed
                      ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-300'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${hasPrayed ? 'fill-rose-500' : ''}`} />
                  <span>{hasPrayed ? 'Você orou!' : 'Orei por isso'}</span>
                  <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
                    {req.prayedCount}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
