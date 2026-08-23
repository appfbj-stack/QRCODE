/**
 * asaas.webhook.ts
 *
 * Webhook que recebe notificações do Asaas:
 *   - PAYMENT_RECEIVED       → pagamento confirmado → libera/renova
 *   - PAYMENT_OVERDUE        → cobrança venceu
 *   - PAYMENT_REFUNDED       → estorno
 *   - SUBSCRIPTION_DELETED   → assinatura cancelada no Asaas
 *   - SUBSCRIPTION_UPDATED   → mudou status
 *
 * URL: https://igrejasede.fbautomacao.space/api/asaas/webhook
 * Autenticação: header `asaas-access-token: <ASAAS_WEBHOOK_TOKEN>`
 *                configurado no painel do Asaas
 *
 * Observação: rotas /api/asaas/webhook são públicas (sem JWT),
 * validadas pelo token do Asaas.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../config/database";

const router = Router();

const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || "";

function unauthorized(res: Response) {
  res.status(401).json({ success: false, error: "Token inválido" });
}

router.post(
  "/webhook",
  async (req: Request, res: Response) => {
    // Validação de token do Asaas
    if (!WEBHOOK_TOKEN) {
      console.warn("[asaas-webhook] ASAAS_WEBHOOK_TOKEN não definido — bloqueando por segurança");
      return unauthorized(res);
    }
    const tokenHeader =
      (req.headers["asaas-access-token"] as string) ||
      (req.headers["x-asaas-access-token"] as string) ||
      "";
    if (tokenHeader !== WEBHOOK_TOKEN) {
      return unauthorized(res);
    }

    // Asaas sempre responde 200 rapidamente pra não ficar reenviando
    res.status(200).json({ success: true });

    const event = req.body;
    if (!event || !event.event) return;

    console.log(`[asaas-webhook] ${event.event}`, JSON.stringify(event.payment || event.subscription || event).slice(0, 300));

    try {
      switch (event.event) {
        case "PAYMENT_RECEIVED":
        case "PAYMENT_CONFIRMED":
        case "PAYMENT_RECEIVED_IN_CASH": {
          const p = event.payment;
          if (!p) break;
          // Localizar pagamento local pelo asaasPaymentId
          const local = await prisma.asaasPayment.findFirst({
            where: { asaasPaymentId: p.id },
          });
          if (local) {
            await prisma.asaasPayment.update({
              where: { id: local.id },
              data: {
                status: "RECEIVED",
                paidAt: p.paymentDate ? new Date(p.paymentDate) : new Date(),
                raw: p,
              },
            });
            // Atualizar status do tenant
            if (local.tenantId) {
              await prisma.tenant.update({
                where: { id: local.tenantId },
                data: {
                  subscriptionStatus: "ACTIVE",
                  subscriptionEndsAt: new Date(Date.now() + 30 * 86400000), // +30d
                },
              });
            }
          } else {
            // Pode ser parcela de assinatura — localizar via subscriptionId
            if (p.subscription) {
              const tenant = await prisma.tenant.findFirst({
                where: { asaasSubscriptionId: p.subscription },
              });
              if (tenant) {
                await prisma.tenant.update({
                  where: { id: tenant.id },
                  data: {
                    subscriptionStatus: "ACTIVE",
                    subscriptionEndsAt: new Date(Date.now() + 30 * 86400000),
                  },
                });
                await prisma.asaasPayment.create({
                  data: {
                    tenantId: tenant.id,
                    type: "SUBSCRIPTION",
                    status: "RECEIVED",
                    asaasCustomerId: p.customer,
                    asaasPaymentId: p.id,
                    asaasSubscriptionId: p.subscription,
                    value: p.value,
                    description: p.description || "Parcela de assinatura",
                    dueDate: new Date(p.dueDate),
                    paidAt: p.paymentDate ? new Date(p.paymentDate) : new Date(),
                    raw: p,
                  },
                });
              }
            }
          }
          break;
        }

        case "PAYMENT_OVERDUE": {
          const p = event.payment;
          if (!p) break;
          await prisma.asaasPayment.updateMany({
            where: { asaasPaymentId: p.id },
            data: { status: "OVERDUE", raw: p },
          });
          // Marca tenant em OVERDUE (mas não bloqueia imediatamente — grace period)
          if (p.subscription) {
            const tenant = await prisma.tenant.findFirst({
              where: { asaasSubscriptionId: p.subscription },
            });
            if (tenant) {
              await prisma.tenant.update({
                where: { id: tenant.id },
                data: { subscriptionStatus: "OVERDUE" },
              });
            }
          }
          break;
        }

        case "PAYMENT_REFUNDED": {
          const p = event.payment;
          if (!p) break;
          await prisma.asaasPayment.updateMany({
            where: { asaasPaymentId: p.id },
            data: { status: "REFUNDED", raw: p },
          });
          break;
        }

        case "SUBSCRIPTION_DELETED":
        case "SUBSCRIPTION_INACTIVE": {
          const s = event.subscription;
          if (!s) break;
          const tenant = await prisma.tenant.findFirst({
            where: { asaasSubscriptionId: s.id },
          });
          if (tenant) {
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: {
                subscriptionStatus: "CANCELLED",
                asaasSubscriptionId: null,
              },
            });
          }
          break;
        }

        case "SUBSCRIPTION_UPDATED": {
          const s = event.subscription;
          if (!s) break;
          const tenant = await prisma.tenant.findFirst({
            where: { asaasSubscriptionId: s.id },
          });
          if (tenant) {
            const status =
              s.status === "ACTIVE"
                ? "ACTIVE"
                : s.status === "EXPIRED"
                ? "EXPIRED"
                : "CANCELLED";
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: {
                subscriptionStatus: status,
                subscriptionEndsAt: s.nextDueDate
                  ? new Date(s.nextDueDate)
                  : undefined,
              },
            });
          }
          break;
        }

        default:
          console.log(`[asaas-webhook] evento ignorado: ${event.event}`);
      }
    } catch (err: any) {
      console.error("[asaas-webhook] erro processando evento:", err.message);
    }
  }
);

export default router;
