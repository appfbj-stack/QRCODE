import React from 'react';
import { X, Printer, ShieldCheck, CreditCard, Building2, Calendar, Droplets, User, Users, Briefcase } from 'lucide-react';
import { Member, Congregation } from '../types';

interface MemberCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  congregations: Congregation[];
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({
  isOpen,
  onClose,
  member,
  congregations,
}) => {
  if (!isOpen || !member) return null;

  const congregation = congregations.find((c) => c.id === member.congregationId);

  const handlePrint = () => {
    window.print();
  };

  const formattedValidity = member.cardValidity
    ? member.cardValidity
    : '31/12/2028';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 print:p-0 print:bg-white print:static">
      <div className="bg-[#f5f5f0] text-[#2a2a20] rounded-[28px] border border-[#e0e0d0] shadow-2xl w-full max-w-md overflow-hidden flex flex-col print:shadow-none print:border-none print:w-full">
        {/* Header - Hidden in Print */}
        <div className="px-5 py-4 bg-[#5a5a40] text-[#f5f5f0] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-[#a68a64]" />
            <h2 className="font-serif font-bold text-base">Carteirinha Digital de Membro</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#e0d8c0] hover:bg-[#4d4d36] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Content Container */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {/* Printable Member Card */}
          <div className="w-full bg-[#5a5a40] text-[#f5f5f0] rounded-[24px] border-2 border-[#a68a64] p-5 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[260px] aspect-[1.58/1]">
            {/* Background Accent */}
            <div className="absolute right-0 top-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-[#a68a64]/10 blur-2xl pointer-events-none" />

            {/* Top Bar Logo & Church Name */}
            <div className="flex items-center justify-between border-b border-[#a68a64]/40 pb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#a68a64] text-[#2a2a20] font-extrabold flex items-center justify-center font-serif text-base shadow-sm">
                  K
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-sm tracking-wider text-white leading-tight">
                    IGREJA KAIROS
                  </h3>
                  <p className="text-[9px] text-[#e0d8c0] uppercase tracking-widest">
                    {congregation ? congregation.name : 'Matriz Sede Central'}
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-[#a68a64]/20 border border-[#a68a64]/40 text-[#a68a64] text-[9px] font-extrabold uppercase truncate max-w-[140px]">
                {member.role || (member.status === 'lider' ? 'Líder / Obreiro' : member.status === 'visitante' ? 'Visitante' : 'Membro Oficial')}
              </span>
            </div>

            {/* Middle Section: Photo & Member Details */}
            <div className="flex items-start gap-4 my-3 relative z-10">
              <img
                src={
                  member.photoUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    member.name
                  )}&background=a68a64&color=2a2a20&size=128`
                }
                alt={member.name}
                className="w-20 h-24 rounded-2xl object-cover ring-2 ring-[#a68a64] shadow-md bg-[#2a2a20]"
              />

              <div className="flex-1 space-y-1 text-xs">
                <h4 className="font-serif font-extrabold text-white text-base leading-tight">
                  {member.name}
                </h4>

                {member.role && (
                  <p className="text-[10px] text-[#a68a64] font-bold flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-[#a68a64]" />
                    {member.role}
                  </p>
                )}

                {member.cpf && (
                  <p className="text-[10px] text-[#e0d8c0] flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-[#a68a64]" />
                    CPF: <strong className="text-white">{member.cpf}</strong>
                  </p>
                )}

                {member.birthDate && (
                  <p className="text-[10px] text-[#e0d8c0] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#a68a64]" />
                    Nasc.: <span className="text-white">{member.birthDate}</span>
                  </p>
                )}

                {member.baptismDate && (
                  <p className="text-[10px] text-[#e0d8c0] flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-[#a68a64]" />
                    Batismo: <span className="text-white">{member.baptismDate}</span>
                  </p>
                )}

                {member.filiation && (
                  <p className="text-[9px] text-[#e0d8c0] line-clamp-1 flex items-center gap-1 mt-0.5">
                    <Users className="w-2.5 h-2.5 text-[#a68a64]" />
                    {member.filiation}
                  </p>
                )}
              </div>
            </div>

            {/* Card Footer: Address & Expiry Date */}
            <div className="pt-2 border-t border-[#a68a64]/30 flex items-center justify-between text-[9px] text-[#e0d8c0] relative z-10">
              <div className="truncate max-w-[220px]">
                <span className="text-[#a68a64] font-bold">Endereço: </span>
                {member.address || 'São Paulo - SP'}
              </div>
              <div className="bg-[#4d4d36] px-2 py-0.5 rounded-lg border border-[#a68a64]/30 text-white font-bold shrink-0">
                Validade: {formattedValidity}
              </div>
            </div>
          </div>

          {/* Action Buttons - Hidden in Print */}
          <div className="w-full flex items-center justify-end gap-3 pt-2 border-t border-[#e0e0d0] print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e0e0d0] text-[#2a2a20] font-bold text-xs hover:bg-[#e0e0d0]/50"
            >
              Fechar
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-[#a68a64]" />
              Imprimir Carteirinha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
