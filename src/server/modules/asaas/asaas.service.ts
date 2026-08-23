/**
 * asaas.service.ts
 *
 * Wrapper da API REST v3 do Asaas (https://docs.asaas.com).
 *
 * Suporta dois ambientes via env var ASAAS_ENV:
 *   - "homologation" → https://api-hml.asaas.com/v3
 *   - "production"  → https://api.asaas.com/v3
 *
 * Auth: header `access_token: <ASAAS_API_KEY>` em todas as requisições.
 *
 * Não persiste nada — funções puras. Persistência é responsabilidade
 * dos routes (que vinculam a resposta ao Tenant/AsaasPayment local).
 */

import "dotenv/config";

const ASAAS_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_ENV = (process.env.ASAAS_ENV || "homologation").toLowerCase();

export const ASAAS_BASE =
  ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

export const ASAAS_ENV_LABEL = ASAAS_ENV;

if (!ASAAS_KEY) {
  console.warn(
    "[asaas] ⚠ ASAAS_API_KEY não definida — billing desabilitado até setar a env var"
  );
}

export function asaasConfigured(): boolean {
  return ASAAS_KEY.length > 0;
}

// ─────────────────────────────────────────────────────────
// Tipos (espelho do payload do Asaas — campos mais usados)
// ─────────────────────────────────────────────────────────
export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  description: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";
  status:
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "OVERDUE"
    | "REFUNDED"
    | "RECEIVED_IN_CASH"
    | "REFUND_REQUESTED"
    | "REFUND_IN_PROGRESS"
    | "CHARGEBACK_REQUESTED"
    | "CHARGEBACK_DISPUTE"
    | "AWAITING_CHARGEBACK_REVERSAL"
    | "DUNNING_REQUESTED"
    | "DUNNING_RECEIVED"
    | "AWAITING_RISK_ANALYSIS";
  dueDate: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  externalReference?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string; // base64 PNG
  payload: string;      // copia-e-cola
  expirationDate: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
  value: number;
  nextDueDate: string;
  cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
  status: "ACTIVE" | "EXPIRED" | "INACTIVE";
  description: string;
  externalReference?: string;
}

// ─────────────────────────────────────────────────────────
// Helper interno de fetch
// ─────────────────────────────────────────────────────────
async function asaasFetch<T = any>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: any
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  if (!ASAAS_KEY) {
    throw new Error("ASAAS_API_KEY não configurada");
  }
  const url = `${ASAAS_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_KEY,
      "User-Agent": "Kairos-Igreja/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  let data: T | null = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Não é JSON — vai no raw
  }
  return { ok: res.ok, status: res.status, data, raw };
}

// ─────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────
export async function asaasCreateCustomer(input: {
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference?: string;
}): Promise<AsaasCustomer> {
  const r = await asaasFetch<AsaasCustomer>("POST", "/customers", input);
  if (!r.ok) throw new Error(`Asaas create customer failed: ${r.raw}`);
  return r.data!;
}

export async function asaasGetCustomer(id: string): Promise<AsaasCustomer | null> {
  const r = await asaasFetch<AsaasCustomer>("GET", `/customers/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Asaas get customer failed: ${r.raw}`);
  return r.data!;
}

// ─────────────────────────────────────────────────────────
// Pagamentos avulsos (Pix)
// ─────────────────────────────────────────────────────────
export async function asaasCreatePixPayment(input: {
  customerId: string;
  value: number;
  description: string;
  dueDate: string; // YYYY-MM-DD
  externalReference?: string;
}): Promise<AsaasPayment> {
  const r = await asaasFetch<AsaasPayment>("POST", "/payments", {
    customer: input.customerId,
    billingType: "PIX",
    value: input.value,
    dueDate: input.dueDate,
    description: input.description,
    externalReference: input.externalReference,
  });
  if (!r.ok) throw new Error(`Asaas create pix failed: ${r.raw}`);
  return r.data!;
}

export async function asaasGetPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  const r = await asaasFetch<AsaasPixQrCode>(
    "GET",
    `/payments/${paymentId}/pixQrCode`
  );
  if (!r.ok) throw new Error(`Asaas get qrcode failed: ${r.raw}`);
  return r.data!;
}

export async function asaasGetPayment(id: string): Promise<AsaasPayment> {
  const r = await asaasFetch<AsaasPayment>("GET", `/payments/${id}`);
  if (!r.ok) throw new Error(`Asaas get payment failed: ${r.raw}`);
  return r.data!;
}

// ─────────────────────────────────────────────────────────
// Assinaturas (cartão recorrente)
// ─────────────────────────────────────────────────────────
export async function asaasCreateSubscription(input: {
  customerId: string;
  value: number;
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference?: string;
  billingType?: "CREDIT_CARD" | "PIX" | "BOLETO";
}): Promise<AsaasSubscription> {
  const r = await asaasFetch<AsaasSubscription>("POST", "/subscriptions", {
    customer: input.customerId,
    billingType: input.billingType || "CREDIT_CARD",
    value: input.value,
    cycle: input.cycle,
    description: input.description,
    externalReference: input.externalReference,
  });
  if (!r.ok) throw new Error(`Asaas create subscription failed: ${r.raw}`);
  return r.data!;
}

export async function asaasGetSubscription(id: string): Promise<AsaasSubscription> {
  const r = await asaasFetch<AsaasSubscription>("GET", `/subscriptions/${id}`);
  if (!r.ok) throw new Error(`Asaas get subscription failed: ${r.raw}`);
  return r.data!;
}

export async function asaasCancelSubscription(id: string): Promise<void> {
  const r = await asaasFetch("DELETE", `/subscriptions/${id}`);
  if (!r.ok && r.status !== 204) {
    throw new Error(`Asaas cancel subscription failed: ${r.raw}`);
  }
}

// ─────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────
export async function asaasPing(): Promise<boolean> {
  if (!ASAAS_KEY) return false;
  try {
    const r = await asaasFetch<{ data: any[] }>("GET", "/customers?limit=1");
    return r.ok;
  } catch {
    return false;
  }
}
