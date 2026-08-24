import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/auth.routes";
import { memberRoutes } from "./modules/members/member.routes";
import { chatRoutes } from "./modules/chat/chat.routes";
import { userRoutes } from "./modules/users/users.routes";
import { documentRoutes } from "./modules/documents/documents.routes";
import { createCrudRouter } from "./modules/_crud";
import billingRoutes from "./modules/asaas/billing.routes";
import asaasWebhookRouter from "./modules/asaas/asaas.webhook";
import superAdminRoutes from "./modules/super-admin/super-admin.routes";
import lgpdRoutes from "./modules/lgpd/lgpd.routes";
import privacidadeRoutes from "./modules/lgpd/privacidade.routes";
import obpcAdminRoutes from "./modules/obpc/obpc.routes";
import obpcPublicRoutes from "./modules/obpc/obpc.public.routes";
import { authMiddleware } from "./middleware/auth";
import { requireActiveSubscription } from "./middleware/subscription";
import { asaasConfigured, ASAAS_ENV_LABEL } from "./modules/asaas/asaas.service";
import { secureStaticUploads } from "./middleware/secureUploads";

async function startServer() {
  const app = express();
  const PORT = env.PORT;

  // ==========================================
  // Helmet — headers de segurança HTTP padrão
  // (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  // ==========================================
  app.use(
    helmet({
      // CSP é gerenciado pelo Caddy; desabilita pra evitar conflito em dev
      contentSecurityPolicy: false,
      // Permite carregar o app em iframe de mesmo domínio (se necessário)
      crossOriginEmbedderPolicy: false,
    })
  );

  // ==========================================
  // CORS — restrito a origens confiáveis
  // ==========================================
  const ALLOWED_ORIGINS = [
    "https://igrejasede.fbautomacao.space",
    "https://www.igrejasede.fbautomacao.space",
    "https://qrcode.fbautomacao.space",
    "https://www.qrcode.fbautomacao.space",
    "http://localhost:3000",
    "http://localhost:3007",
    "http://localhost:5173",
  ];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permite requests sem Origin (ex: curl, mobile apps, webhooks Asaas)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        // Bloqueia com 403 (em vez de 500) sem revelar lista de origens
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "asaas-access-token", "x-asaas-access-token"],
      maxAge: 86400,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  // ==========================================
  // Rate limiter — anti brute-force no /api/auth
  // 10 tentativas a cada 15min por IP (suficiente pra esquecer senha, mas bloqueia brute force)
  // ==========================================
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Muitas tentativas. Tente novamente em 15 minutos." },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // Rate limiter global (proteção geral contra DoS / scraping)
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300, // 300 req/min por IP (razoável pra um app em uso)
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Rate limit exceeded" },
  });
  app.use("/api", globalLimiter);

  // ==========================================
  // Webhook Asaas — PÚBLICO (validado por token próprio)
  // Tem que vir ANTES do auth + subscription
  // ==========================================
  app.use("/api/asaas", asaasWebhookRouter);

  // ==========================================
  // API Routes que não precisam de trial/assinatura
  // ==========================================
  app.use("/api/auth", authRoutes);
  app.use("/api/billing", authMiddleware, billingRoutes);
  app.use("/api/super-admin", authMiddleware, superAdminRoutes);
  app.use("/api/lgpd", lgpdRoutes);
  // Política de privacidade é pública (LGPD Art. 9 - transparência)
  app.use("/api/privacidade", privacidadeRoutes);

  // ==========================================
  // OBPC — Rotas PÚBLICAS (escaneamento QR)
  // Precisam ficar ANTES do subscription guard para que participantes
  // consigam fazer check-in mesmo se o tenant estiver em trial/vencido.
  // Não expõem dados sensíveis — apenas o necessário pro fluxo.
  // ==========================================
  app.use("/api/obpc/public", obpcPublicRoutes);

  // ==========================================
  // Subscription guard — bloqueia trial expirado / cancelado
  // (skip automático de /api/auth, /api/billing, /api/asaas/webhook, /api/health)
  // ==========================================
  app.use(requireActiveSubscription);

  // ==========================================
  // Rotas autenticadas
  // ==========================================
  app.use("/api/members", memberRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/documents", documentRoutes);

  // ==========================================
  // OBPC — Rotas ADMIN (autenticadas, dentro do tenant)
  // Eventos, cursos, frequência, SSE
  // ==========================================
  app.use("/api/obpc", obpcAdminRoutes);

  // ==========================================
  // Uploads — arquivos protegidos por auth + tenant check
  // (evita IDOR: qualquer pessoa com ID do tenant baixava tudo)
  // ==========================================
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use("/uploads", authMiddleware, secureStaticUploads);

  // Rotas CRUD genéricas (multi-tenant, soft-delete, busca, paginação)
  app.use("/api/celulas", createCrudRouter("celula", ["name", "leaderName"]));
  app.use("/api/congregations", createCrudRouter("congregation", ["name", "pastorName"]));
  app.use("/api/ministries", createCrudRouter("ministry", ["name", "leaderName"]));
  app.use("/api/events", createCrudRouter("event", ["title", "location", "type"]));
  app.use("/api/finances", createCrudRouter("financialTransaction", ["description", "category"]));
  app.use("/api/prayers", createCrudRouter("prayerRequest", ["name", "request"]));
  app.use("/api/sermons", createCrudRouter("sermon", ["title", "theme", "passage"]));
  app.use("/api/volunteers", createCrudRouter("volunteerRoster", ["name", "ministry", "role"]));
  app.use("/api/murals", createCrudRouter("muralNotice", ["title", "content"]));
  app.use("/api/assets", createCrudRouter("asset", ["name", "type"]));

  // ==========================================
  // Health check
  // ==========================================
  app.get("/api/health", (_req, res) => {
    const dbKind = (env.DATABASE_URL || "").startsWith("postgres") ? "PostgreSQL" : "SQLite";
    res.json({ status: "ok", app: "Kairos Church Platform", db: dbKind, auth: "JWT" });
  });

  // ==========================================
  // Global error handler
  // ==========================================
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, error: err.message || "Erro interno" });
  });

  // ==========================================
  // Vite (dev) or Static (prod)
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    const dbKind = (env.DATABASE_URL || "").startsWith("postgres") ? "PostgreSQL" : "SQLite";
    console.log(`Kairos Church API running on http://localhost:${PORT}`);
    console.log(`  DB: ${dbKind} | Auth: JWT | Multi-tenant`);
  });
}

startServer();