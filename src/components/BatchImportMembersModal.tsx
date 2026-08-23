import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
  Sparkles,
  Building2,
  ArrowRight,
  Database,
  Info,
} from 'lucide-react';
import { Member, MemberStatus, Congregation } from '../types';

interface BatchImportMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMembers: (newMembers: Member[]) => void;
  congregations: Congregation[];
}

export const BatchImportMembersModal: React.FC<BatchImportMembersModalProps> = ({
  isOpen,
  onClose,
  onImportMembers,
  congregations,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'generator'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [defaultCongregationId, setDefaultCongregationId] = useState<string>(
    congregations[0]?.id || 'cong-1'
  );
  const [defaultStatus, setDefaultStatus] = useState<MemberStatus>('membro');
  const [parsedMembers, setParsedMembers] = useState<Partial<Member>[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [generatorCount, setGeneratorCount] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // CSV Parsing Logic
  const parseCSVContent = (content: string) => {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParsedMembers([]);
      return;
    }

    // Determine separator: tab, semicolon, or comma
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes('\t')) separator = '\t';
    else if (firstLine.includes(';')) separator = ';';

    let startIndex = 0;
    const headerCols = firstLine.split(separator).map((c) => c.replace(/^["']|["']$/g, '').trim().toLowerCase());

    // Check if line 0 is a header line
    const isHeader = headerCols.some(
      (col) =>
        col.includes('nome') ||
        col.includes('email') ||
        col.includes('telefone') ||
        col.includes('phone') ||
        col.includes('status') ||
        col.includes('cpf')
    );

    if (isHeader) {
      startIndex = 1;
    }

    const items: Partial<Member>[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(separator).map((c) => c.replace(/^["']|["']$/g, '').trim());

      if (cols.length === 0 || !cols[0]) continue;

      let name = cols[0];
      let email = '';
      let phone = '';
      let status: MemberStatus = defaultStatus;
      let birthDate = '';
      let cpf = '';
      let address = '';
      let role = '';

      if (isHeader) {
        headerCols.forEach((colName, idx) => {
          const val = cols[idx] || '';
          if (colName.includes('nome') || colName === 'name') name = val || name;
          else if (colName.includes('mail')) email = val;
          else if (colName.includes('telef') || colName.includes('cel') || colName === 'phone') phone = val;
          else if (colName.includes('status')) {
            const lower = val.toLowerCase();
            if (['lider', 'líder'].includes(lower)) status = 'lider';
            else if (['visitante'].includes(lower)) status = 'visitante';
            else if (['discipulado'].includes(lower)) status = 'discipulado';
            else if (['inativo'].includes(lower)) status = 'inativo';
            else status = 'membro';
          } else if (colName.includes('nasc') || colName.includes('birth')) birthDate = val;
          else if (colName.includes('cpf')) cpf = val;
          else if (colName.includes('ender') || colName.includes('address')) address = val;
          else if (colName.includes('cargo') || colName.includes('função') || colName.includes('role')) role = val;
        });
      } else {
        // Position-based fallback: Name, Email, Phone, Status, BirthDate, CPF, Address
        if (cols[1]) email = cols[1];
        if (cols[2]) phone = cols[2];
        if (cols[3]) {
          const lower = cols[3].toLowerCase();
          if (['lider', 'líder'].includes(lower)) status = 'lider';
          else if (['visitante'].includes(lower)) status = 'visitante';
          else if (['discipulado'].includes(lower)) status = 'discipulado';
          else if (['inativo'].includes(lower)) status = 'inativo';
        }
        if (cols[4]) birthDate = cols[4];
        if (cols[5]) cpf = cols[5];
        if (cols[6]) address = cols[6];
        if (cols[7]) role = cols[7];
      }

      items.push({
        name: name || `Membro ${i}`,
        email: email || '',
        phone: phone || '',
        status: status || defaultStatus,
        birthDate: birthDate || '',
        cpf: cpf || '',
        address: address || '',
        role: role || undefined,
        congregationId: defaultCongregationId,
        ministries: [],
        joinedAt: new Date().toISOString().split('T')[0],
      });
    }

    setParsedMembers(items);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseCSVContent(content);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePasteChange = (text: string) => {
    setPastedText(text);
    parseCSVContent(text);
  };

  // Generate 100 to 500 Realistic Members for instant testing/migration
  const handleGenerateSampleMembers = (count: number) => {
    setIsProcessing(true);
    const firstNames = [
      'Gabriel', 'Lucas', 'Mateus', 'Davii', 'Enzo', 'Pedro', 'Guilherme', 'Samuel', 'Felipe', 'Nicolas',
      'Arthur', 'Gustavo', 'Murilo', 'Henrique', 'João', 'Rafael', 'Daniel', 'Vitor', 'Leonardo', 'Thiago',
      'Maria', 'Ana', 'Julia', 'Sophia', 'Alice', 'Beatriz', 'Laura', 'Giovanna', 'Isabela', 'Manuela',
      'Mariana', 'Gabriela', 'Rafaela', 'Fernanda', 'Amanda', 'Camila', 'Larissa', 'Letícia', 'Carolina', 'Helena'
    ];
    const lastNames = [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
      'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
      'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas'
    ];
    const rolesList = ['Membro', 'Membro', 'Membro', 'Líder de Célula', 'Diácono', 'Diaconisa', 'Líder de Louvor', 'Professor EBD'];
    const statuses: MemberStatus[] = ['membro', 'membro', 'membro', 'membro', 'visitante', 'discipulado', 'lider'];

    const items: Partial<Member>[] = [];
    for (let i = 1; i <= count; i++) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln1 = lastNames[Math.floor(Math.random() * lastNames.length)];
      const ln2 = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fn} ${ln1} ${ln2}`;
      const email = `${fn.toLowerCase()}.${ln1.toLowerCase()}${i}@email.com`;
      const phone = `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const role = rolesList[Math.floor(Math.random() * rolesList.length)];
      
      const birthYear = 1970 + Math.floor(Math.random() * 35);
      const birthMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
      const birthDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
      const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

      const congId = congregations.length > 0 
        ? congregations[Math.floor(Math.random() * congregations.length)].id 
        : defaultCongregationId;

      items.push({
        name,
        email,
        phone,
        status,
        role,
        birthDate,
        cpf: `${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}`,
        address: `Rua das Flores, ${10 + i} - São Paulo - SP`,
        congregationId: congId,
        ministries: ['Acolhimento'],
        joinedAt: new Date().toISOString().split('T')[0],
      });
    }

    setParsedMembers(items);
    setIsProcessing(false);
  };

  const handleDownloadTemplate = () => {
    const headers = 'Nome,Email,Telefone,Status,DataNascimento,CPF,Endereco,Cargo\n';
    const sampleRow1 = 'Carlos Eduardo Silva,carlos.silva@email.com,(11) 98888-7777,membro,1985-06-15,123.456.789-00,"Av. Paulista, 1000 - SP",Diácono\n';
    const sampleRow2 = 'Mariana Oliveira Santos,mariana.santos@email.com,(11) 97777-6666,visitante,1992-11-20,234.567.890-11,"Rua Augusta, 450 - SP",Visitante\n';
    const sampleRow3 = 'Roberto Alves Mendes,roberto.mendes@email.com,(11) 96666-5555,lider,1978-03-10,345.678.901-22,"Rua Vergueiro, 800 - SP",Líder de Célula\n';

    const blob = new Blob([headers + sampleRow1 + sampleRow2 + sampleRow3], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_importacao_membros_kairos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = () => {
    if (parsedMembers.length === 0) return;

    setIsProcessing(true);

    const now = Date.now();
    const formattedMembers: Member[] = parsedMembers.map((m, index) => ({
      id: `mem-import-${now}-${index}`,
      name: m.name || `Membro Importado ${index + 1}`,
      email: m.email || '',
      phone: m.phone || '',
      status: m.status || defaultStatus,
      role: m.role || undefined,
      congregationId: m.congregationId || defaultCongregationId,
      ministries: m.ministries || [],
      birthDate: m.birthDate || undefined,
      baptismDate: m.baptismDate || undefined,
      address: m.address || undefined,
      filiation: m.filiation || undefined,
      cpf: m.cpf || undefined,
      cardValidity: m.cardValidity || undefined,
      photoUrl: m.photoUrl || undefined,
      joinedAt: m.joinedAt || new Date().toISOString().split('T')[0],
    }));

    onImportMembers(formattedMembers);

    setIsProcessing(false);
    setSuccessMessage(`${formattedMembers.length} membros importados com sucesso!`);
    setTimeout(() => {
      onClose();
      setSuccessMessage(null);
      setParsedMembers([]);
      setPastedText('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#e0e0d0] my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e0d0]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#5a5a40]/10 text-[#5a5a40] border border-[#5a5a40]/20">
              <Upload className="w-6 h-6 text-[#5a5a40]" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-[#2a2a20]">
                Importação em Massa de Membros
              </h2>
              <p className="text-xs text-[#8a8a70]">
                Migre 100, 500 ou mais membros de outro sistema via CSV, Excel ou lista rápida
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8a8a70] hover:text-[#2a2a20] hover:bg-[#f5f5f0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Configurations (Default Congregation & Status) */}
        <div className="mt-4 p-4 rounded-2xl bg-[#f5f5f0] border border-[#e0e0d0] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#a68a64]" />
              Congregação Padrão
            </label>
            <select
              value={defaultCongregationId}
              onChange={(e) => {
                setDefaultCongregationId(e.target.value);
                setParsedMembers((prev) =>
                  prev.map((item) => ({ ...item, congregationId: e.target.value }))
                );
              }}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e0d0] text-xs font-semibold text-[#2a2a20] focus:outline-none"
            >
              {congregations.map((cong) => (
                <option key={cong.id} value={cong.id}>
                  {cong.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2a2a20] uppercase mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#a68a64]" />
              Status Padrão
            </label>
            <select
              value={defaultStatus}
              onChange={(e) => {
                const newStatus = e.target.value as MemberStatus;
                setDefaultStatus(newStatus);
                setParsedMembers((prev) =>
                  prev.map((item) => ({ ...item, status: newStatus }))
                );
              }}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e0d0] text-xs font-semibold text-[#2a2a20] focus:outline-none"
            >
              <option value="membro">Membro</option>
              <option value="visitante">Visitante</option>
              <option value="lider">Líder</option>
              <option value="discipulado">Discipulado</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e0e0d0] mt-5 pb-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#5a5a40] text-white shadow-xs'
                : 'text-[#8a8a70] hover:text-[#2a2a20] hover:bg-[#f5f5f0]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            1. Enviar Planilha CSV
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-[#5a5a40] text-white shadow-xs'
                : 'text-[#8a8a70] hover:text-[#2a2a20] hover:bg-[#f5f5f0]'
            }`}
          >
            <FileText className="w-4 h-4" />
            2. Colar Texto / Excel
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-[#5a5a40] text-white shadow-xs'
                : 'text-[#8a8a70] hover:text-[#2a2a20] hover:bg-[#f5f5f0]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            3. Teste de Carga (100 a 500)
          </button>
        </div>

        {/* Tab 1: Upload CSV */}
        {activeTab === 'upload' && (
          <div className="mt-4 space-y-4">
            <div className="border-2 border-dashed border-[#e0e0d0] hover:border-[#a68a64] rounded-2xl p-8 text-center bg-[#f5f5f0]/50 transition-colors flex flex-col items-center justify-center relative">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-12 h-12 text-[#a68a64] mb-3" />
              <p className="font-bold text-[#2a2a20] text-sm">
                Arraste seu arquivo CSV ou clique aqui para selecionar
              </p>
              <p className="text-xs text-[#8a8a70] mt-1">
                Suporta colunas: Nome, Email, Telefone, Status, DataNascimento, CPF, Endereço, Cargo
              </p>
              {fileName && (
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5a5a40] text-white text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {fileName}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8a8a70] flex items-center gap-1">
                <Info className="w-4 h-4 text-[#a68a64]" /> Precisa do formato correto?
              </span>
              <button
                onClick={handleDownloadTemplate}
                className="text-[#5a5a40] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Planilha Modelo CSV
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Text / Excel */}
        {activeTab === 'paste' && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-[#8a8a70]">
              Copie as linhas da sua planilha no Excel/Google Sheets e cole abaixo. Separadores suportados: tabulação, vírgula ou ponto e vírgula.
            </p>
            <textarea
              rows={6}
              placeholder={`Nome, Email, Telefone, Status, DataNascimento, CPF\nCarlos Silva, carlos@email.com, (11) 98888-7777, membro, 1985-06-15, 123.456.789-00\nMaria Oliveira, maria@email.com, (11) 97777-6666, visitante, 1990-03-22, 234.567.890-11`}
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#f5f5f0] border border-[#e0e0d0] text-xs font-mono text-[#2a2a20] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20"
            />
          </div>
        )}

        {/* Tab 3: Migration Sample Generator (100 - 500 members) */}
        {activeTab === 'generator' && (
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-[#2a2a20] to-[#3a3a2c] text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#a68a64]/30 text-amber-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Gerador Automático de Migração
                </h3>
                <p className="text-xs text-slate-300">
                  Gere instantaneamente de 100 a 500 membros fictícios completos com nomes, telefones, e-mails e datas válidas para testar a migração do sistema.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-bold text-slate-200">Quantidade de Membros:</span>
              {[100, 250, 500].map((qty) => (
                <button
                  key={qty}
                  onClick={() => {
                    setGeneratorCount(qty);
                    handleGenerateSampleMembers(qty);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    generatorCount === qty && parsedMembers.length === qty
                      ? 'bg-[#a68a64] text-white ring-2 ring-amber-300'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  {qty} Membros
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parsed Members Preview Table */}
        {parsedMembers.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#2a2a20] uppercase flex items-center gap-2">
                <Database className="w-4 h-4 text-[#a68a64]" />
                Pré-visualização do Lote ({parsedMembers.length} registros detectados)
              </h3>
              <span className="text-[11px] font-bold text-[#5a5a40] bg-[#5a5a40]/10 px-2.5 py-0.5 rounded-full">
                Pronto para Importar
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#e0e0d0] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f5f0] text-[#5a5a40] font-bold sticky top-0 border-b border-[#e0e0d0]">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Nome</th>
                    <th className="p-2.5">E-mail</th>
                    <th className="p-2.5">Telefone</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Cargo/Função</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0d0]">
                  {parsedMembers.slice(0, 15).map((m, idx) => (
                    <tr key={idx} className="hover:bg-[#f5f5f0]/50">
                      <td className="p-2.5 text-[#8a8a70] font-mono text-[10px]">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-[#2a2a20]">{m.name}</td>
                      <td className="p-2.5 text-[#8a8a70]">{m.email || '-'}</td>
                      <td className="p-2.5 text-[#8a8a70]">{m.phone || '-'}</td>
                      <td className="p-2.5 font-semibold text-[#5a5a40]">{m.status}</td>
                      <td className="p-2.5 text-[#8a8a70]">{m.role || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {parsedMembers.length > 15 && (
                <div className="p-2.5 text-center text-xs font-bold text-[#8a8a70] bg-[#f5f5f0]/80 border-t border-[#e0e0d0]">
                  ... e mais {parsedMembers.length - 15} membros na lista de importação.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-[#e0e0d0] flex items-center justify-between">
          <p className="text-xs text-[#8a8a70]">
            {parsedMembers.length > 0
              ? `${parsedMembers.length} registros prontos para inserção imediata no banco de dados.`
              : 'Selecione um arquivo ou cole os dados para habilitar a importação.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#e0e0d0] text-xs font-bold text-[#8a8a70] hover:bg-[#f5f5f0] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={parsedMembers.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="px-6 py-2.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Importar {parsedMembers.length > 0 ? `${parsedMembers.length} Membros` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
