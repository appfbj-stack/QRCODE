import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Camera,
  Users,
  Home,
  Building2,
  Briefcase,
  Check,
  ShieldCheck,
  Upload,
  Droplets,
  Cake,
} from 'lucide-react';
import { Member, MemberStatus, Celula, Congregation } from '../types';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Omit<Member, 'id'> | Member) => void;
  initialData?: Member | null;
  congregations: Congregation[];
  celulas: Celula[];
  onOpenBatchImport?: () => void;
}

const AVAILABLE_MINISTRIES = [
  'Louvor',
  'Mídia & Comunicação',
  'Ministério Infantil',
  'Jovens & Adolescentes',
  'Ensino & Discipulado',
  'Diaconato & Recepção',
  'Casais & Família',
  'Intercessão & Oração',
  'Ação Social',
];

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  congregations,
  celulas,
  onOpenBatchImport,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<MemberStatus>('membro');
  const [role, setRole] = useState('');
  const [congregationId, setCongregationId] = useState('');
  const [celulaId, setCelulaId] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [filiation, setFiliation] = useState('');
  const [cpf, setCpf] = useState('');
  const [cardValidity, setCardValidity] = useState('');
  const [hasCardValidity, setHasCardValidity] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  // LGPD
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentTermsVersion] = useState('v1.0-2026-08-22');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setStatus(initialData.status || 'membro');
      setRole(initialData.role || '');
      setCongregationId(initialData.congregationId || congregations[0]?.id || '');
      setCelulaId(initialData.celulaId || '');
      setAddress(initialData.address || '');
      setBirthDate(initialData.birthDate || '');
      setBaptismDate(initialData.baptismDate || '');
      setFiliation(initialData.filiation || '');
      setCpf(initialData.cpf || '');
      setCardValidity(initialData.cardValidity || '');
      setHasCardValidity(!!initialData.cardValidity);
      setPhotoUrl(initialData.photoUrl || '');
      setSelectedMinistries(initialData.ministries || []);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setStatus('membro');
      setRole('');
      setCongregationId(congregations[0]?.id || '');
      setCelulaId('');
      setAddress('');
      setBirthDate('');
      setBaptismDate('');
      setFiliation('');
      setCpf('');
      setCardValidity('');
      setHasCardValidity(true);
      setPhotoUrl('');
      setSelectedMinistries([]);
    }
  }, [initialData, isOpen, congregations]);

  if (!isOpen) return null;

  // Image Upload Local handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMinistry = (minName: string) => {
    if (selectedMinistries.includes(minName)) {
      setSelectedMinistries(selectedMinistries.filter((m) => m !== minName));
    } else {
      setSelectedMinistries([...selectedMinistries, minName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // LGPD: pra cadastro NOVO (sem initialData), exigir consentimento explicito
    // (Art. 11, I - tratamento de dado sensivel mediante consentimento)
    if (!initialData && !consentAccepted) {
      alert('Para cadastrar um novo membro, é necessário aceitar a Política de Privacidade. (LGPD)');
      return;
    }

    const payload: Partial<Member> = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status,
      role: role.trim() || undefined,
      congregationId: congregationId || congregations[0]?.id || 'cong-1',
      celulaId: celulaId || undefined,
      address: address.trim(),
      birthDate: birthDate || undefined,
      baptismDate: baptismDate || undefined,
      filiation: filiation.trim(),
      cpf: cpf.trim(),
      cardValidity: hasCardValidity ? cardValidity : undefined,
      photoUrl: photoUrl.trim() || undefined,
      ministries: selectedMinistries,
      joinedAt: initialData?.joinedAt || new Date().toISOString().split('T')[0],
      // LGPD
      ...(consentAccepted && !initialData?.id
        ? {
            consentAcceptedAt: new Date().toISOString(),
            consentTermsVersion,
          }
        : {}),
    };

    onSave(payload as Member);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#f5f5f0] text-[#2a2a20] rounded-[28px] border border-[#e0e0d0] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#5a5a40] text-[#f5f5f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#4d4d36] text-[#a68a64] border border-[#a68a64]/30">
              <User className="w-5 h-5 text-[#f5f5f0]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg leading-tight">
                {initialData ? 'Editar Cadastro do Membro' : 'Novo Membro / Visitante'}
              </h2>
              <p className="text-xs text-[#e0d8c0]">
                Ficha completa com dados pessoais, eclesiásticos e carteirinha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!initialData && onOpenBatchImport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBatchImport();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a68a64] hover:bg-[#967a54] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Importar centenas de membros via CSV ou Excel de uma vez"
              >
                <Upload className="w-3.5 h-3.5" /> Importar Lote (100-500+)
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#e0d8c0] hover:bg-[#4d4d36] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Photo / Avatar Upload Section */}
          <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0] flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={
                  photoUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    name || 'Novo Membro'
                  )}&background=5a5a40&color=fff&size=128`
                }
                alt="Foto do membro"
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#a68a64] shadow-md bg-[#f5f5f0]"
              />
              <label className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-[#a68a64] text-[#2a2a20] cursor-pointer hover:bg-[#8f7451] transition-colors shadow-md">
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <label className="block font-bold text-[#2a2a20] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#a68a64]" />
                Foto de Perfil / Imagem do Membro
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Cole o link da foto (URL) ou escolha um arquivo..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#f5f5f0] border border-[#e0e0d0] text-xs focus:bg-white outline-none text-[#2a2a20]"
                />
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="px-3 py-2 rounded-xl bg-rose-100 text-rose-700 font-bold hover:bg-rose-200"
                  >
                    Remover
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[#8a8a70]">
                Envie uma foto do seu dispositivo ou insira a URL da imagem.
              </p>
            </div>
          </div>

          {/* Section 1: Informações Pessoais */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-sm text-[#2a2a20] border-b border-[#e0e0d0] pb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#a68a64]" />
              Dados Pessoais & Identificação
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#2a2a20] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none font-medium text-[#2a2a20]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-[#a68a64]" />
                  CPF
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[#2a2a20]">
                    <Cake className="w-3.5 h-3.5 text-amber-600" />
                    Data de Nascimento (Aniversariante)
                  </span>
                  {birthDate && (
                    <span className="text-[10px] font-bold text-[#5a5a40] bg-[#5a5a40]/10 px-2 py-0.5 rounded-md">
                      🎂 {(() => {
                        const parts = birthDate.split('-');
                        if (parts.length === 3) {
                          const year = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10) - 1;
                          const day = parseInt(parts[2], 10);
                          const birth = new Date(year, month, day);
                          const now = new Date();
                          let age = now.getFullYear() - birth.getFullYear();
                          const mDiff = now.getMonth() - birth.getMonth();
                          if (mDiff < 0 || (mDiff === 0 && now.getDate() < birth.getDate())) {
                            age--;
                          }
                          return `${age > 0 ? `${age} anos` : 'Recém-nascido'}`;
                        }
                        return 'Data válida';
                      })()}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20] font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#a68a64]" />
                  Filiação (Nome do Pai & Mãe)
                </label>
                <input
                  type="text"
                  value={filiation}
                  onChange={(e) => setFiliation(e.target.value)}
                  placeholder="Ex: João de Oliveira & Maria das Dores Oliveira"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contato & Endereço */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-sm text-[#2a2a20] border-b border-[#e0e0d0] pb-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#a68a64]" />
              Contato & Endereço
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#8a8a70]" />
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#8a8a70]" />
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-8888"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#a68a64]" />
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Rua Bela Cintra, 450 - Ap 42 - Consolação, São Paulo - SP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dados Eclesiásticos & Carteirinha */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-sm text-[#2a2a20] border-b border-[#e0e0d0] pb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#a68a64]" />
              Dados Eclesiásticos & Carteirinha de Membro
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-[#2a2a20] mb-1">
                  Status no Corpo
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MemberStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none font-bold text-[#2a2a20]"
                >
                  <option value="membro">Membro</option>
                  <option value="lider">Líder / Obreiro / Liderança</option>
                  <option value="discipulado">Em Discipulado</option>
                  <option value="visitante">Visitante</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-[#a68a64]" />
                  Função / Cargo Eclesiástico (Preenchível)
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ex: Pastor, Evangelista, Presbítero, Diácono, Obreiro..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20] font-medium"
                />
              </div>

              {/* Quick Role Suggestions */}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-white border border-[#e0e0d0]">
                <span className="text-[10px] font-bold text-[#8a8a70] mr-1">Sugestões de Função:</span>
                {[
                  'Pastor(a)',
                  'Pastor Auxiliar',
                  'Evangelista',
                  'Presbítero',
                  'Diácono(isa)',
                  'Obreiro(a)',
                  'Líder de Célula',
                  'Discipulador(a)',
                  'Coordenador(a)',
                  'Membro Oficial',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setRole(sug)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                      role === sug
                        ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-2xs'
                        : 'bg-[#f5f5f0] text-[#5a5a40] border-[#e0e0d0] hover:border-[#a68a64]'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  Data de Batismo
                </label>
                <input
                  type="date"
                  value={baptismDate}
                  onChange={(e) => setBaptismDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#5a5a40]" />
                  Congregação / Campus
                </label>
                <select
                  value={congregationId}
                  onChange={(e) => setCongregationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                >
                  {congregations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isHeadquarters ? '(Sede)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2a2a20] mb-1 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-[#a68a64]" />
                  Célula
                </label>
                <select
                  value={celulaId}
                  onChange={(e) => setCelulaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e0e0d0] focus:ring-2 focus:ring-[#5a5a40]/30 outline-none text-[#2a2a20]"
                >
                  <option value="">Nenhuma célula selecionada</option>
                  {celulas.map((cel) => (
                    <option key={cel.id} value={cel.id}>
                      {cel.name} ({cel.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Validade da Carteirinha */}
            <div className="p-4 rounded-2xl bg-white border border-[#e0e0d0] space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#a68a64]" />
                  <span className="font-bold text-[#2a2a20]">Validade da Carteirinha de Membro</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCardValidity}
                    onChange={(e) => setHasCardValidity(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#e0e0d0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5a5a40]"></div>
                </label>
              </div>

              {hasCardValidity && (
                <div className="pt-2 border-t border-[#f5f5f0] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#8a8a70] text-[11px] mb-1">
                      Data de Validade da Carteirinha
                    </label>
                    <input
                      type="date"
                      value={cardValidity}
                      onChange={(e) => setCardValidity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#f5f5f0] border border-[#e0e0d0] focus:bg-white text-xs outline-none text-[#2a2a20]"
                    />
                  </div>
                  <div className="flex items-center text-[11px] text-[#8a8a70]">
                    <p>
                      Se deixado em branco, a carteirinha é gerada com validade de 2 anos a partir da data de cadastro.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Ministérios Atuantes */}
          <div className="space-y-2">
            <label className="block font-bold text-[#2a2a20] flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-[#a68a64]" />
              Ministérios que Atua
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MINISTRIES.map((minName) => {
                const isSelected = selectedMinistries.includes(minName);
                return (
                  <button
                    key={minName}
                    type="button"
                    onClick={() => toggleMinistry(minName)}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] flex items-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-xs'
                        : 'bg-white text-[#2a2a20] border-[#e0e0d0] hover:border-[#a68a64]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#a68a64]" />}
                    {minName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LGPD: Consentimento (Art. 11, I) - obrigatorio para novos cadastros */}
          {!initialData && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent-lgpd"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-2 border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                />
                <label htmlFor="consent-lgpd" className="text-xs text-[#2a2a20] leading-relaxed cursor-pointer">
                  <strong className="text-rose-700">*</strong> Li e aceito a{' '}
                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5a5a40] font-semibold underline hover:no-underline"
                  >
                    Política de Privacidade
                  </a>{' '}
                  e autorizo o tratamento dos dados pessoais e religiosos (dado sensível, conforme Art. 5°, II da LGPD)
                  para as finalidades descritas (cadastro, comunicação, ministérios, células).{' '}
                  <span className="text-[#8a8a70]">({consentTermsVersion})</span>
                </label>
              </div>
              <p className="text-[10px] text-[#5a5a40] ml-8">
                ⚠ O consentimento pode ser revogado a qualquer momento em "Meu Perfil → Privacidade".
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e0e0d0]">
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
              <User className="w-4 h-4" />
              {initialData ? 'Salvar Alterações' : 'Cadastrar Membro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
