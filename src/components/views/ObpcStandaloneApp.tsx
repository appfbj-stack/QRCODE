// =====================================================================
// QRCODE Obreiros — App Standalone
// =====================================================================
// App minimalista e focado, SEM o resto do Kairos Igreja.
// Header: logo + nome do tenant + botão sair
// Body: ObpcAdminView (Presença QR)
// =====================================================================

import React, { useEffect, useState } from "react";
import { QrCode, LogOut, RefreshCw } from "lucide-react";
import { ObpcAdminView } from "./ObpcAdminView";
import { clearAuth, getStoredUser } from "../../services/api";

export const ObpcStandaloneApp: React.FC = () => {
  const [tenant, setTenant] = useState<{ name: string; logo?: string | null } | null>(null);
  const [user, setUser] = useState<any>(() => getStoredUser());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Pega dados do tenant via /api/auth/me
    const token = localStorage.getItem("kairos_token");
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.success) {
          setUser(d.data);
          setTenant({ name: d.data.tenant?.name, logo: d.data.tenant?.logo });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    if (!confirm("Sair do modo auto-login? Você terá que autenticar manualmente depois.")) return;
    clearAuth();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Header minimalista */}
      <header className="bg-white border-b-2 border-emerald-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-emerald-800 leading-none">QRCODE Obreiros</h1>
              <p className="text-xs text-emerald-600 font-semibold tracking-wide">
                {tenant?.name || "Sistema de Presença"} · OBPC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
                  {user.name?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="leading-tight">
                  <p className="font-bold text-emerald-800">{user.name || "Admin"}</p>
                  <p className="text-[10px] text-emerald-600">{user.role || "ADMIN"}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="Sair do auto-login"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto p-4 md:p-6" key={refreshKey}>
        <ObpcAdminView />
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 md:px-6 py-6 mt-8 text-center text-xs text-slate-500">
        <p>
          <strong>QRCODE Obreiros OBPC</strong> · v1.0.10 · {new Date().getFullYear()}
        </p>
        <p className="mt-1">Sistema de cadastro e presença por QR Code · Multi-tenant · LGPD</p>
      </footer>
    </div>
  );
};

export default ObpcStandaloneApp;
