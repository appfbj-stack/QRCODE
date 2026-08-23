/**
 * BillingView.tsx
 *
 * Tela "Assinatura" do painel admin.
 * Mostra:
 *  - Status (TRIAL, ACTIVE, OVERDUE, CANCELLED, EXPIRED)
 *  - Dias restantes do trial
 *  - Plano atual + valor
 *  - Botão "Pagar com Pix" → gera QR Code
 *  - Botão "Pagar com Cartão" → cria subscription
 *  - Histórico de pagamentos
 *
 * Acesso: ADMIN/SUPER_ADMIN
 */

import React, { useEffect, useState } from 'react';
import {
  CreditCard, QrCode, Calendar, CheckCircle2, AlertTriangle,
  X, Clock, RefreshCw, ExternalLink, Copy, Sparkles,
} from 'lucide-react';

interface BillingStatus {
  configured: boolean;
  env: string;
  status: string;            // TRIAL | ACTIVE | OVERDUE | CANCELLED | EXPIRED | NO_ASAAS_KEY
  inTrial: boolean;
  daysLeftInTrial: number;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  plan: string;
  planValue: number;
  planLabel: string;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  recentPayments: AsaasPayment[];
}

interface AsaasPayment {
  id: string;
  type: 'SUBSCRIPTION' | 'PIX' | 'UNKNOWN';
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED' | 'UNKNOWN';
  value: number;
  description: string;
  dueDate: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  pixExpiresAt: string | null;
  createdAt: string;
}

