/**
 * billing.routes.ts
 *
 * Endpoints REST para a área "Assinatura" do painel admin:
 *  - GET   /api/billing/status            → status do tenant (trial/ativa/expirada)
 *  - POST  /api/billing/customer          → cria/recupera customer Asaas
 *  - POST  /api/billing/checkout/pix      → gera pagamento Pix avulso
 *  - POST  /api/billing/checkout/card     → cria assinatura recorrente no cartão
 *  - GET   /api/billing/payments          → histórico de cobranças
 *  - POST  /api/billing/cancel            → cancela assinatura
 *
 * Apenas ADMIN/SUPER_ADMIN do tenant.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../config/database";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  asaasConfigured,
  asaasCreateCustomer,
  asaasCreatePixPayment,
  asaasCreateSubscription,
  asaasCancelSubscription,
  asaasGetCustomer,
  asaasGetPixQrCode,
  asaasGetPayment,
  AsaasPayment,
  AsaasSubscription,
  ASAAS_ENV_LABEL,
} from "./asaas.service";
import { env } from "../../env";

const router = Router();

// ─── helpers ─────────────────────────────────────────────
const PLANS: Record<string, { value: number; cycle: "MONTHLY" | "YEARLY"; label: string; description: string }> = {
  BASICO: {
    value: 49.9,
    cycle: "MONTHLY",
    label: "Kairos Igreja — Plano Básico",
    description: "Kairos Igreja · Plano Básico · Mensal",
  },
  PRO: {
    value: 99.9,
    cycle: "MONTHLY",
    label: "Kairos Igreja — Plano Pro",
    description: "Kairos Igreja · Plano Pro · Mensal",
  },
};

function todayPlusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function requireAdmin(req: Request, res: Response): boolean {
  const role = req.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    res.status(403).json({ success: false, error: "Acesso restrito a administradores" });
    return false;
  }
  return true;
}

async function ensureAsaasCustomer(tenantId: string, userId: string, name: string, email: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant não encontrado");

  if (tenant.asaasCustomerId) {
    const existing = await asaasGetCustomer(tenant.asaasCustomerId);
    if (existing) return existing;
  }

  // Cria novo customer vinculado ao tenant
  const created = await asaasCreateCustomer({
    name,
    email,
    mobilePhone: undefined,
    externalReference: `tenant:${tenantId}:user:${userId}`,
  });
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { asaasCustomerId: created.id },
  });
  return created;
}

// ─────────────────────────────────────────────────────────
// GET /api/billing/status
// ─────────────────────────────────────────────────────────
router.get(
  "/status",
  asyncHandler(async (req: Request, res: Response) => {
    if (!asaasConfigured()) {
      return res.json({
        configured: false,
        env: ASAAS_ENV_LABEL,
        status: "NO_ASAAS_KEY",
        trialEndsAt: null,
        subscriptionEndsAt: null,
        plan: "BASICO",
        planValue: PLANS.BASICO.value,
        message: "Billing Asaas não configurado neste ambiente",
      });
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    if (!tenant) return res.status(404).json({ success: false, error: "Tenant não encontrado" });

    const now = new Date();
    const inTrial =
      tenant.subscriptionStatus === "TRIAL" &&
      tenant.trialEndsAt &&
      tenant.trialEndsAt > now;

    const daysLeftInTrial = tenant.trialEndsAt
      ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : 0;

    return res.json({
      configured: true,
      env: ASAAS_ENV_LABEL,
      status: tenant.subscriptionStatus,
      inTrial,
      daysLeftInTrial,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      plan: tenant.planKey,
      planValue: PLANS[tenant.planKey]?.value || PLANS.BASICO.value,
      planLabel: PLANS[tenant.planKey]?.label || PLANS.BASICO.label,
      asaasCustomerId: tenant.asaasCustomerId,
      asaasSubscriptionId: tenant.asaasSubscriptionId,
      recentPayments: tenant.payments,
    });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/billing/checkout/pix  — gera pagamento Pix avulso
// ─────────────────────────────────────────────────────────
router.post(
  "/checkout/pix",
  asyncHandler(async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    if (!asaasConfigured()) {
      return res.status(503).json({ success: false, error: "Asaas não configurado" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
    if (!tenant) return res.status(404).json({ success: false, error: "Tenant não encontrado" });

    const plan = PLANS[tenant.planKey] || PLANS.BASICO;
    const customer = await ensureAsaasCustomer(
      tenant.id,
      req.user!.userId,
      tenant.name,
      req.user!.email || "admin@kairos.com"
    );

    const payment = await asaasCreatePixPayment({
      customerId: customer.id,
      value: plan.value,
      description: `${plan.description} · ${new Date().toLocaleDateString("pt-BR")}`,
      dueDate: todayPlusDaysISO(3),
      externalReference: `tenant:${tenant.id}`,
    });

    const qr = await asaasGetPixQrCode(payment.id);

    // Persistir no banco
    await prisma.asaasPayment.create({
      data: {
        tenantId: tenant.id,
        type: "PIX",
        status: "PENDING",
        asaasCustomerId: customer.id,
        asaasPaymentId: payment.id,
        value: plan.value,
        description: payment.description,
        dueDate: new Date(payment.dueDate),
        pixQrCodeId: payment.id,
        pixQrCode: qr.encodedImage,
        pixCopyPaste: qr.payload,
        pixExpiresAt: new Date(qr.expirationDate),
        invoiceUrl: payment.invoiceUrl,
        raw: payment as any,
      },
    });

    return res.json({
      success: true,
      paymentId: payment.id,
      value: payment.value,
      dueDate: payment.dueDate,
      invoiceUrl: payment.invoiceUrl,
      pix: {
        qrCodeBase64: qr.encodedImage,
        copyPaste: qr.payload,
        expiresAt: qr.expirationDate,
      },
    });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/billing/checkout/card — cria subscription recorrente
// Retorna o link de checkout do Asaas onde o membro coloca cartão
// ─────────────────────────────────────────────────────────
router.post(
  "/checkout/card",
  asyncHandler(async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    if (!asaasConfigured()) {
      return res.status(503).json({ success: false, error: "Asaas não configurado" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
    if (!tenant) return res.status(404).json({ success: false, error: "Tenant não encontrado" });

    const plan = PLANS[tenant.planKey] || PLANS.BASICO;
    const customer = await ensureAsaasCustomer(
      tenant.id,
      req.user!.userId,
      tenant.name,
      req.user!.email || "admin@kairos.com"
    );

    // Se já tem subscription, retorna ela
    if (tenant.asaasSubscriptionId) {
      try {
        const existing = await asaasGetSubscription(tenant.asaasSubscriptionId);
        if (existing.status === "ACTIVE") {
          return res.json({
            success: true,
            subscriptionId: existing.id,
            status: existing.status,
            nextDueDate: existing.nextDueDate,
            value: existing.value,
            invoiceUrl: existing.id
              ? `${process.env.ASAAS_INVOICE_BASE || "https://www.asaas.com/i"}/${existing.id}`
              : null,
            message: "Assinatura já ativa",
          });
        }
      } catch {
        // Cai pra criar uma nova
      }
    }

    const sub = await asaasCreateSubscription({
      customerId: customer.id,
      value: plan.value,
      cycle: plan.cycle,
      description: plan.description,
      externalReference: `tenant:${tenant.id}`,
    });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        asaasSubscriptionId: sub.id,
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date(sub.nextDueDate),
      },
    });

    return res.json({
      success: true,
      subscriptionId: sub.id,
      status: sub.status,
      nextDueDate: sub.nextDueDate,
      value: sub.value,
      invoiceUrl: sub.id
        ? `${process.env.ASAAS_INVOICE_BASE || "https://www.asaas.com/i"}/${sub.id}`
        : null,
    });
  })
);

// ─────────────────────────────────────────────────────────
// GET /api/billing/payments
// ─────────────────────────────────────────────────────────
router.get(
  "/payments",
  asyncHandler(async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const list = await prisma.asaasPayment.findMany({
      where: { tenantId: req.user!.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.json({ success: true, data: list });
  })
);

// ─────────────────────────────────────────────────────────
// POST /api/billing/cancel — cancela assinatura
// ─────────────────────────────────────────────────────────
router.post(
  "/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
    if (!tenant || !tenant.asaasSubscriptionId) {
      return res.status(400).json({ success: false, error: "Sem assinatura ativa" });
    }
    try {
      await asaasCancelSubscription(tenant.asaasSubscriptionId);
    } catch (e: any) {
      // pode já estar cancelada
    }
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: "CANCELLED",
        asaasSubscriptionId: null,
      },
    });
    return res.json({ success: true, message: "Assinatura cancelada" });
  })
);

export default router;
