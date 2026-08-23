# QRCODE — Sistema de Cadastro e Presença de Obreiros (OBPC)

App web/PWA para cadastro, identificação e controle de presença de
obreiros e candidatos a obreiros, usando **QR Code** para registrar
presença de forma rápida durante reuniões, cultos, congressos e cursos.

> Fork white-label do [Kairos Igreja](https://github.com/appfbj-stack/kairos-igreja),
> focado no fluxo de obreiros da OBPC (Organização Batista Pentecostal
> Central).

---

## ✨ Funcionalidades (MVP)

- [x] Cadastro de obreiros (via Membros do Kairos)
- [x] Cadastro rápido pelo celular no momento do check-in
- [x] Cadastro de candidatos em formação
- [x] Geração de QR Code do evento (token rotativo)
- [x] Check-in público via leitura de QR (mobile)
- [x] **Painel em tempo real** ("Modo Telão") com SSE
- [x] Contadores por função eclesiástica
- [x] Estatísticas por igreja
- [x] Prevenção de presença duplicada (unique constraint)
- [x] Cursos de formação + controle de frequência
- [x] Multi-tenant (SaaS) — cada igreja com seu isolamento
- [x] LGPD: aceite de termo no cadastro rápido
- [x] PWA instalável (offline-friendly)
- [x] CORS restrito, helmet, rate limit

---

## 🚀 Stack

- **Frontend:** Next.js / React 19 + TypeScript + Tailwind CSS 4 + Vite
- **Backend:** Node.js + Express + TypeScript
- **Banco:** PostgreSQL (via Prisma 7 driver adapter)
- **Tempo real:** Server-Sent Events (SSE)
- **Auth:** JWT (HS256) com bcrypt
- **Deploy:** Docker + Dokploy
- **PWA:** manifest.json + service worker

---

## 🛣️ Rotas principais

### Admin (autenticado)
| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/obpc/events` | Lista eventos do tenant |
| POST | `/api/obpc/events` | Cria evento |
| PATCH | `/api/obpc/events/:id` | Edita |
| POST | `/api/obpc/events/:id/open` | Abre + gera QR |
| POST | `/api/obpc/events/:id/close` | Encerra |
| POST | `/api/obpc/events/:id/rotate-qr` | Rotaciona QR |
| GET | `/api/obpc/events/:id/attendances` | Lista presenças |
| GET | `/api/obpc/events/:id/stats` | Contadores (função/igreja) |
| GET | `/api/obpc/events/:id/stream` | **SSE autenticado** |
| GET/POST/PATCH/DELETE | `/api/obpc/courses[/:id]` | CRUD de cursos |
| POST/DELETE | `/api/obpc/courses/:id/enrollments[/:id]` | Matrícula |
| POST/GET | `/api/obpc/courses/:id/classes` | Aulas |
| POST | `/api/obpc/classes/:id/attendance[/bulk]` | Frequência |

### Público (escaneamento)
| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/obpc/public/event/:token` | Dados do evento (status, nome, etc) |
| GET | `/api/obpc/public/event/:token/stream` | **SSE público** (Modo Telão) |
| GET | `/api/obpc/public/event/:token/stats` | Stats iniciais do telão |
| GET | `/api/obpc/public/members/lookup` | Autocomplete (mínimo 2 chars) |
| POST | `/api/obpc/public/checkin` | Registra presença (membro existente) |
| POST | `/api/obpc/public/quick-register` | Cadastro rápido + check-in |

### Frontend (rotas React)
- `/` — login (app principal Kairos)
- `/telao/:token` — **Modo Telão** (público, projetado em TV)
- `/checkin/:token` — Check-in mobile (público)
- `/privacidade` — Política de privacidade (LGPD)

---

## 📦 Setup local

```bash
# 1. Variáveis
cp .env.example .env
# editar DATABASE_URL com seu Postgres

# 2. Dependências
npm install

# 3. Migrations
npx prisma migrate deploy

# 4. Dev
npm run dev
# (server + Vite HMR em http://localhost:3000)
```

### Build de produção

```bash
npm run build
npm start
```

---

## 🐳 Deploy

```bash
docker build -t qrcode-obreiros:v1.0.0 .
docker run -d \
  --name qrcode-app \
  --network dokploy-network \
  -p 3013:3013 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  qrcode-obreiros:v1.0.0
```

---

## 🧪 Smoke test

```bash
# 1. Login (gera JWT)
TOKEN=$(curl -s -X POST http://localhost:3013/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@igreja.com","password":"..."}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# 2. Criar evento
EVENT=$(curl -s -X POST http://localhost:3013/api/obpc/events \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Reunião de Obreiros","date":"2026-08-30T19:00:00Z"}')
EVENT_ID=$(echo $EVENT | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")

# 3. Abrir (gera QR token)
curl -s -X POST http://localhost:3013/api/obpc/events/$EVENT_ID/open \
  -H "Authorization: Bearer $TOKEN"
# → retorna qrToken no JSON

# 4. Acessar telão
# → https://<host>/telao/<qrToken>

# 5. Check-in público
curl -s -X POST http://localhost:3013/api/obpc/public/checkin \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"<qrToken>\",\"memberId\":\"<memberId>\"}"
```

---

## 🏛️ Arquitetura

```
┌──────────────────┐    ┌────────────────────────────────────┐
│  Admin (web)     │───▶│  /api/obpc (autenticado, JWT)      │
│  ObpcAdminView   │    │  - eventos, cursos, frequencia     │
└──────────────────┘    │  - SSE autenticado                 │
                        └────────┬───────────────────────────┘
                                 │  EventEmitter (SSE)
┌──────────────────┐             ▼
│  Telão (TV)      │◀─── ┌────────────────────────────────────┐
│  /telao/:token   │     │  /api/obpc/public (sem auth)        │
│  ObpcTelaoView   │◀────│  - GET event/stream                 │
└──────────────────┘     │  - POST checkin                     │
                         │  - POST quick-register              │
┌──────────────────┐     └────────────────────────────────────┘
│  Celular         │───▶
│  /checkin/:token │  HTTP
│  ObpcCheckinView │
└──────────────────┘
```

---

## 🔒 Segurança

- **Helmet** para headers HTTP padrão
- **CORS** restrito a origens confiáveis
- **Rate limit** no /api/auth (10/15min) e global (300/min)
- **Multi-tenant** via `tenantId` em toda tabela
- **Anti-duplicado** via `@@unique([eventId, memberId])`
- **LGPD**: aceite explícito no cadastro rápido
- **JWT_SECRET** em env var, rotacionado periodicamente

---

## 📜 Roadmap

### Fase 2
- [ ] QR Code individual do obreiro (carteirinha)
- [ ] Foto do obreiro
- [ ] Carteirinha digital
- [ ] Notificações por WhatsApp
- [ ] Importação Excel de obreiros
- [ ] Exportação PDF de relatórios
- [ ] Dashboard regional
- [ ] Geração de certificados

---

## 🤝 Créditos

- **Base:** [Kairos Igreja](https://github.com/appfbj-stack/kairos-igreja) (fork white-label)
- **OBPC:** Organização Batista Pentecostal Central
- **Idealizador:** Pastor Fernando Borges

---

## Licença

Privado — uso interno OBPC.
