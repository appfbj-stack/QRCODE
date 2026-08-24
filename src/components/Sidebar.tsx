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
    { id: 'obpc', label: 'Presença QR', icon: QrCode },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'membros', label: 'Membros', icon: Users },
    { id: 'congregacoes', label: 'Congregações', icon: Building2 },
    { id: 'eventos', label: 'Eventos', icon: Calendar },
    { id: 'documentos', label: 'Documentos', icon: FileText },
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-emerald-700 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-emerald-800 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo & Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-emerald-800 bg-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md ring-1 ring-white/20">
              <QrCode className="w-5 h-5 text-emerald-900" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white leading-none tracking-wider">
                QRCODE
              </h1>
              <p className="text-[10px] text-emerald-100 font-semibold tracking-widest uppercase mt-0.5">
                Obreiros OBPC
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-800"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-extrabold tracking-widest text-emerald-100/80 uppercase">
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
                    ? 'bg-emerald-800 text-white shadow-sm ring-1 ring-amber-400/40 font-bold'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-emerald-100/80 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      isActive
                        ? 'bg-amber-400 text-emerald-900'
                        : 'bg-amber-400/30 text-amber-100 border border-amber-400/40'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Footer do tenant */}
        <div className="p-3 border-t border-emerald-800 bg-emerald-800/40">
          <div className="p-3 rounded-2xl bg-emerald-800 border border-amber-400/30 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
              <Church className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.tenant?.name || "OBPC"}</p>
              <p className="text-[10px] text-emerald-100 truncate">Sistema de Presença</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
