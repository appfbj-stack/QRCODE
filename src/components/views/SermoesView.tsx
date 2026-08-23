import React, { useState } from 'react';
import {
  BookOpen,
  Play,
  User,
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Sermon } from '../../types';
import { SermonModal } from '../SermonModal';

interface SermoesViewProps {
  sermons: Sermon[];
  onAddSermon: (sermon: Sermon) => void;
  onUpdateSermon: (sermon: Sermon) => void;
  onDeleteSermon: (id: string) => void;
}

export const SermoesView: React.FC<SermoesViewProps> = ({
  sermons,
  onAddSermon,
  onUpdateSermon,
  onDeleteSermon,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSermon, setActiveSermon] = useState<Sermon | null>(sermons[0] || null);

  // Modal State for Create/Edit
  const [isSermonModalOpen, setIsSermonModalOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);

  const filteredSermons = sermons.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.preacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.biblePassage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.series && s.series.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenCreateModal = () => {
    setEditingSermon(null);
    setIsSermonModalOpen(true);
  };

  const handleOpenEditModal = (sermon: Sermon, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSermon(sermon);
    setIsSermonModalOpen(true);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Tem certeza de que deseja excluir este sermão do acervo?')) {
      onDeleteSermon(id);
      if (activeSermon?.id === id) {
        const remaining = sermons.filter((s) => s.id !== id);
        setActiveSermon(remaining[0] || null);
      }
    }
  };

  const handleSaveSermon = (sermonData: Sermon) => {
    if (editingSermon) {
      onUpdateSermon(sermonData);
      if (activeSermon?.id === sermonData.id) {
        setActiveSermon(sermonData);
      }
    } else {
      onAddSermon(sermonData);
      setActiveSermon(sermonData);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[#2a2a20] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#5a5a40]" />
            Acervo de Sermões & Pregações
          </h1>
          <p className="text-xs text-[#8a8a70] mt-1">
            Cadastre, edite, ouça mensagens e baixe esboços de pregações.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2a2a20] hover:bg-[#1f1f18] text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Criar Sermão
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8a8a70]" />
        <input
          type="text"
          placeholder="Buscar sermão por título, pregador, passagem ou série..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20] placeholder-[#8a8a70] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20 shadow-xs"
        />
      </div>

      {/* Featured Sermon Player & Active Selection */}
      {activeSermon && (
        <div className="p-6 rounded-3xl bg-[#2a2a20] text-white shadow-xl relative overflow-hidden border border-[#5a5a40]/40">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#a68a64]/30 text-amber-300 border border-[#a68a64]/50">
                  Sermão em Destaque
                </span>
                {activeSermon.series && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/10 text-slate-300">
                    {activeSermon.series}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold font-serif text-white">{activeSermon.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" /> {activeSermon.preacher}
                </span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">{activeSermon.biblePassage}</span>
                <span>•</span>
                <span>{activeSermon.date}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-2 whitespace-pre-line">
                {activeSermon.summary}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {activeSermon.tags.map((tg, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px]"
                  >
                    #{tg}
                  </span>
                ))}
              </div>

              {/* Action Buttons inside Banner */}
              <div className="pt-4 flex items-center gap-3 border-t border-white/10">
                <button
                  onClick={(e) => handleOpenEditModal(activeSermon, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-300" /> Editar Sermão
                </button>
                <button
                  onClick={(e) => handleDelete(activeSermon.id, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-300" /> Excluir
                </button>
              </div>
            </div>

            {/* Audio / Resource Controls */}
            <div className="w-full md:w-72 p-4 rounded-2xl bg-white/10 border border-white/10 text-center space-y-3 shrink-0 backdrop-blur-xs">
              <div className="w-12 h-12 rounded-full bg-[#a68a64] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#a68a64]/30 cursor-pointer hover:scale-105 transition-transform">
                <Play className="w-6 h-6 ml-0.5 fill-current" />
              </div>
              <p className="text-xs font-bold text-slate-200">Ouvir Mensagem em Áudio</p>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#a68a64] h-full w-1/3" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>08:42</span>
                <span>38:15</span>
              </div>

              {activeSermon.videoUrl && (
                <a
                  href={activeSermon.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver no YouTube
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sermons Archive List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-lg text-[#2a2a20]">
            Todas as Pregações ({filteredSermons.length})
          </h2>
          <button
            onClick={handleOpenCreateModal}
            className="text-xs font-bold text-[#5a5a40] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Nova
          </button>
        </div>

        {filteredSermons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSermons.map((sermon) => (
              <div
                key={sermon.id}
                onClick={() => setActiveSermon(sermon)}
                className={`p-6 rounded-3xl bg-white border cursor-pointer transition-all relative flex flex-col justify-between ${
                  activeSermon?.id === sermon.id
                    ? 'border-[#5a5a40] ring-2 ring-[#5a5a40]/20 shadow-md'
                    : 'border-[#e0e0d0] hover:border-[#a68a64] shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#8a8a70] mb-2">
                    <span className="font-semibold text-[#5a5a40]">{sermon.biblePassage}</span>
                    <span>{sermon.date}</span>
                  </div>

                  <h3 className="font-bold text-[#2a2a20] text-base">{sermon.title}</h3>
                  <p className="text-xs text-[#8a8a70] mt-1 font-medium">{sermon.preacher}</p>
                  <p className="text-xs text-[#5a5a40] mt-3 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {sermon.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e0e0d0] flex items-center justify-between text-[11px] text-[#8a8a70]">
                  <span className="truncate max-w-[130px]">{sermon.series || 'Mensagem Avulsa'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenEditModal(sermon, e)}
                      title="Editar Sermão"
                      className="p-1.5 rounded-lg hover:bg-[#f5f5f0] text-[#5a5a40] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(sermon.id, e)}
                      title="Excluir Sermão"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#e0e0d0]">
            <BookOpen className="w-10 h-10 text-[#a68a64] mx-auto mb-3" />
            <h3 className="font-serif font-bold text-[#2a2a20] text-base">
              Nenhum sermão encontrado
            </h3>
            <p className="text-xs text-[#8a8a70] mt-1">
              {searchTerm
                ? 'Tente mudar os termos de busca.'
                : 'Cadastre o primeiro sermão no acervo da igreja.'}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-[#5a5a40] text-white text-xs font-bold hover:bg-[#4d4d36] transition-colors cursor-pointer"
            >
              + Criar Sermão
            </button>
          </div>
        )}
      </div>

      {/* Sermon Create/Edit Modal */}
      <SermonModal
        isOpen={isSermonModalOpen}
        onClose={() => setIsSermonModalOpen(false)}
        onSave={handleSaveSermon}
        initialData={editingSermon}
      />
    </div>
  );
};

