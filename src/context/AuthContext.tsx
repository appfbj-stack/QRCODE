import React, { createContext, useContext, useState, useEffect } from "react";
import { getToken, getStoredUser, clearAuth, setAuth, login as apiLogin } from "../services/api";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  congregationId: string | null;
  congregationName: string | null;
  tenant: { id: string; name: string; slug: string };
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getToken());

  useEffect(() => {
    // valida token no mount
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.success) setUser(d.data); else { clearAuth(); setUser(null); setToken(null); } })
        .catch(() => {});
      return;
    }
    // Sem token — tenta auto-login (somente se backend permitir via OPEN_ACCESS=true)
    fetch("/api/auth/auto-login", { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.success) {
          setAuth(d.data.token, d.data.user);
          setUser(d.data.user);
          setToken(d.data.token);
        }
      })
      .catch(() => {});
  }, []);

  const login = async (email: string, password: string) => {
    const { user: u, token: t } = await apiLogin(email, password);
    setUser(u);
    setToken(t);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setToken(null);
  };

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}