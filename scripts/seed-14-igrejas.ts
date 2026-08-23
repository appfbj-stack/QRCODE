/**
 * scripts/seed-14-igrejas.ts
 *
 * Cria a rede Kairos Igreja completa:
 *  - 1 Tenant (rede)
 *  - 14 Congregations (1 Sede + 13 filiais no DF/Entorno)
 *  - 1 ADMIN (Sede, sem congregação, vê tudo)
 *  - 1 GERENTE por congregação (vê só a dele)
 *  - MOCAP pastoral: membros, células, evento, finanças, patrimônio, oração
 *
 * Idempotente: pode rodar quantas vezes quiser. Se já existe, atualiza.
 * Se já existe mocap, NÃO duplica (checa contagem mínima).
 *
 * Uso:
 *   docker exec -i kairos-igreja-app npx tsx scripts/seed-14-igrejas.ts
 *
 * Variáveis de ambiente necessárias: DATABASE_URL, JWT_SECRET
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// ─────────────────────────────────────────────────────────
// 1. SETUP
// ─────────────────────────────────────────────────────────

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter, log: ["error"] });

const hash = (pwd: string) => bcrypt.hash(pwd, 12);

// ─────────────────────────────────────────────────────────
// 2. DEFINIÇÃO DAS 14 IGREJAS
// ─────────────────────────────────────────────────────────

type Igreja = {
  slug: string;
  name: string;
  pastorName: string;
  pastorEmail: string;
  address: string;
  phone: string;
  isSede: boolean;
};

const IGREJAS: Igreja[] = [
  { slug: "sede",        name: "Igreja Kairos — Sede",          pastorName: "Pr. Fernando Borges", pastorEmail: "admin@kairos.com",            address: "SBS Quadra 2, Brasília - DF",   phone: "(61) 99999-0001", isSede: true  },
  { slug: "cajuru",      name: "Kairos Cajuru",                  pastorName: "Pr. Carlos Silva",     pastorEmail: "pastor.cajuru@kairos.com",    address: "QN 7 Conjunto 3, Cajuru - DF", phone: "(61) 99999-0002", isSede: false },
  { slug: "taguatinga",  name: "Kairos Taguatinga",              pastorName: "Pr. Marcos Oliveira",  pastorEmail: "pastor.taguatinga@kairos.com",address: "QNG 14, Taguatinga - DF",       phone: "(61) 99999-0003", isSede: false },
  { slug: "ceilandia",   name: "Kairos Ceilândia",               pastorName: "Pr. José Santos",      pastorEmail: "pastor.ceilandia@kairos.com", address: "QNN 12, Ceilândia - DF",        phone: "(61) 99999-0004", isSede: false },
  { slug: "samambaia",   name: "Kairos Samambaia",               pastorName: "Pr. Antônio Souza",    pastorEmail: "pastor.samambaia@kairos.com", address: "QR 318, Samambaia - DF",        phone: "(61) 99999-0005", isSede: false },
  { slug: "planaltina",  name: "Kairos Planaltina",              pastorName: "Pr. Pedro Lima",       pastorEmail: "pastor.planaltina@kairos.com",address: "Av. Independência, Planaltina", phone: "(61) 99999-0006", isSede: false },
  { slug: "sobradinho",  name: "Kairos Sobradinho",              pastorName: "Pr. Lucas Pereira",    pastorEmail: "pastor.sobradinho@kairos.com",address: "Quadra Central, Sobradinho - DF",phone: "(61) 99999-0007", isSede: false },
  { slug: "gama",        name: "Kairos Gama",                    pastorName: "Pr. Daniel Costa",     pastorEmail: "pastor.gama@kairos.com",      address: "Quadra 30, Gama - DF",         phone: "(61) 99999-0008", isSede: false },
  { slug: "recanto",     name: "Kairos Recanto das Emas",        pastorName: "Pr. Tiago Almeida",    pastorEmail: "pastor.recanto@kairos.com",   address: "Quadra 104, Recanto - DF",     phone: "(61) 99999-0009", isSede: false },
  { slug: "aguasclaras", name: "Kairos Águas Claras",            pastorName: "Pr. Rafael Ferreira",  pastorEmail: "pastor.aguasclaras@kairos.com",address:"Av. das Araucárias, Águas Claras",phone: "(61) 99999-0010", isSede: false },
  { slug: "valparaiso",  name: "Kairos Valparaíso",              pastorName: "Pr. Marcelo Ribeiro",  pastorEmail: "pastor.valparaiso@kairos.com",address: "Parque Esplanada II, Valparaíso", phone: "(61) 99999-0011", isSede: false },
  { slug: "formosa",     name: "Kairos Formosa",                 pastorName: "Pr. Eduardo Cardoso",  pastorEmail: "pastor.formosa@kairos.com",   address: "Centro, Formosa - GO",         phone: "(61) 99999-0012", isSede: false },
  { slug: "luziania",    name: "Kairos Luziânia",                pastorName: "Pr. Renato Barbosa",   pastorEmail: "pastor.luziania@kairos.com",  address: "Setor Norte, Luziânia - GO",   phone: "(61) 99999-0013", isSede: false },
  { slug: "padrebernardo", name: "Kairos Padre Bernardo",        pastorName: "Pr. Felipe Moreira",   pastorEmail: "pastor.padrebernardo@kairos.com",address:"Centro, Padre Bernardo - GO", phone: "(61) 99999-0014", isSede: false },
];

// ─────────────────────────────────────────────────────────
// 3. MOCAP (nomes brasileiros plausíveis)
// ─────────────────────────────────────────────────────────

const NOMES_MASC = ["João Silva","Carlos Mendes","Pedro Henrique","Lucas Oliveira","Marcos Antônio","Rafael Souza","Daniel Santos","Tiago Ferreira","Eduardo Lima","Felipe Costa","André Almeida","Bruno Ribeiro","Henrique Cardoso","Rodrigo Barbosa","Marcelo Pereira"];
const NOMES_FEM  = ["Maria Aparecida","Ana Paula","Juliana Santos","Fernanda Lima","Camila Oliveira","Patrícia Souza","Mariana Costa","Beatriz Almeida","Larissa Ferreira","Vanessa Ribeiro","Cristina Cardoso","Gabriela Barbosa","Renata Pereira","Tatiane Silva","Adriana Mendes"];
const SOBRENOMES = ["da Silva","Santos","Oliveira","Souza","Lima","Pereira","Ferreira","Almeida","Costa","Rodrigues","Martins","Carvalho","Ribeiro","Barbosa","Cardoso"];
const STATUS_MEMBRO = ["membro","membro","membro","visitante","lider","congregado"];
const ROLES_LIDER  = ["Pastor","Presbítero","Diácono","Líder de Célula","Professor EBD","Músico","Mídia","Recepção"];

const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const cpfFake = () => `${randInt(100,999)}.${randInt(100,999)}.${randInt(100,999)}-${randInt(10,99)}`;
const dataPassada = (anos: number) => new Date(Date.now() - randInt(0, anos) * 365 * 24 * 60 * 60 * 1000);

const CELULAS = [
  { name: "Célula Norte Jovens",   meetingDay: "Sexta",  meetingTime: "20:00", leaderName: "João Silva" },
  { name: "Célula Família Sul",    meetingDay: "Sábado", meetingTime: "19:30", leaderName: "Maria Aparecida" },
  { name: "Célula Casais Central", meetingDay: "Quarta", meetingTime: "20:00", leaderName: "Pedro Henrique" },
  { name: "Célula Mães que Oram",  meetingDay: "Terça",  meetingTime: "15:00", leaderName: "Ana Paula" },
  { name: "Célula Adolescentes",   meetingDay: "Sábado", meetingTime: "17:00", leaderName: "Lucas Oliveira" },
];

const EVENTOS = [
  { title: "Culto de Celebração Dominical",  type: "culto",         time: "18:30", location: "Templo Principal" },
  { title: "Culto de Oração Semanal",        type: "oracao",        time: "19:30", location: "Templo Principal" },
  { title: "Estudo Bíblico de Quarta",       type: "estudo",        time: "20:00", location: "Salão de Estudos" },
  { title: "Congresso Anual de Família",     type: "congresso",     time: "09:00", location: "Templo Principal" },
  { title: "Ensaio do Louvor",               type: "ensaio",        time: "20:00", location: "Sala de Música" },
];

const ATIVOS = [
  { name: "Mesa de Som Yamaha MG16XU",     type: "som",          category: "som",         condition: "Bom",     estimatedValue: 4500,  location: "Sala de Som" },
  { name: "Caixa Amplificada JBL Flip 6",  type: "som",          category: "som",         condition: "Novo",    estimatedValue: 899,   location: "Templo" },
  { name: "Cadeira de Escritório Giratória",type: "mobilia",     category: "mobilia",     condition: "Bom",     estimatedValue: 450,   location: "Secretaria" },
  { name: "Notebook Dell Inspiron 15",     type: "ti",           category: "ti",          condition: "Ótimo",   estimatedValue: 3200,  location: "Secretaria" },
  { name: "Microfone Shure SM58",          type: "som",          category: "som",         condition: "Bom",     estimatedValue: 650,   location: "Sala de Som" },
];

const PEDIDOS_ORACAO = [
  { name: "Maria Aparecida",  request: "Pela saúde da minha mãe" },
  { name: "João Silva",       request: "Pela provisão da família neste mês" },
  { name: "Ana Paula",        request: "Pelo meu filho que está em momento difícil" },
  { name: "Pedro Henrique",   request: "Pela restauração do meu casamento" },
  { name: "Camila Oliveira",  request: "Pela conversão do meu esposo" },
];

// ─────────────────────────────────────────────────────────
// 4. SEED
// ─────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱  KAIROS IGREJA — SEED DE 14 IGREJAS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 4.1 — Tenant (rede)
  const tenant = await prisma.tenant.upsert({
    where: { slug: "kairos-rede" },
    update: { name: "Rede Kairos de Igrejas" },
    create: {
      name: "Rede Kairos de Igrejas",
      slug: "kairos-rede",
    },
  });
  console.log(`✓ Tenant: ${tenant.name}  (${tenant.id})`);

  // 4.2 — Admin Sede (sem congregação — vê TUDO)
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const admin = await prisma.user.upsert({
    where: { email: "admin@kairos.com" },
    update: { passwordHash: await hash(adminPassword), role: "ADMIN", congregationId: null },
    create: {
      tenantId: tenant.id,
      congregationId: null, // <-- sem congregação: vê tudo
      name: "Pr. Fernando Borges",
      email: "admin@kairos.com",
      passwordHash: await hash(adminPassword),
      role: "ADMIN",
    },
  });
  console.log(`✓ Admin Sede: ${admin.email}  (role=ADMIN, sem congregação)\n`);

  // 4.3 — 14 Congregações + Pastores + Mocap
  let congregacoesCriadas = 0;
  let membrosCriados = 0;
  let celulasCriadas = 0;
  let eventosCriados = 0;
  let financasCriadas = 0;
  let patrimoniosCriados = 0;
  let oracoesCriadas = 0;

  for (const ig of IGREJAS) {
    // ── Congregação
    const cong = await prisma.congregation.upsert({
      where: { id: `seed-${ig.slug}` }, // upsert determinístico pelo id estável
      update: {
        name: ig.name,
        pastorName: ig.pastorName,
        address: ig.address,
        phone: ig.phone,
        active: true,
      },
      create: {
        id: `seed-${ig.slug}`,
        tenantId: tenant.id,
        name: ig.name,
        address: ig.address,
        phone: ig.phone,
        pastorName: ig.pastorName,
        active: true,
      },
    });
    congregacoesCriadas++;
    const tag = ig.isSede ? "★ SEDE" : "  fil  ";
    console.log(`${tag}  ${ig.name.padEnd(34)} ${ig.pastorName}`);

    // ── Pastor (GERENTE, atrelado à sua congregação)
    const pastorPassword = process.env.SEED_PASTOR_PASSWORD || "pastor123";
    await prisma.user.upsert({
      where: { email: ig.pastorEmail },
      update: { passwordHash: await hash(pastorPassword), role: "GERENTE", congregationId: cong.id },
      create: {
        tenantId: tenant.id,
        congregationId: cong.id, // <-- escopo: só esta congregação
        name: ig.pastorName,
        email: ig.pastorEmail,
        passwordHash: await hash(pastorPassword),
        role: "GERENTE",
      },
    });

    // ── Mocap (só cria se a congregação tem menos de 3 membros)
    const membrosAtuais = await prisma.member.count({ where: { congregationId: cong.id, deletedAt: null } });
    if (membrosAtuais >= 3) {
      console.log(`        (mocap já existe — pulando)`);
      continue;
    }

    // Membros (6 por congregação)
    const todosNomes = [...NOMES_MASC, ...NOMES_FEM];
    for (let i = 0; i < 6; i++) {
      const isMasc = i % 2 === 0;
      const nomeBase = isMasc ? rand(NOMES_MASC) : rand(NOMES_FEM);
      const sobrenome = rand(SOBRENOMES);
      const fullName = `${nomeBase} ${sobrenome}`;
      const status = rand(STATUS_MEMBRO);
      await prisma.member.create({
        data: {
          tenantId: tenant.id,
          congregationId: cong.id,
          name: fullName,
          email: `${fullName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")}@gmail.com`,
          phone: `(61) 9${randInt(8000,9999)}-${randInt(1000,9999)}`,
          birthDate: dataPassada(60),
          address: `Quadra ${randInt(1,40)}, ${ig.name.replace("Kairos ", "")} - DF`,
          maritalStatus: rand(["solteiro", "casado", "casado", "divorciado", "viuvo"]),
          baptized: Math.random() > 0.4,
          memberSince: dataPassada(5),
          cpf: cpfFake(),
          status,
          role: status === "lider" ? rand(ROLES_LIDER) : (status === "membro" ? rand(ROLES_LIDER) : null),
          filiation: rand(["Pai: José da Silva", "Mãe: Maria das Dores", "Pai e Membro", ""]),
          baptismDate: Math.random() > 0.5 ? dataPassada(3) : null,
          cardValidity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          notes: "",
        },
      });
      membrosCriados++;
    }

    // Células (2 por congregação)
    for (let i = 0; i < 2; i++) {
      const cel = rand(CELULAS);
      await prisma.celula.create({
        data: {
          tenantId: tenant.id,
          congregationId: cong.id,
          name: `${cel.name} ${i === 0 ? "1" : "2"}`,
          leaderName: cel.leaderName,
          meetingDay: cel.meetingDay,
          meetingTime: cel.meetingTime,
          address: `Casa de ${cel.leaderName} — Qd ${randInt(1,30)}`,
          active: true,
        },
      });
      celulasCriadas++;
    }

    // 1 Evento principal
    const ev = rand(EVENTOS);
    await prisma.event.create({
      data: {
        tenantId: tenant.id,
        title: `${ev.title} — ${ig.name}`,
        description: `Evento da congregação ${ig.name}`,
        type: ev.type,
        time: ev.time,
        location: ev.location,
        date: new Date(Date.now() + randInt(1, 30) * 24 * 60 * 60 * 1000),
        active: true,
      },
    });
    eventosCriados++;

    // 3 Finanças (2 entradas + 1 saída)
    await prisma.financialTransaction.createMany({
      data: [
        { tenantId: tenant.id, type: "ENTRADA", description: "Dízimos do domingo",       amount: randInt(800, 3000), category: "dizimo",    date: dataPassada(0.05) },
        { tenantId: tenant.id, type: "ENTRADA", description: "Ofertas de culto",         amount: randInt(200, 1000), category: "oferta",    date: dataPassada(0.03) },
        { tenantId: tenant.id, type: "SAIDA",   description: "Conta de energia elétrica",amount: randInt(150, 400),  category: "utilities", date: dataPassada(0.02) },
      ],
    });
    financasCriadas += 3;

    // 1 Patrimônio
    const at = rand(ATIVOS);
    await prisma.asset.create({
      data: {
        tenantId: tenant.id,
        name: `${at.name} — ${ig.name}`,
        type: at.type,
        url: `/uploads/placeholder-${at.type}.jpg`,
        category: at.category,
        condition: at.condition,
        estimatedValue: at.estimatedValue,
        location: at.location,
        notes: `Patrimônio da congregação ${ig.name}`,
        active: true,
      },
    });
    patrimoniosCriados++;

    // 2 Pedidos de oração
    for (let i = 0; i < 2; i++) {
      const p = rand(PEDIDOS_ORACAO);
      await prisma.prayerRequest.create({
        data: {
          tenantId: tenant.id,
          name: p.name,
          request: p.request,
          answered: false,
        },
      });
      oracoesCriadas++;
    }
  }

  // 4.4 — Resumo
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  SEED CONCLUÍDO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Congregações prontas:  ${congregacoesCriadas}`);
  console.log(`  Membros criados:       ${membrosCriados}`);
  console.log(`  Células criadas:       ${celulasCriadas}`);
  console.log(`  Eventos criados:       ${eventosCriados}`);
  console.log(`  Transações financeiras: ${financasCriadas}`);
  console.log(`  Patrimônios criados:   ${patrimoniosCriados}`);
  console.log(`  Pedidos de oração:     ${oracoesCriadas}`);

  // 4.5 — Listar logins
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐  LOGINS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  👑 ADMIN (vê TUDO das 14):");
  console.log("     admin@kairos.com / admin123");
  console.log("\n  ⛪ PASTORES (vê só a própria congregação):");
  for (const ig of IGREJAS) {
    if (ig.isSede) continue;
    console.log(`     ${ig.pastorEmail.padEnd(36)} / pastor123  (${ig.name})`);
  }
  console.log("\n  🌐 Acesse: https://igrejasede.fbautomacao.space");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("❌ Erro no seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
