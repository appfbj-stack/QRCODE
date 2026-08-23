/**
 * privacidade.routes.ts
 *
 * Pagina publica da Politica de Privacidade (LGPD Art. 9)
 * Sem autenticacao - qualquer pessoa pode ler antes de aceitar
 */

import { Router, Request, Response } from "express";

const router = Router();

const POLITICA = {
  versao: "v1.0-2026-08-22",
  vigencia: "2026-08-22",
  empresa: "Kairos Igreja (igreja local)",
  controladora: "Igreja local (cada congregacao e sua propria controladora)",
  operadora: "Kairos Tecnologia (operadora da plataforma)",
  contato: {
    email: "privacidade@kairos-igreja.local",
    responsavel: "Pastor / Lideranca local de cada igreja",
  },
  dpo: {
    nome: "A definir por cada igreja",
    email: "dpo@kairos-igreja.local",
  },
  suboperadores: [
    { nome: "Asaas", servico: "Cobrança / Billing", url: "https://asaas.com" },
    { nome: "Dokploy + Hetzner", servico: "Hospedagem do servidor", url: "https://dokploy.com" },
    { nome: "Cloudflare/DNS", servico: "DNS", url: "https://cloudflare.com" },
  ],
  baseLegal: "Consentimento (Art. 11, I LGPD) - dado sensivel (religiao) e execucao de contrato (Art. 7, V)",
  finalidades: [
    "Cadastro e gestao de membros da igreja",
    "Comunicação sobre eventos, escalas e avisos da comunidade",
    "Organizacao de celulas, ministerios e grupos",
    "Controle financeiro de dizimos, ofertas e contribuicoes",
    "Cumprimento de obrigacoes legais e fiscais",
  ],
  dadosColetados: [
    { campo: "Nome completo", obrigatorio: true, finalidade: "Identificacao" },
    { campo: "Email", obrigatorio: false, finalidade: "Comunicacao" },
    { campo: "Telefone", obrigatorio: false, finalidade: "Comunicacao / WhatsApp" },
    { campo: "Data de nascimento", obrigatorio: false, finalidade: "Aniversariantes" },
    { campo: "Endereco", obrigatorio: false, finalidade: "Visitacao" },
    { campo: "CPF", obrigatorio: false, finalidade: "Emissao de carteirinha / declaracoes" },
    { campo: "Estado civil", obrigatorio: false, finalidade: "Acompanhamento pastoral" },
    { campo: "Data de batismo", obrigatorio: false, finalidade: "Acompanhamento espiritual" },
    { campo: "Ministerios / celula", obrigatorio: false, finalidade: "Organizacao da comunidade" },
    { campo: "Filhos (filiacao)", obrigatorio: false, finalidade: "Acompanhamento pastoral" },
  ],
  compartilhamento: "Os dados sao compartilhados SOMENTE com: (a) lideranca da sua congregacao; (b) suboperadores listados acima. NUNCA vendidos ou compartilhados com terceiros para marketing.",
  retencao: "Os dados sao mantidos enquanto voce for membro ativo. Apos solicitacao de exclusao, sao anonimizados em ate 30 dias (mantendo apenas estatisticas agregadas).",
  seguranca: "HTTPS, criptografia de senhas (bcrypt 12 rounds), autenticacao JWT, rate limiting, auditoria de acessos, container rodando com usuario nao-root.",
  direitos: [
    "Acessar seus dados (exportacao em JSON)",
    "Corrigir dados incompletos ou desatualizados",
    "Solicitar exclusao (direito ao esquecimento)",
    "Revogar consentimento a qualquer momento",
    "Solicitar portabilidade dos dados",
    "Reclamar a Autoridade Nacional (ANPD)",
  ],
  retencao_categorias: {
    "Dados de membros ativos": "Enquanto for membro ativo",
    "Dados financeiros": "5 anos (obrigacao fiscal)",
    "Logs de auditoria": "5 anos (Art. 37 LGPD)",
    "Backups": "90 dias (rolling)",
  },
};

router.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, data: POLITICA });
});

export default router;