interface BillingViewProps {
  onLogout?: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onLogout }) => {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pixModal, setPixModal] = useState<{ qrCodeBase64: string; copyPaste: string; expiresAt: string; value: number; paymentId: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('kairos_token');
      const res = await fetch('/api/billing/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.status === 402) {
        // Trial expirado — o modal de bloqueio global vai mostrar
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar');
      setStatus(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const generatePix = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem('kairos_token');
      const res = await fetch('/api/billing/checkout/pix', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar Pix');
      setPixModal({
        qrCodeBase64: json.pix.qrCodeBase64,
        copyPaste: json.pix.copyPaste,
        expiresAt: json.pix.expiresAt,
        value: json.value,
        paymentId: json.paymentId,
      });
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const generateCard = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem('kairos_token');
      const res = await fetch('/api/billing/checkout/card', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao criar assinatura');
      if (json.invoiceUrl) {
        window.open(json.invoiceUrl, '_blank');
      }
      showToast('Assinatura criada! Complete o pagamento no link aberto.', 'success');
      await load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar a assinatura?')) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('kairos_token');
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao cancelar');
      showToast('Assinatura cancelada', 'success');
      await load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Código copiado!', 'success');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#a68a64] mx-auto mb-2 animate-spin" />
          <p className="text-sm text-[#7a7060]">Carregando informações de assinatura...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f5f5f0] p-6">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="font-bold text-lg text-rose-700 mb-1">Erro ao carregar</h2>
          <p className="text-sm text-[#7a7060]">{error}</p>
          <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-[#5a5a40] text-white text-sm font-bold">
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const statusColor: Record<string, string> = {
    TRIAL: 'bg-amber-100 text-amber-700 border-amber-300',
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    OVERDUE: 'bg-rose-100 text-rose-700 border-rose-300',
    CANCELLED: 'bg-slate-100 text-slate-700 border-slate-300',
    EXPIRED: 'bg-rose-100 text-rose-700 border-rose-300',
    NO_ASAAS_KEY: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const statusLabel: Record<string, string> = {
    TRIAL: 'Período de Teste',
    ACTIVE: 'Assinatura Ativa',
    OVERDUE: 'Pagamento em Atraso',
    CANCELLED: 'Assinatura Cancelada',
    EXPIRED: 'Assinatura Expirada',
    NO_ASAAS_KEY: 'Billing não configurado',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f5f0] overflow-y-auto">
      <div className="px-6 py-5 bg-white border-b border-[#e8e4d8]">
        <h1 className="text-2xl font-serif font-bold text-[#2a2a20] flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-[#a68a64]" />
          Assinatura da Plataforma
        </h1>
        <p className="text-xs text-[#7a7060] mt-1">
          Gerencie o plano da sua igreja no Kairos Igreja
        </p>
      </div>

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Card principal de status */}
        <div className="bg-white rounded-2xl border border-[#e8e4d8] p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-widest uppercase text-[#7a7060] mb-1">Status Atual</p>
              <span className={`inline-block px-3 py-1 rounded-full border text-xs font-extrabold uppercase tracking-wider ${statusColor[status.status] || statusColor.TRIAL}`}>
                {statusLabel[status.status] || status.status}
              </span>
              {status.env && status.configured && (
                <p className="text-[10px] text-[#7a7060] mt-2">Ambiente: <strong className="text-[#5a5a40]">{status.env}</strong></p>
              )}
            </div>

            {status.inTrial && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-xs">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  {status.daysLeftInTrial} dias restantes
                </div>
                <p className="text-xs text-amber-700">
                  Após o trial, escolha um plano para continuar usando. Os dados ficam preservados.
                </p>
              </div>
            )}

            {status.status === 'ACTIVE' && status.subscriptionEndsAt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 max-w-xs">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Acesso liberado
                </div>
                <p className="text-xs text-emerald-700">
                  Próxima cobrança: {new Date(status.subscriptionEndsAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>

          <hr className="my-5 border-[#e8e4d8]" />

          <div>
            <p className="text-xs font-extrabold tracking-widest uppercase text-[#7a7060] mb-2">Plano</p>
            <h2 className="text-xl font-bold text-[#2a2a20]">{status.planLabel}</h2>
            <p className="text-3xl font-extrabold text-[#5a5a40] mt-1">
              R$ {status.planValue.toFixed(2).replace('.', ',')}
              <span className="text-sm font-normal text-[#7a7060]">/mês</span>
            </p>
          </div>

          {/* Botões de ação */}
          {status.configured && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={generatePix}
                disabled={busy}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-md disabled:opacity-50"
              >
                <QrCode className="w-4 h-4" />
                Pagar com Pix
              </button>
              <button
                onClick={generateCard}
                disabled={busy}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#5a5a40] hover:bg-[#4d4d36] text-white text-sm font-bold shadow-md disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {status.status === 'ACTIVE' ? 'Renovar com Cartão' : 'Pagar com Cartão'}
              </button>
              {status.status === 'ACTIVE' && (
                <button
                  onClick={cancelSubscription}
                  disabled={busy}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          )}

          {!status.configured && (
            <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <strong>Modo dev:</strong> defina <code className="bg-amber-100 px-1 rounded">ASAAS_API_KEY</code> no Dokploy para ativar billing.
            </div>
          )}
        </div>

        {/* Recursos do plano */}
        <div className="bg-white rounded-2xl border border-[#e8e4d8] p-6">
          <h3 className="font-bold text-[#2a2a20] mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#a68a64]" />
            O que está incluso
          </h3>
          <ul className="space-y-2 text-sm text-[#5a5a40]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Membros, células, ministérios, patrimônio
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Agenda & eventos com check-in
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Mural, oração, sermões, voluntários
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Gestão de documentos (PDFs, fotos, manuais)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Chat pastoral entre líderes
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Multi-tenant (múltiplas congregações)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Suporte por email
            </li>
          </ul>
        </div>

        {/* Histórico */}
        {status.recentPayments && status.recentPayments.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e8e4d8] p-6">
            <h3 className="font-bold text-[#2a2a20] mb-4">Histórico de Cobranças</h3>
            <div className="space-y-2">
              {status.recentPayments.map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal do Pix */}
      {pixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a2a20]/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-bold text-[#2a2a20] flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-500" />
                Pagar com Pix
              </h2>
              <button onClick={() => setPixModal(null)} className="p-1.5 rounded-lg hover:bg-[#f5f0e0] text-[#7a7060]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-emerald-600 mb-3">
                R$ {pixModal.value.toFixed(2).replace('.', ',')}
              </p>
              <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 inline-block">
                <img
                  src={`data:image/png;base64,${pixModal.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-56 h-56"
                />
              </div>
              <p className="text-xs text-[#7a7060] mt-3">
                Escaneie o QR Code com o app do seu banco
              </p>

              <div className="mt-4 p-3 bg-[#f5f0e0] rounded-2xl text-left">
                <p className="text-[10px] font-extrabold tracking-widest uppercase text-[#7a7060] mb-1">
                  Ou copie e cole:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={pixModal.copyPaste}
                    className="flex-1 text-[10px] bg-white px-2 py-1.5 rounded-lg border border-[#e8e4d8] font-mono truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(pixModal.copyPaste)}
                    className="p-1.5 rounded-lg bg-[#5a5a40] text-white"
                    title="Copiar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-[#7a7060] mt-3">
                Válido até {new Date(pixModal.expiresAt).toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] text-[#a68a64] mt-1">
                Após o pagamento, o sistema libera automaticamente em alguns segundos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <div className={`px-4 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
            <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentRow: React.FC<{ payment: AsaasPayment }> = ({ payment }) => {
  const isPaid = payment.status === 'RECEIVED';
  const isOverdue = payment.status === 'OVERDUE';
  const isPending = payment.status === 'PENDING';

  const dotColor = isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-amber-500';
  const statusLabel = isPaid ? 'Pago' : isOverdue ? 'Vencido' : isPending ? 'Pendente' : payment.status;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#faf8f0] transition-colors">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#2a2a20] truncate">{payment.description}</p>
        <p className="text-[10px] text-[#7a7060]">
          {payment.type === 'PIX' ? '💚 Pix' : '💳 Cartão'} · Venc: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
          {payment.paidAt && ` · Pago em ${new Date(payment.paidAt).toLocaleDateString('pt-BR')}`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-[#2a2a20]">
          R$ {payment.value.toFixed(2).replace('.', ',')}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isPaid ? '#059669' : isOverdue ? '#e11d48' : '#d97706' }}>
          {statusLabel}
        </p>
      </div>
      {payment.invoiceUrl && (
        <a href={payment.invoiceUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-[#7a7060] hover:bg-[#f5f0e0]">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
};
