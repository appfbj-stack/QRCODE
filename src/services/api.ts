// Helper para chamadas autenticadas à API
const TOKEN_KEY = "kairos_token";
const USER_KEY = "kairos_user";

// Evento customizado para sinalizar bloqueio por billing
export const SUBSCRIPTION_BLOCKED_EVENT = "kairos:subscription-blocked";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): any | null {
  try {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json();
  if (res.status === 402 && data.code === "SUBSCRIPTION_REQUIRED") {
    // Billing bloqueado — dispara evento global
    window.dispatchEvent(
      new CustomEvent(SUBSCRIPTION_BLOCKED_EVENT, { detail: data })
    );
    throw new Error(data.error || "Assinatura inativa");
  }
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.data;
}

export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Falha no login");
  }
  setAuth(data.data.token, data.data.user);
  return data.data;
}