import React from 'react';
import {
  LayoutDashboard,
  Users,
  Home,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  Flame,
  BookOpen,
  UserCheck,
  Megaphone,
  MessageSquare,
  Church,
  X,
  UserCog,
  FileText,
  CreditCard,
  Shield,
  QrCode,
} from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  unreadChatCount?: number;
  prayersCount?: number;
  /** Se true, mostra a entrada "Usuários" (só ADMIN/SUPER_ADMIN). */
  isAdmin?: boolean;
  /** Role do user (para decidir se mostra item Super Admin). */
  user?: { role: string } | null;
}

interface NavItem {
  id: ViewMode;
  label: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  unreadChatCount = 3,
  prayersCount = 2,
  isAdmin = false,
  user = null,
}) => {
  const allItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'membros', label: 'Membros', icon: Users },
    { id: 'celulas', label: 'Células', icon: Home },
    { id: 'congregacoes', label: 'Congregações', icon: Building2 },
    { id: 'ministerios', label: 'Ministérios', icon: Briefcase },
    { id: 'eventos', label: 'Eventos', icon: Calendar },
    { id: 'obpc', label: 'Presença QR', icon: QrCode, adminOnly: true },
    { id: 'financas', label: 'Finanças', icon: DollarSign },
    { id: 'oracao', label: 'Oração', icon: Flame, badge: prayersCount },
    { id: 'sermoes', label: 'Sermões', icon: BookOpen },
    { id: 'voluntarios', label: 'Voluntários', icon: UserCheck },
    { id: 'mural', label: 'Mural', icon: Megaphone },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: unreadChatCount },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
    { id: 'billing', label: 'Assinatura', icon: CreditCard, adminOnly: true },
    { id: 'super-admin', label: 'Super Admin', icon: Shield, superAdminOnly: true },
  ];

  // Filtra: esconde itens adminOnly se o user não for admin
  // superAdminOnly é restrito a SUPER_ADMIN
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN';
  const navItems = allItems.filter((i) => {
    if (i.superAdminOnly) return isSuperAdmin;
    if (i.adminOnly) return isAdmin;
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#2a2a20]/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#5a5a40] text-[#f5f5f0] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-[#4d4d36] ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo & Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#4d4d36] bg-[#4d4d36]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#a68a64] flex items-center justify-center shadow-md ring-1 ring-white/20">
              <span className="font-extrabold text-xl text-[#2a2a20] tracking-wider font-serif">K</span>
            </div>
            <div>
              <h1 className="font-bold font-serif text-lg text-[#f5f5f0] leading-none tracking-wider">
                KAIROS
              </h1>
              <p className="text-[10px] text-[#e0d8c0] font-semibold tracking-widest uppercase mt-0.5">
                Gestão Eclesiástica
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-[#e0d8c0] hover:text-white p-1 rounded-lg hover:bg-[#4d4d36]"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-extrabold tracking-widest text-[#e0d8c0]/80 uppercase">
            Menu Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 group ${
                  isActive
                    ? 'bg-[#4d4d36] text-[#f5f5f0] shadow-sm ring-1 ring-[#a68a64]/40 font-bold'
                    : 'text-[#e0d8c0] hover:text-white hover:bg-[#6b6b4d]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#a68a64]' : 'text-[#e0d8c0]/80 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      isActive
                        ? 'bg-[#a68a64] text-[#2a2a20]'
                        : 'bg-[#a68a64]/30 text-[#e0d8c0] border border-[#a68a64]/40'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Congregation Footer Banner */}
        <div className="p-3 border-t border-[#4d4d36] bg-[#4d4d36]/40">
          <div className="p-3 rounded-2xl bg-[#4d4d36] border border-[#a68a64]/30 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#a68a64]/20 text-[#a68a64]">
              <Church className="w-4 h-4 text-[#e0d8c0]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-serif font-bold text-[#f5f5f0] truncate">Igreja Kairos</p>
              <p className="text-[10px] text-[#e0d8c0] truncate">Tempo Oportuno de Deus</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
