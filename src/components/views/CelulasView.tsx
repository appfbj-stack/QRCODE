import React, { useState } from 'react';
import {
  Home,
  Plus,
  MapPin,
  Clock,
  User,
  Phone,
  Users,
  Search,
  Tag,
  Building2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Celula, Congregation } from '../../types';
import { CelulaModal } from '../CelulaModal';

interface CelulasViewProps {
  celulas: Celula[];
  congregations: Congregation[];
  onAddCelula: (newCel: Partial<Celula>) => void;
  onUpdateCelula?: (updatedCel: Celula) => void;
  onDeleteCelula?: (id: string) => void;
}

export const CelulasView: React.FC<CelulasViewProps> = ({
  celulas,
  congregations,
  onAddCelula,
  onUpdateCelula,
  onDeleteCelula,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCelula, setEditingCelula] = useState<Celula | null>(null);

  const filteredCelulas = celulas.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.leaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'todas' || c.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleOpenCreateModal = () => {
    setEditingCelula(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (celula: Celula) => {
    setEditingCelula(celula);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: Partial<Celula>) => {
    if (editingCelula && onUpdateCelula) {
      onUpdateCelula({
        ...editingCelula,
        ...data,
        name: data.name || editingCelula.name,
      } as Celula);
    } else {
      onAddCelula(data);
    }
    setIsModalOpen(false);
    setEditingCelula(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a célula "${name}"?`)) {
      if (onDeleteCelula) {
        onDeleteCelula(id);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
            <Home className="w-6 h-6 text-amber-500" />
            Células & Pequenos Grupos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            "De casa em casa, comiam juntos com alegria e sinceridade de coração." (Atos 2:46)
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-200 transition-all self-start sm:self-auto cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Nova Célula
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, líder ou bairro..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {['todas', 'Jovens', 'Casais', 'Mista', 'Mulheres', 'Homens', 'Kids'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Células Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCelulas.map((cel) => {
          const congregation = congregations.find((cg) => cg.id === cel.congregationId);

          return (
            <div
              key={cel.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                      {cel.category}
                    </span>
                    <h3 className="font-bold text-slate-900 text-lg mt-2">{cel.name}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      <span>{cel.membersCount}</span>
                    </div>

                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => handleOpenEditModal(cel)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Editar Célula"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {onDeleteCelula && (
                        <button
                          onClick={() => handleDelete(cel.id, cel.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir Célula"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Líder:{' '}
                      <strong className="text-slate-800 font-semibold">{cel.leaderName}</strong>
                    </span>
                  </div>

                  {cel.leaderPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{cel.leaderPhone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-slate-800">
                      {cel.dayOfWeek} às {cel.time}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-800 font-medium">{cel.address}</p>
                      <p className="text-[11px] text-slate-400">{cel.neighborhood}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {congregation?.name || 'Igreja Kairos'}
                </span>
                <span className="text-amber-600 font-semibold">Anfitrião: {cel.hostName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Celula Modal */}
      <CelulaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCelula(null);
        }}
        onSave={handleSaveModal}
        initialData={editingCelula}
        congregations={congregations}
      />
    </div>
  );
};

