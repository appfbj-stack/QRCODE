// Seed específico para o banco qrcode_obreiros_db
// Popula: 1 Tenant + admin user + 13 igrejas OBPC + 48 obreiros
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const ROLES = ["PASTOR", "PRESBITERO", "EVANGELISTA", "MISSIONARIA", "DIACONO", "DIACONISA", "MEMBRO"] as const;
type Role = typeof ROLES[number];

const Igrejas = [
  "OBPC CAJURU", "OBPC SEDE", "OBPC NOVO MUNDO", "OBPC NIKEY", "OBPC LARANJEIRA",
  "OBPC ITAVUVU", "OBPC CIDADE JARDIM", "OBPC MANCHESTER", "OBPC MINEIRÃO",
  "OBPC NOVA ESPERANÇA", "OBPC PARQUE BELA VISTA", "OBPC BRIGADEIRO TOBIAS",
  "OBPC SALTO PIRAPORA",
];

async function main() {
  console.log("🌱 Seed QRCODE Obreiros OBPC...");

  // 1. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "igreja-central" },
    update: {},
    create: { name: "Igreja Central Kairos", slug: "igreja-central" },
  });
  console.log("✅ Tenant:", tenant.name, tenant.id);

  // 2. Admin
  const hash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@kairos.com" },
    update: { tenantId: tenant.id, passwordHash: hash, role: "ADMIN" },
    create: {
      tenantId: tenant.id,
      name: "Administrador",
      email: "admin@kairos.com",
      passwordHash: hash,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin: admin@kairos.com / admin123");

  // 3. Congregações
  console.log("🏛️  Criando 13 igrejas OBPC...");
  const congMap = new Map<string, string>();
  for (const nome of Igrejas) {
    const c = await prisma.congregation.upsert({
      where: { id: `obpc-${nome.toLowerCase().replace(/\s+/g, "-")}` },
      update: { tenantId: tenant.id, name: nome, deletedAt: null },
      create: { id: `obpc-${nome.toLowerCase().replace(/\s+/g, "-")}`, tenantId: tenant.id, name: nome },
    });
    congMap.set(nome, c.id);
  }
  console.log(`✅ ${Igrejas.length} igrejas criadas`);

  // 4. 48 obreiros (6-7 por função)
  console.log("👥 Criando 48 obreiros...");
  const NomesPorRole: Record<Role, string[]> = {
    PASTOR: ["Pr. João Silva", "Pr. Carlos Souza", "Pr. Daniel Lima", "Pr. Marcos Pereira", "Pr. Elias Ferreira"],
    PRESBITERO: ["Pb. Antônio Santos", "Pb. José Oliveira", "Pb. Francisco Lima", "Pb. Paulo Rocha", "Pb. Pedro Henrique"],
    EVANGELISTA: ["Ev. Lucas Almeida", "Ev. André Costa", "Ev. Mateus Ribeiro", "Ev. Tiago Martins", "Ev. João Batista"],
    MISSIONARIA: ["Miss. Maria Apá", "Miss. Ana Paula", "Miss. Ruth Oliveira", "Miss. Ester Silva", "Miss. Débora Lima"],
    DIACONO: ["Diác. Roberto Carlos", "Diác. Manoel Souza", "Diác. Joaquim Pereira", "Diác. José Maria", "Diác. Antônio Ferreira"],
    DIACONISA: ["Diác. Joana D'Arc", "Diác. Lúcia Ferreira", "Diác. Marta Silva", "Diác. Helena Costa", "Diác. Marta Almeida"],
    MEMBRO: ["Carlos Souza", "Sandra Lima", "Roberto Silva", "Paulo Henrique", "Beatriz Santos", "Fábio Oliveira", "Patrícia Costa"],
  };

  const obreirosCriados: string[] = [];
  for (const role of ROLES) {
    const nomes = NomesPorRole[role];
    for (let i = 0; i < nomes.length; i++) {
      const nome = nomes[i];
      const igrejaNome = Igrejas[i % Igrejas.length];
      const congId = congMap.get(igrejaNome);
      const memberId = `obpc-m-${role.toLowerCase()}-${i}`;
      await prisma.member.upsert({
        where: { id: memberId },
        update: { tenantId: tenant.id, name: nome, role, congregationId: congId, active: true, deletedAt: null },
        create: {
          id: memberId,
          tenantId: tenant.id,
          name: nome,
          role,
          congregationId: congId,
          active: true,
          status: "membro",
        },
      });
      obreirosCriados.push(nome);
    }
  }
  console.log(`✅ ${obreirosCriados.length} obreiros criados`);

  // 5. Evento de teste
  const evento = await prisma.obpcEvent.upsert({
    where: { id: "obpc-evt-teste-1" },
    update: { status: "ABERTO" },
    create: {
      id: "obpc-evt-teste-1",
      tenantId: tenant.id,
      name: "Reunião de Obreiros - Teste",
      description: "Evento de teste criado pelo seed",
      date: new Date(),
      time: "19:30",
      location: "Templo Sede",
      hostChurch: "OBPC SEDE",
      status: "ABERTO",
      qrToken: "testeqr01",
      startedAt: new Date(),
    },
  });
  console.log("✅ Evento de teste:", evento.name, "qrToken:", evento.qrToken);

  console.log("🎉 Seed concluído!");
  console.log(`   Total: ${Igrejas.length} igrejas, ${obreirosCriados.length} obreiros`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
