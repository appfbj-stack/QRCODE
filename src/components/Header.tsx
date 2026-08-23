import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Plus,
  Building2,
  ChevronDown,
  Search,
  RotateCcw,
  Sparkles,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { Congregation } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  congregations: Congregation[];
  selectedCongregationId: string;
  onSelectCongregation: (id: string) => void;
  onOpenQuickModal: () => void;
  onResetData: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentUser?: { name: string; email: string; role: string };
}

function roleLabel(role: string | undefined): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Administrador",
    GERENTE: "Gerente / Pastor",
    OPERADOR: "Operador",
    USUARIO: "Membro",
  };
  return map[role || "USUARIO"] || role || "Membro";
}

function roleColor(role: string | undefined): string {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "bg-[#a68a64]/20 text-[#2a2a20]";
  if (role === "GERENTE") return "bg-indigo-100 text-indigo-700";
  return "bg-[#5a5a40]/15 text-[#5a5a40]";
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  congregations,
  selectedCongregationId,
  onSelectCongregation,
  onOpenQuickModal,
  onResetData,
  searchTerm,
  onSearchChange,
  currentUser,
}) => {
  const { user: authUser, logout } = useAuth();
  const [showCongregationDropdown, setShowCongregationDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // congregationName do contexto (se houver) tem prioridade sobre a prop
  const userCongregationName = authUser?.congregationName || (currentUser as any)?.congregationName;

  const selectedCongregation =
    congregations.find((c) => c.id === selectedCongregationId) || congregations[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-[#e0e0d0] px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left section: Logo, Hamburger & Congregation Dropdown */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#2a2a20] hover:bg-[#f5f5f0] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo Kairos Tecnologia */}
        <img
          src="/logo-kairos.png"
          alt="Kairos Tecnologia"
          className="hidden sm:block h-9 w-9 rounded-full object-cover"
          title="Kairos Igreja — Gestão Eclesiástica"
        />

        {/* Congregation Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowCongregationDropdown(!showCongregationDropdown)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#f5f5f0] hover:bg-[#e0e0d0]/60 border border-[#e0e0d0] text-[#2a2a20] text-xs font-bold transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-[#5a5a40]" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {selectedCongregationId === 'all'
                ? 'Todas as Congregações'
                : selectedCongregation?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8a8a70]" />
          </button>

          {showCongregationDropdown && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e0e0d0] py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#8a8a70] uppercase tracking-wider">
                Congregação Ativa
              </div>
              <button
                onClick={() => {
                  onSelectCongregation('all');
                  setShowCongregationDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#f5f5f0] ${
                  selectedCongregationId === 'all' ? 'bg-[#5a5a40]/10 font-bold text-[#5a5a40]' : 'text-[#2a2a20]'
                }`}
              >
                <span>Visão Geral (Todas)</span>
                <span className="text-[10px] text-[#8a8a70] font-normal">Sede + Campuses</span>
              </button>

              <div className="my-1 border-t border-[#e0e0d0]" />

              {congregations.map((cong) => (
                <button
                  key={cong.id}
                  onClick={() => {
                    onSelectCongregation(cong.id);
                    setShowCongregationDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#f5f5f0] ${
                    selectedCongregationId === cong.id
                      ? 'bg-[#5a5a40]/10 font-bold text-[#5a5a40]'
                      : 'text-[#2a2a20]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-semibold">{cong.name}</p>
                    <p className="text-[10px] text-[#8a8a70] truncate">{cong.leadPastor}</p>
                  </div>
                  {cong.isHeadquarters && (
                    <span className="px-2 py-0.5 text-[9px] bg-[#a68a64]/20 text-[#2a2a20] rounded-md font-bold shrink-0">
                      Sede
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Global Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a70]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar membro, célula, sermão, pedido de oração..."
          className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-[#f5f5f0] border border-[#e0e0d0] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/30 focus:bg-white text-[#2a2a20] placeholder-[#8a8a70] transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a8a70] hover:text-[#2a2a20]"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Right section: Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Reset Mock Data Button */}
        <button
          onClick={onResetData}
          title="Restaurar dados iniciais do app"
          className="p-2 rounded-xl text-[#8a8a70] hover:text-[#a68a64] hover:bg-[#f5f5f0] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-[#2a2a20] hover:bg-[#f5f5f0] transition-colors relative"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#a68a64] ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#e0e0d0] p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#e0e0d0]">
                <span className="font-bold text-[#2a2a20] flex items-center gap-1.5 font-serif">
                  <Sparkles className="w-3.5 h-3.5 text-[#a68a64]" />
                  Notificações do Sistema
                </span>
                <span className="text-[10px] text-[#5a5a40] font-bold bg-[#f5f5f0] px-2 py-0.5 rounded-full border border-[#e0e0d0]">
                  3 novas
                </span>
              </div>
              <div className="py-2 space-y-2.5">
                <div className="p-2.5 rounded-xl bg-[#f5f5f0] hover:bg-[#ecece0] transition-colors">
                  <p className="font-bold text-[#2a2a20]">Novo pedido de oração</p>
                  <p className="text-[11px] text-[#8a8a70] mt-0.5">Irmã Cláudia enviou um pedido pela cirurgia de sua mãe.</p>
                  <span className="text-[9px] text-[#8a8a70]">Há 20 minutos</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#f5f5f0] hover:bg-[#ecece0] transition-colors">
                  <p className="font-bold text-[#2a2a20]">Escala de Voluntários</p>
                  <p className="text-[11px] text-[#8a8a70] mt-0.5">Gabriel Oliveira confirmou a escala no louvor para domingo.</p>
                  <span className="text-[9px] text-[#8a8a70]">Há 1 hora</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#f5f5f0] hover:bg-[#ecece0] transition-colors">
                  <p className="font-bold text-[#2a2a20]">Dízimo Registrado</p>
                  <p className="text-[11px] text-[#8a8a70] mt-0.5">Entrada Pix no valor de R$ 14.500,00 adicionada em Finanças.</p>
                  <span className="text-[9px] text-[#8a8a70]">Ontem</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User menu + Logout */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#f5f5f0] transition-colors"
            >
              <span
                title={roleLabel(currentUser.role)}
                className={`hidden md:inline px-2 py-0.5 text-[10px] font-bold rounded-md ${roleColor(currentUser.role)}`}
              >
                {roleLabel(currentUser.role)}
              </span>
              <div className="w-7 h-7 rounded-full bg-[#5a5a40] flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-amber-300" />
              </div>
              <span className="hidden sm:inline text-xs font-bold text-[#2a2a20] max-w-[120px] truncate">
                {currentUser.name}
              </span>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e0e0d0] py-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-[#e0e0d0]">
                  <p className="font-bold text-[#2a2a20]">{currentUser.name}</p>
                  <p className="text-[10px] text-[#8a8a70] truncate">{currentUser.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${roleColor(currentUser.role)}`}>
                      {roleLabel(currentUser.role)}
                    </span>
                    {userCongregationName && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#5a5a40]/10 text-[#5a5a40]">
                        {userCongregationName}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8a8a70] mt-2">Escopo de acesso: {
                    currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN"
                      ? "Todas as 14 igrejas"
                      : (userCongregationName || "—")
                  }</p>
                </div>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Add Button */}
        <button
          onClick={onOpenQuickModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5a5a40] hover:bg-[#4d4d36] text-[#f5f5f0] font-bold text-xs shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ação Rápida</span>
        </button>
      </div>
    </header>
  );
};
