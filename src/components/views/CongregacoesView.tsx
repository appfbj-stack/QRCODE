import React, { useState } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  User,
  Users,
  Home,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  Package,
  Calendar,
  Layers,
  ChevronRight,
  DollarSign,
  AlertTriangle,
  Pencil,
  CheckCircle2,
  Tag,
  Cake,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { Congregation, Member, Asset, EventItem } from '../../types';
import { CongregationModal } from '../CongregationModal';
import { AssetModal } from '../AssetModal';

interface CongregacoesViewProps {
  congregations: Congregation[];
  members: Member[];
  assets: Asset[];
  events: EventItem[];
  onAddCongregation: (congregation: Omit<Congregation, 'id'>) => void;
  onUpdateCongregation?: (congregation: Congregation) => void;
  onDeleteCongregation?: (id: string) => void;
  onAddAsset?: (asset: Partial<Asset>) => void;
  onUpdateAsset?: (asset: Asset) => void;
  onDeleteAsset?: (id: string) => void;
  onAddEvent?: () => void;
}

type CongSubTab = 'geral' | 'membros' | 'patrimonio' | 'agenda';

export const CongregacoesView: React.FC<CongregacoesViewProps> = ({
  congregations,
  members,
  assets,
  events,
  onAddCongregation,
  onUpdateCongregation,
  onDeleteCongregation,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onAddEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCongregationId, setSelectedCongregationId] = useState<string | 'todas'>('todas');
  const [activeTab, setActiveTab] = useState<CongSubTab>('geral');
  
  // Modals
  const [isCongregationModalOpen, setIsCongregationModalOpen] = useState(false);
  const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Asset Modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>('todas');

  // Member filter inside congregation
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Selected congregation object
  const currentCongregation = congregations.find((c) => c.id === selectedCongregationId);

  // Filtered lists for selected congregation
  const congregationMembers = members.filter(
    (m) => selectedCongregationId === 'todas' || m.congregationId === selectedCongregationId
  );
  
  const congregationAssets = assets.filter(
    (a) => selectedCongregationId === 'todas' || a.congregationId === selectedCongregationId
  );

  const congregationEvents = events.filter(
    (e) => selectedCongregationId === 'todas' || e.congregationId === selectedCongregationId
  );

  // Stats calculation
  const totalMembersAll = members.length;
  const totalAssetsValueAll = assets.reduce((acc, a) => acc + (a.estimatedValue || 0) * (a.quantity || 1), 0);
  const totalAssetsCountAll = assets.reduce((acc, a) => acc + (a.quantity || 1), 0);

  // Congregation Modal Handlers
  const handleOpenAddCongregation = () => {
    setEditingCongregation(null);
    setIsCongregationModalOpen(true);
  };

  const handleOpenEditCongregation = (cong: Congregation) => {
    setEditingCongregation(cong);
    setIsCongregationModalOpen(true);
  };

  const handleSaveCongregationModal = (data: Omit<Congregation, 'id'> | Congregation) => {
    if ('id' in data && data.id) {
      if (onUpdateCongregation) {
        onUpdateCongregation(data as Congregation);
      }
    } else {
      onAddCongregation(data as Omit<Congregation, 'id'>);
    }
  };

  const handleDeleteCongregationConfirm = (id: string) => {
    if (onDeleteCongregation) {
      onDeleteCongregation(id);
    }
    setDeleteConfirmId(null);
    if (selectedCongregationId === id) {
      setSelectedCongregationId('todas');
    }
  };

  // Asset Modal Handlers
  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    setIsAssetModalOpen(true);
  };

  const handleOpenEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAssetModalOpen(true);
  };

  const handleSaveAssetModal = (assetData: Partial<Asset>) => {
    if (editingAsset && onUpdateAsset) {
      onUpdateAsset({
        ...editingAsset,
        ...assetData,
      } as Asset);
    } else if (onAddAsset) {
      onAddAsset(assetData);
    }
    setIsAssetModalOpen(false);
    setEditingAsset(null);
  };

  const handleDeleteAsset = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover "${name}" do patrimônio?`)) {
      if (onDeleteAsset) {
        onDeleteAsset(id);
      }
    }
  };

  // Filtered Assets inside tab
  const filteredAssets = congregationAssets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
      (a.locationDetails || '').toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
      (a.notes || '').toLowerCase().includes(assetSearchTerm.toLowerCase());
    const matchesCat = assetCategoryFilter === 'todas' || a.category === assetCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Filtered Members inside tab
  const filteredMembers = congregationMembers.filter((m) => {
    const search = memberSearchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(search) ||
      m.email.toLowerCase().includes(search) ||
      m.phone.includes(search) ||
      (m.role || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Main Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-[#5a5a40] text-[#f5f5f0] shadow-md border border-[#4d4d36]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4d4d36] text-[#a68a64] text-xs font-bold mb-2 border border-[#a68a64]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#a68a64]" />
            Rede de Igrejas & Múltiplos Campuses
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-[#a68a64]" />
            Congregações Kairos
          </h1>
          <p className="text-xs sm:text-sm text-[#e0d8c0] mt-1">
            Gestão individualizada de Membros, Patrimônio/Bens e Agenda de Eventos para cada igreja.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAddCongregation}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a68a64] hover:bg-[#8f7451] text-[#2a2a20] font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Congregação
          </button>
        </div>
      </div>

      {/* Selector of Congregations (Tabs/Dropdown) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
          <button
            onClick={() => {
              setSelectedCongregationId('todas');
              setActiveTab('geral');
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              selectedCongregationId === 'todas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Todas as Igrejas ({congregations.length})</span>
          </button>

          {congregations.map((cong) => {
            const isSelected = selectedCongregationId === cong.id;
            return (
              <button
                key={cong.id}
                onClick={() => {
                  setSelectedCongregationId(cong.id);
                  if (selectedCongregationId === 'todas') setActiveTab('geral');
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-600'}`} />
                <span>{cong.name}</span>
                {cong.isHeadquarters && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[9px] uppercase tracking-wider font-extrabold ml-1">
                    Sede
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedCongregationId !== 'todas' && (
          <button
            onClick={() => setSelectedCongregationId('todas')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ver Todas
          </button>
        )}
      </div>

      {/* IF A SPECIFIC CONGREGATION IS SELECTED -> SHOW DETAILED CONGREGATION DASHBOARD WITH 4 SUB-TABS */}
      {selectedCongregationId !== 'todas' && currentCongregation && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Church Header Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                    {currentCongregation.isHeadquarters ? 'Matriz / Sede Principal' : 'Campus Filial'}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {currentCongregation.address}, {currentCongregation.city}
                  </span>
                </div>
                <h2 className="text-2xl font-serif font-bold text-slate-900 mt-2">
                  {currentCongregation.name}
                </h2>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  Pastor Responsável:{' '}
                  <strong className="text-slate-900 font-semibold">{currentCongregation.leadPastor}</strong>
                  {currentCongregation.phone && (
                    <span className="ml-3 flex items-center gap-1 text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                      {currentCongregation.phone}
                    </span>
                  )}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => handleOpenEditCongregation(currentCongregation)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                  Editar Dados da Igreja
                </button>
              </div>
            </div>

            {/* Sub-Tabs Bar: [Visão Geral] [Membros] [Patrimônio / Bens] [Agenda / Eventos] */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('geral')}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'geral'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Info className="w-4 h-4 text-amber-400" />
                <span>Visão Geral & Cultos</span>
              </button>

              <button
                onClick={() => setActiveTab('membros')}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'membros'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 text-sky-400" />
                <span>Membros ({congregationMembers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('patrimonio')}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'patrimonio'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4 text-amber-500" />
                <span>Patrimônio ({congregationAssets.reduce((acc, a) => acc + a.quantity, 0)} bens)</span>
              </button>

              <button
                onClick={() => setActiveTab('agenda')}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'agenda'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Agenda & Eventos ({congregationEvents.length})</span>
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: VISÃO GERAL */}
          {activeTab === 'geral' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
              {/* Stat Cards */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Membros Cadastrados</p>
                  <p className="text-2xl font-bold font-serif text-slate-900">{congregationMembers.length}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patrimônio / Bens</p>
                  <p className="text-2xl font-bold font-serif text-slate-900">
                    R$ {congregationAssets.reduce((acc, a) => acc + (a.estimatedValue || 0) * (a.quantity || 1), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eventos Agendados</p>
                  <p className="text-2xl font-bold font-serif text-slate-900">{congregationEvents.length}</p>
                </div>
              </div>

              {/* Worship Services Schedule */}
              <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Horários dos Cultos de Celebração
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentCongregation.servicesSchedule?.map((schedule, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-800">{schedule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Info Box */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xs">
                <h3 className="text-base font-bold font-serif flex items-center gap-2 mb-3 text-amber-400">
                  <Building2 className="w-4 h-4" />
                  Localização & Contato
                </h3>
                <div className="space-y-3 text-xs text-slate-300">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Endereço</span>
                    <p className="font-medium text-white">{currentCongregation.address}</p>
                    <p className="text-slate-400">{currentCongregation.city}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pastor Principal</span>
                    <p className="font-semibold text-white">{currentCongregation.leadPastor}</p>
                  </div>
                  {currentCongregation.phone && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Telefone</span>
                      <p className="font-semibold text-amber-300">{currentCongregation.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: MEMBROS DA CONGREGAÇÃO */}
          {activeTab === 'membros' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 ml-2" />
                  <input
                    type="text"
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    placeholder={`Buscar membro em ${currentCongregation.name}...`}
                    className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 py-1"
                  />
                </div>
                <div className="text-xs text-slate-500 font-semibold px-2">
                  Exibindo {filteredMembers.length} de {congregationMembers.length} membros
                </div>
              </div>

              {filteredMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-start gap-3.5"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 font-bold text-sm flex items-center justify-center shrink-0 border border-amber-200">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{member.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                              member.status === 'membro'
                                ? 'bg-emerald-100 text-emerald-800'
                                : member.status === 'lider'
                                ? 'bg-amber-100 text-amber-900'
                                : member.status === 'visitante'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {member.status}
                          </span>
                        </div>

                        {member.role && (
                          <p className="text-[11px] font-semibold text-amber-800 mt-0.5">{member.role}</p>
                        )}

                        <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                          {member.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{member.phone}</span>
                            </p>
                          )}
                          {member.birthDate && (
                            <p className="flex items-center gap-1.5">
                              <Cake className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Aniversário: {member.birthDate}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-700">Nenhum membro encontrado nesta igreja</p>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 3: PATRIMÔNIO & BENS DA IGREJA */}
          {activeTab === 'patrimonio' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header bar for patrimonio */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-600" />
                    Patrimônio de {currentCongregation.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mapeamento completo de equipamentos, móveis, instrumentos e estrutura da igreja.
                  </p>
                </div>

                <button
                  onClick={handleOpenAddAsset}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Cadastrar Item de Patrimônio
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total de Itens</span>
                  <p className="text-lg font-bold text-slate-900 font-serif mt-0.5">
                    {congregationAssets.reduce((acc, a) => acc + a.quantity, 0)} unidades
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Valor Estimado Total</span>
                  <p className="text-lg font-bold text-amber-800 font-serif mt-0.5">
                    R$ {congregationAssets.reduce((acc, a) => acc + (a.estimatedValue || 0) * (a.quantity || 1), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Em Excelente Estado</span>
                  <p className="text-lg font-bold text-emerald-700 font-serif mt-0.5">
                    {congregationAssets.filter((a) => a.condition === 'Excelente').length} categorias
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Necessitam Reparo</span>
                  <p className="text-lg font-bold text-rose-700 font-serif mt-0.5">
                    {congregationAssets.filter((a) => a.condition === 'Necessita Reparo' || a.condition === 'Danificado').length} itens
                  </p>
                </div>
              </div>

              {/* Asset Search & Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 ml-2" />
                  <input
                    type="text"
                    value={assetSearchTerm}
                    onChange={(e) => setAssetSearchTerm(e.target.value)}
                    placeholder="Buscar equipamento por nome, local ou nota..."
                    className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 py-1"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto max-w-full w-full sm:w-auto">
                  <button
                    onClick={() => setAssetCategoryFilter('todas')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer ${
                      assetCategoryFilter === 'todas'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todas
                  </button>
                  {['Equipamento de Som', 'Instrumento Musical', 'Mobiliário', 'Mídia/TI', 'Imóvel/Estrutura'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAssetCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 cursor-pointer ${
                        assetCategoryFilter === cat
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assets Grid / Cards */}
              {filteredAssets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {asset.category}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditAsset(asset)}
                              className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Editar Item"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id, asset.name)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 mt-2 font-serif">{asset.name}</h4>

                        <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-400 text-[11px]">Quantidade:</span>
                            <span className="font-bold text-slate-900">{asset.quantity} un.</span>
                          </div>

                          {asset.estimatedValue && (
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                              <span className="text-slate-400 text-[11px]">Valor Estimado:</span>
                              <span className="font-bold text-amber-800">
                                R$ {asset.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-400 text-[11px]">Estado:</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                asset.condition === 'Excelente'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : asset.condition === 'Bom'
                                  ? 'bg-sky-100 text-sky-800'
                                  : asset.condition === 'Necessita Reparo'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {asset.condition}
                            </span>
                          </div>

                          {asset.locationDetails && (
                            <div className="pt-1 flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{asset.locationDetails}</span>
                            </div>
                          )}

                          {asset.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-xl">
                              "{asset.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-700">Nenhum bem cadastrado nesta congregação</p>
                  <button
                    onClick={handleOpenAddAsset}
                    className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Cadastrar Bem Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 4: AGENDA & EVENTOS DA IGREJA */}
          {activeTab === 'agenda' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    Agenda & Eventos de {currentCongregation.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Conferências, cultos especiais, batismos e reuniões programadas para este campus.
                  </p>
                </div>

                {onAddEvent && (
                  <button
                    onClick={onAddEvent}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Agendar Novo Evento
                  </button>
                )}
              </div>

              {congregationEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {congregationEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {evt.type}
                          </span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {evt.time}
                          </span>
                        </div>

                        <h4 className="font-bold text-base text-slate-900 mt-2 font-serif">{evt.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{evt.description}</p>

                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Data</span>
                            <span className="font-bold text-slate-900">{evt.date}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Local</span>
                            <span className="font-semibold text-slate-700 truncate block">{evt.location}</span>
                          </div>
                        </div>
                      </div>

                      {evt.speaker && (
                        <p className="mt-3 text-[11px] font-medium text-amber-800 bg-amber-50 p-2 rounded-xl">
                          Preletor/Convidado: <strong>{evt.speaker}</strong>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-700">Nenhum evento agendado para esta igreja</p>
                  {onAddEvent && (
                    <button
                      onClick={onAddEvent}
                      className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agendar Evento Agora
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* IF 'TODAS AS IGREJAS' IS SELECTED -> RENDER GLOBAL GRID OF CONGREGATION CARDS */}
      {selectedCongregationId === 'todas' && (
        <div className="space-y-6">
          {/* Overview Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0] flex items-center gap-4 shadow-xs">
              <div className="p-3 rounded-xl bg-[#f5f5f0] text-[#5a5a40]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#8a8a70] uppercase">Total de Igrejas / Sede</p>
                <p className="text-xl font-bold font-serif text-[#2a2a20]">{congregations.length}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0] flex items-center gap-4 shadow-xs">
              <div className="p-3 rounded-xl bg-[#f5f5f0] text-[#a68a64]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#8a8a70] uppercase">Membros Cadastrados</p>
                <p className="text-xl font-bold font-serif text-[#2a2a20]">{totalMembersAll}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0] flex items-center gap-4 shadow-xs">
              <div className="p-3 rounded-xl bg-[#f5f5f0] text-[#5a5a40]">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#8a8a70] uppercase">Patrimônio Global</p>
                <p className="text-xl font-bold font-serif text-[#2a2a20]">
                  R$ {totalAssetsValueAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar congregação por nome, pastor, cidade ou endereço..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 py-1"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-500 hover:text-slate-800 px-3 font-semibold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Congregations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {congregations
              .filter((cong) => {
                const search = searchTerm.toLowerCase();
                return (
                  cong.name.toLowerCase().includes(search) ||
                  cong.leadPastor.toLowerCase().includes(search) ||
                  cong.city.toLowerCase().includes(search) ||
                  cong.address.toLowerCase().includes(search)
                );
              })
              .map((cong) => {
                const congMembersCount = members.filter((m) => m.congregationId === cong.id).length;
                const congAssetsList = assets.filter((a) => a.congregationId === cong.id);
                const congAssetsValue = congAssetsList.reduce((acc, a) => acc + (a.estimatedValue || 0) * (a.quantity || 1), 0);
                const congEventsCount = events.filter((e) => e.congregationId === cong.id).length;

                return (
                  <div
                    key={cong.id}
                    className={`p-6 rounded-[28px] bg-white border transition-all flex flex-col justify-between relative overflow-hidden group ${
                      cong.isHeadquarters
                        ? 'border-[#5a5a40] ring-2 ring-[#5a5a40]/20 shadow-md'
                        : 'border-slate-200 hover:border-amber-500 shadow-xs hover:shadow-md'
                    }`}
                  >
                    {/* Headquarters Badge */}
                    {cong.isHeadquarters && (
                      <div className="absolute top-0 right-0 bg-[#5a5a40] text-[#f5f5f0] text-[10px] font-extrabold uppercase px-3.5 py-1.5 rounded-bl-2xl flex items-center gap-1.5 tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#a68a64]" />
                        Matriz / Sede
                      </div>
                    )}

                    <div>
                      {/* Title & Actions */}
                      <div className="flex items-start justify-between pr-16">
                        <h2 className="text-xl font-bold font-serif text-slate-900">{cong.name}</h2>
                      </div>

                      {/* Information List */}
                      <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Pastor:{' '}
                            <strong className="text-slate-900 font-semibold">{cong.leadPastor}</strong>
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            {cong.address} - {cong.city}
                          </span>
                        </div>

                        {cong.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{cong.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Service Schedule Pills */}
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Cultos
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {cong.servicesSchedule?.map((sch, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-slate-50 text-slate-800 text-[11px] font-medium border border-slate-200/80"
                            >
                              {sch}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Stats & Direct Access to Tabs */}
                    <div className="mt-5">
                      <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center text-xs">
                        {/* Membros Button */}
                        <button
                          onClick={() => {
                            setSelectedCongregationId(cong.id);
                            setActiveTab('membros');
                          }}
                          className="p-2 rounded-xl bg-sky-50/80 hover:bg-sky-100 transition-colors cursor-pointer border border-sky-100"
                        >
                          <span className="text-[9px] text-sky-800 uppercase font-extrabold block">Membros</span>
                          <span className="text-sm font-bold text-sky-900 flex items-center justify-center gap-1 mt-0.5 font-serif">
                            <Users className="w-3.5 h-3.5 text-sky-600" />
                            {congMembersCount}
                          </span>
                        </button>

                        {/* Patrimônio Button */}
                        <button
                          onClick={() => {
                            setSelectedCongregationId(cong.id);
                            setActiveTab('patrimonio');
                          }}
                          className="p-2 rounded-xl bg-amber-50/80 hover:bg-amber-100 transition-colors cursor-pointer border border-amber-100"
                        >
                          <span className="text-[9px] text-amber-900 uppercase font-extrabold block">Patrimônio</span>
                          <span className="text-sm font-bold text-amber-900 flex items-center justify-center gap-1 mt-0.5 font-serif">
                            <Package className="w-3.5 h-3.5 text-amber-600" />
                            {congAssetsList.length} bens
                          </span>
                        </button>

                        {/* Agenda Button */}
                        <button
                          onClick={() => {
                            setSelectedCongregationId(cong.id);
                            setActiveTab('agenda');
                          }}
                          className="p-2 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-100"
                        >
                          <span className="text-[9px] text-emerald-800 uppercase font-extrabold block">Agenda</span>
                          <span className="text-sm font-bold text-emerald-900 flex items-center justify-center gap-1 mt-0.5 font-serif">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            {congEventsCount}
                          </span>
                        </button>
                      </div>

                      {/* Main Manage Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedCongregationId(cong.id);
                            setActiveTab('geral');
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Gerenciar Campus ({cong.name})</span>
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </button>

                        <button
                          onClick={() => handleOpenEditCongregation(cong)}
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Editar Congregação"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {deleteConfirmId === cong.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteCongregationConfirm(cong.id)}
                              className="px-2.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 cursor-pointer"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2.5 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                            >
                              Sair
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(cong.id)}
                            title="Excluir congregação"
                            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Congregation CRUD Modal */}
      <CongregationModal
        isOpen={isCongregationModalOpen}
        onClose={() => setIsCongregationModalOpen(false)}
        onSave={handleSaveCongregationModal}
        initialData={editingCongregation}
      />

      {/* Asset CRUD Modal */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setEditingAsset(null);
        }}
        onSave={handleSaveAssetModal}
        initialData={editingAsset}
        congregations={congregations}
        defaultCongregationId={selectedCongregationId !== 'todas' ? selectedCongregationId : undefined}
      />
    </div>
  );
};
