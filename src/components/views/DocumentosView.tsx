/**
 * DocumentosView.tsx
 *
 * Tela de gestão de documentos da rede:
 *  - Upload de PDF/imagem (até 20 MB) com drag-and-drop
 *  - Lista global com filtros (tipo, membro, busca)
 *  - Cada card mostra: ícone por tipo, título, arquivo, tamanho, quem subiu, quando
 *  - Ações: abrir/baixar, deletar
 *
 * Documentos ficam salvos no servidor (Postgres) e os arquivos no diretório /uploads.
 * Cada um pode estar atrelado a um membro (certidão de batismo, obreiro, crachá) ou solto.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  FileText, Upload, Search, Filter, Trash2, Download, ExternalLink,
  File, Image as ImageIcon, User, Calendar, X, AlertCircle, Sparkles,
  Edit2,
} from 'lucide-react';
import { KairosDocument, DocumentType, Member } from '../../types';
import { dataService } from '../../services/dataService';

interface DocumentosViewProps {
  documents: KairosDocument[];
  members: Member[];
  onReload: () => Promise<void> | void;
  /** Quando aberto dentro do MemberModal, esconde o filtro de membro e fixa nesse */
  fixedMemberId?: string;
  /** Quando aberto dentro do MemberModal, esconde o seletor de membro */
  hideMemberSelect?: boolean;
}

const TYPE_LABEL: Record<DocumentType, string> = {
  BATISMO: 'Certidão de Batismo',
  OBREIRO: 'Certidão de Obreiro',
  CRACHA: 'Crachá',
  EQUIPAMENTO: 'Equipamento (manual, NF)',
  OUTRO: 'Outro',
};

const TYPE_COLOR: Record<DocumentType, string> = {
  BATISMO: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  OBREIRO: 'bg-purple-100 text-purple-700 border-purple-300',
  CRACHA: 'bg-amber-100 text-amber-700 border-amber-300',
  EQUIPAMENTO: 'bg-blue-100 text-blue-700 border-blue-300',
  OUTRO: 'bg-slate-100 text-slate-700 border-slate-300',
};

const TYPE_ICON: Record<DocumentType, React.ElementType> = {
  BATISMO: Sparkles,
  OBREIRO: Sparkles,
  CRACHA: User,
  EQUIPAMENTO: FileText,
  OUTRO: File,
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) { return mime.startsWith('image/'); }

