import React, { useState, useEffect } from 'react';
import { X, BookOpen, User, Calendar, Tag, Video, Volume2, FileText, Bookmark, Sparkles } from 'lucide-react';
import { Sermon } from '../types';

interface SermonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sermon: Omit<Sermon, 'id'> | Sermon) => void;
  initialData?: Sermon | null;
}

export const SermonModal: React.FC<SermonModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [preacher, setPreacher] = useState('');
  const [series, setSeries] = useState('');
  const [date, setDate] = useState('');
  const [biblePassage, setBiblePassage] = useState('');
  const [summary, setSummary] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [outlinePdfUrl, setOutlinePdfUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setPreacher(initialData.preacher || '');
      setSeries(initialData.series || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setBiblePassage(initialData.biblePassage || '');
      setSummary(initialData.summary || '');
      setVideoUrl(initialData.videoUrl || '');
      setAudioUrl(initialData.audioUrl || '');
      setOutlinePdfUrl(initialData.outlinePdfUrl || '');
      setTagsInput(initialData.tags ? initialData.tags.join(', ') : '');
    } else {
      setTitle('');
      setPreacher('');
      setSeries('');
      setDate(new Date().toISOString().split('T')[0]);
      setBiblePassage('');
      setSummary('');
      setVideoUrl('');
      setAudioUrl('');
      setOutlinePdfUrl('');
      setTagsInput('Fé, Graça, Palavra');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !preacher.trim() || !biblePassage.trim()) {
      alert('Por favor, preencha o Título, o Pregador e a Passagem Bíblica.');
      return;
    }

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: Sermon = {
      id: initialData ? initialData.id : `srm-${Date.now()}`,
      title: title.trim(),
      preacher: preacher.trim(),
      series: series.trim() || undefined,
      date: date || new Date().toISOString().split('T')[0],
      biblePassage: biblePassage.trim(),
      summary: summary.trim(),
      videoUrl: videoUrl.trim() || undefined,
      audioUrl: audioUrl.trim() || undefined,
      outlinePdfUrl: outlinePdfUrl.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : ['Pregação'],
      viewsCount: initialData ? initialData.viewsCount : 0,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e0d0]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#5a5a40]/10 text-[#5a5a40] border border-[#5a5a40]/20">
              <BookOpen className="w-6 h-6 text-[#5a5a40]" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-[#2a2a20]">
                {initialData ? 'Editar Pregação / Sermão' : 'Cadastrar Novo Sermão'}
              </h2>
              <p className="text-xs text-[#8a8a70]">
                {initialData
                  ? 'Atualize os dados e o esboço da pregação cadastrada'
                  : 'Registre um novo sermão ou mensagem para o acervo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8a8a70] hover:text-[#2a2a20] hover:bg-[#f5f5f0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#a68a64]" />
              Título do Sermão *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: O Milagre da Multiplicação, Graça Incondicional..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e0e0d0] text-sm text-[#2a2a20] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#a68a64]" />
                Pregador / Pregadora *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Pastor Lucas Andrade, Pra. Maria..."
                value={preacher}
                onChange={(e) => setPreacher(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-[#a68a64]" />
                Passagem Bíblica *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: João 3:16-18, Salmos 91:1-4"
                value={biblePassage}
                onChange={(e) => setBiblePassage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#a68a64]" />
                Data da Pregação
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#a68a64]" />
                Série / Tema (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Série Fé inabalável, Culto de Celebração"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#a68a64]" />
              Resumo / Esboço da Mensagem
            </label>
            <textarea
              rows={4}
              placeholder="Escreva os pontos principais, introdução e aplicação prática..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
                <Video className="w-3 h-3 text-red-500" />
                URL Vídeo (YouTube)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-blue-500" />
                URL Áudio / Podcast
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-600" />
                PDF Esboço / Link
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={outlinePdfUrl}
                onChange={(e) => setOutlinePdfUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#a68a64]" />
              Tags / Palavras-chave (separadas por vírgula)
            </label>
            <input
              type="text"
              placeholder="Fé, Milagres, Oração, Esperança"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#e0e0d0] text-xs text-[#2a2a20] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e0e0d0]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#e0e0d0] text-xs font-bold text-[#8a8a70] hover:bg-[#f5f5f0] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {initialData ? 'Salvar Alterações' : 'Cadastrar Sermão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