export const DocumentosView: React.FC<DocumentosViewProps> = ({
  documents,
  members,
  onReload,
  fixedMemberId,
  hideMemberSelect,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [memberFilter, setMemberFilter] = useState<string>(fixedMemberId || 'all');

  // Upload modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<DocumentType>('BATISMO');
  const [uploadMemberId, setUploadMemberId] = useState<string>(fixedMemberId || '');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete
  const [deleteConfirm, setDeleteConfirm] = useState<KairosDocument | null>(null);

  // Edit modal
  const [editingDoc, setEditingDoc] = useState<KairosDocument | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string; type: DocumentType; memberId: string }>({
    title: '', description: '', type: 'OUTRO', memberId: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Toast (feedback discreto)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  // ─────────────────────────────────────────────────────────
  // Filtros
  // ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    return documents.filter((d) => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      const mid = fixedMemberId || memberFilter;
      if (mid !== 'all' && (d.memberId ?? '') !== mid) return false;
      if (t) {
        const hay = `${d.title} ${d.fileName} ${d.description ?? ''} ${d.memberName ?? ''}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [documents, search, typeFilter, memberFilter, fixedMemberId]);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    let totalSize = 0;
    documents.forEach((d) => {
      byType[d.type] = (byType[d.type] || 0) + 1;
      totalSize += d.fileSize;
    });
    return { total: documents.length, byType, totalSize };
  }, [documents]);

  // ─────────────────────────────────────────────────────────
  // Upload
  // ─────────────────────────────────────────────────────────
  const resetUpload = () => {
    setUploadTitle(''); setUploadType('BATISMO'); setUploadMemberId(fixedMemberId || '');
    setUploadDescription(''); setSelectedFile(null); setUploadError(null);
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const submitUpload = async () => {
    if (!selectedFile) {
      setUploadError('Selecione um arquivo');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Título é obrigatório');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle.trim());
      formData.append('type', uploadType);
      if (uploadMemberId) formData.append('memberId', uploadMemberId);
      if (uploadDescription) formData.append('description', uploadDescription);

      const token = localStorage.getItem('kairos_token');
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);

      setIsUploadOpen(false);
      resetUpload();
      showToast('Documento enviado', 'success');
      await onReload();
    } catch (e: any) {
      setUploadError(e.message || 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (d: KairosDocument) => {
    try {
      await dataService.remove('documents', d.id);
      setDeleteConfirm(null);
      showToast('Documento removido', 'success');
      await onReload();
    } catch (e: any) {
      showToast(e.message || 'Erro ao deletar', 'error');
    }
  };

  const openEdit = (d: KairosDocument) => {
    setEditingDoc(d);
    setEditForm({
      title: d.title,
      description: d.description || '',
      type: d.type,
      memberId: d.memberId || '',
    });
  };

  const handleEditSave = async () => {
    if (!editingDoc) return;
    if (!editForm.title.trim()) {
      showToast('Título é obrigatório', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      await dataService.request(`/documents/${editingDoc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          type: editForm.type,
          memberId: editForm.memberId || null,
        }),
      });
      setEditingDoc(null);
      showToast('Alterações salvas', 'success');
      await onReload();
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f5f0] overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-5 bg-white border-b border-[#e8e4d8]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#2a2a20] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#a68a64]" />
              Documentos
            </h1>
            <p className="text-xs text-[#7a7060] mt-1">
              Certidões, crachás, manuais de equipamento. Upload de PDF ou imagem (até 20 MB).
            </p>
          </div>
          <button
            onClick={() => { resetUpload(); setIsUploadOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] rounded-2xl text-sm font-bold shadow-md"
          >
            <Upload className="w-4 h-4" />
            Upload de Documento
          </button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mt-5">
          <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">{stats.total}</span>
            <span className="text-slate-500">documentos</span>
          </div>
          <div className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
            <Download className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">{formatBytes(stats.totalSize)}</span>
            <span className="text-slate-500">armazenados</span>
          </div>
          {(['BATISMO', 'OBREIRO', 'CRACHA', 'EQUIPAMENTO', 'OUTRO'] as DocumentType[]).map((t) => (
            stats.byType[t] ? (
              <div key={t} className="px-3 py-2 rounded-2xl bg-white border border-[#e8e4d8] flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${TYPE_COLOR[t]}`}>
                  {TYPE_LABEL[t]}
                </span>
                <span className="font-bold text-[#2a2a20]">{stats.byType[t]}</span>
              </div>
            ) : null
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 bg-[#faf8f0] border-b border-[#e8e4d8] flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-[#a68a64] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, arquivo ou membro..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm text-[#2a2a20] focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none"
        >
          <option value="all">Todos os tipos</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {!hideMemberSelect && (
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            disabled={!!fixedMemberId}
            className="px-3 py-2.5 rounded-2xl bg-white border border-[#e8e4d8] text-sm font-semibold text-[#2a2a20] focus:border-[#a68a64] outline-none disabled:opacity-50"
          >
            <option value="all">Todos os membros</option>
            <option value="">🌐 Sem membro (solto)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-[#e8e4d8] p-12 text-center">
            <FileText className="w-12 h-12 text-[#a68a64] mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-serif font-bold text-[#2a2a20] mb-1">Nenhum documento</h3>
            <p className="text-sm text-[#7a7060] mb-5">Faça upload do primeiro certificado ou manual.</p>
            <button
              onClick={() => { resetUpload(); setIsUploadOpen(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5a5a40] hover:bg-[#4d4d36] text-white rounded-2xl text-sm font-bold shadow-md"
            >
              <Upload className="w-4 h-4" />
              Fazer Upload
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <DocumentCard
                key={d.id}
                doc={d}
                onDelete={() => setDeleteConfirm(d)}
                onEdit={() => openEdit(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <UploadModal
          isOpen={isUploadOpen}
          uploading={uploading}
          error={uploadError}
          title={uploadTitle}
          type={uploadType}
          memberId={uploadMemberId}
          description={uploadDescription}
          selectedFile={selectedFile}
          dragOver={dragOver}
          fileInputRef={fileInputRef}
          members={members}
          fixedMemberId={fixedMemberId}
          onClose={() => { setIsUploadOpen(false); resetUpload(); }}
          onTitleChange={setUploadTitle}
          onTypeChange={setUploadType}
          onMemberChange={setUploadMemberId}
          onDescriptionChange={setUploadDescription}
          onFileSelect={handleFile}
          onDragOver={setDragOver}
          onSubmit={submitUpload}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Remover documento?
            </h2>
            <p className="text-sm text-[#5a5a40] mb-1">
              <strong>{deleteConfirm.title}</strong>
            </p>
            <p className="text-xs text-[#7a7060] mb-5">
              O arquivo <code className="bg-slate-100 px-1 rounded">{deleteConfirm.fileName}</code> será removido do servidor.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-md"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <EditDocumentModal
          doc={editingDoc}
          form={editForm}
          saving={savingEdit}
          members={members}
          hideMemberSelect={hideMemberSelect}
          onClose={() => setEditingDoc(null)}
          onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
          onSave={handleEditSave}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] transition-all">
          <div className={`px-4 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}>
            <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Sub-componentes
// ═══════════════════════════════════════════════════════════

const DocumentCard: React.FC<{ doc: KairosDocument; onDelete: () => void; onEdit: () => void }> = ({ doc, onDelete, onEdit }) => {
  const Icon = TYPE_ICON[doc.type] || File;
  const isImg = isImage(doc.mimeType);

  return (
    <div className="bg-white rounded-2xl border border-[#e8e4d8] shadow-sm hover:shadow-md transition-shadow group flex gap-3 p-3">
      {/* Thumbnail compacto */}
      <a
        href={doc.url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center"
        title="Abrir arquivo"
      >
        {isImg ? (
          <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-7 h-7 text-[#a68a64]" />
        )}
      </a>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2">
          <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-extrabold tracking-wider uppercase ${TYPE_COLOR[doc.type]}`}>
            {TYPE_LABEL[doc.type]}
          </span>
          <h3 className="font-bold text-sm text-[#2a2a20] truncate flex-1" title={doc.title}>{doc.title}</h3>
        </div>

        {doc.description && (
          <p className="text-[11px] text-[#7a7060] mt-1 truncate" title={doc.description}>{doc.description}</p>
        )}

        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#7a7060]">
          <span className="truncate" title={doc.fileName}>📎 {doc.fileName}</span>
          <span>·</span>
          <span>{formatBytes(doc.fileSize)}</span>
          {doc.memberName && (
            <>
              <span>·</span>
              <span className="truncate flex items-center gap-0.5" title={doc.memberName}>
                <User className="w-2.5 h-2.5" /> {doc.memberName}
              </span>
            </>
          )}
        </div>
        <div className="text-[10px] text-[#7a7060] flex items-center gap-1 mt-0.5">
          <Calendar className="w-2.5 h-2.5" /> {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
          {doc.uploadedByName && <span> · {doc.uploadedByName}</span>}
        </div>

        {/* Ações */}
        <div className="mt-auto pt-2 flex items-center gap-1">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-[11px] font-bold"
            title="Abrir arquivo"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir
          </a>
          <a
            href={doc.url}
            download={doc.fileName}
            className="p-1 rounded-lg text-[#7a7060] hover:bg-[#f5f0e0] hover:text-[#5a5a40]"
            title="Baixar"
          >
            <Download className="w-3 h-3" />
          </a>
          <button
            onClick={onEdit}
            className="p-1 rounded-lg text-[#a68a64] hover:bg-[#a68a64]/10 hover:text-[#5a5a40]"
            title="Editar"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
            title="Excluir"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadModal: React.FC<{
  isOpen: boolean;
  uploading: boolean;
  error: string | null;
  title: string;
  type: DocumentType;
  memberId: string;
  description: string;
  selectedFile: File | null;
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  members: Member[];
  fixedMemberId?: string;
  onClose: () => void;
  onTitleChange: (v: string) => void;
  onTypeChange: (v: DocumentType) => void;
  onMemberChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onFileSelect: (f: File) => void;
  onDragOver: (v: boolean) => void;
  onSubmit: () => void;
}> = ({
  isOpen, uploading, error, title, type, memberId, description, selectedFile, dragOver,
  fileInputRef, members, fixedMemberId,
  onClose, onTitleChange, onTypeChange, onMemberChange, onDescriptionChange, onFileSelect, onDragOver, onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#e8e4d8] flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#a68a64]" />
            Upload de Documento
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f0e0] text-[#7a7060]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); onDragOver(true); }}
            onDragLeave={() => onDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              onDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFileSelect(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-[#a68a64] bg-[#a68a64]/5' : 'border-[#e8e4d8] hover:border-[#a68a64]'
            }`}
          >
            {selectedFile ? (
              <div className="flex items-center gap-3">
                {selectedFile.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(selectedFile)} alt="" className="w-12 h-12 object-cover rounded-xl" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#a68a64]/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#a68a64]" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-sm text-[#2a2a20] truncate">{selectedFile.name}</p>
                  <p className="text-xs text-[#7a7060]">{formatBytes(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); }}
                  className="text-[#7a7060] hover:text-rose-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#a68a64] mx-auto mb-2" />
                <p className="font-bold text-sm text-[#2a2a20]">Arraste o arquivo aqui</p>
                <p className="text-xs text-[#7a7060] mt-1">ou clique para selecionar</p>
                <p className="text-[10px] text-[#7a7060] mt-2">PDF, JPEG, PNG ou WEBP · até 20 MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelect(f);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ex: Certidão de Batismo - João Silva"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Tipo *</label>
              <select
                value={type}
                onChange={(e) => onTypeChange(e.target.value as DocumentType)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Membro</label>
              <select
                value={memberId}
                onChange={(e) => onMemberChange(e.target.value)}
                disabled={!!fixedMemberId}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none disabled:opacity-50 disabled:bg-[#f5f0e0]"
              >
                <option value="">— Solto (sem membro) —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Descrição (opcional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Ex: Batismo realizado em 2020, Paróquia São Paulo"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e8e4d8] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={uploading || !selectedFile || !title.trim()}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-sm font-bold shadow-md disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Edit Document Modal (metadados)
// ═══════════════════════════════════════════════════════════
const EditDocumentModal: React.FC<{
  doc: KairosDocument;
  form: { title: string; description: string; type: DocumentType; memberId: string };
  saving: boolean;
  members: Member[];
  hideMemberSelect?: boolean;
  onClose: () => void;
  onChange: (patch: Partial<{ title: string; description: string; type: DocumentType; memberId: string }>) => void;
  onSave: () => void;
}> = ({ doc, form, saving, members, hideMemberSelect, onClose, onChange, onSave }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#e8e4d8] flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-[#a68a64]" />
            Editar documento
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f0e0] text-[#7a7060]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-[#7a7060]">
            <strong className="text-[#5a5a40]">Arquivo:</strong> {doc.fileName}
            <span className="mx-1.5">·</span>
            {formatBytes(doc.fileSize)}
          </p>
          <p className="text-[10px] text-[#a68a64] -mt-2">
            Para trocar o arquivo, remova este e faça novo upload.
          </p>

          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Ex: Certidão de Batismo - João Silva"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Tipo *</label>
              <select
                value={form.type}
                onChange={(e) => onChange({ type: e.target.value as DocumentType })}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {!hideMemberSelect && (
              <div>
                <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Membro</label>
                <select
                  value={form.memberId}
                  onChange={(e) => onChange({ memberId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] outline-none"
                >
                  <option value="">— Solto (sem membro) —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold tracking-widest text-[#7a7060] uppercase mb-1.5">Descrição (opcional)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Ex: Batismo realizado em 2020, Paróquia São Paulo"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#e8e4d8] text-sm focus:border-[#a68a64] focus:ring-2 focus:ring-[#a68a64]/20 outline-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e8e4d8] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f0e0] text-[#5a5a40] text-sm font-bold hover:bg-[#e8e0c8]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-sm font-bold shadow-md disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
