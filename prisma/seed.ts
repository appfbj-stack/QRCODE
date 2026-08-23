// Prisma Seed — Dados iniciais para Postgres
// Rode com: npx tsx prisma/seed.ts

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed no Postgres...");

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "igreja-central" },
    update: {},
    create: {
      name: "Igreja Central Kairos",
      slug: "igreja-central",
    },
  });
  console.log("✅ Tenant criado:", tenant.name);

  // Admin user
  const hash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@kairos.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Administrador",
      email: "admin@kairos.com",
      passwordHash: hash,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin criado:", admin.email);
  console.log("   Senha: admin123");

  // Outros usuários para testar o chat
  const extraUsers = [
    { name: "Secretaria Sede", email: "secretaria@kairos.com", role: "OPERADOR" },
    { name: "Pastor Filial Norte", email: "pastor.norte@kairos.com", role: "GERENTE" },
    { name: "Líder João", email: "joao@kairos.com", role: "USUARIO" },
  ];
  for (const u of extraUsers) {
    try {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: u.name,
          email: u.email,
          passwordHash: hash,
          role: u.role as any,
        },
      });
      console.log(`✅ Usuário criado: ${u.email} (senha: admin123)`);
    } catch {
      console.log(`⚠️  Usuário já existe: ${u.email}`);
    }
  }

  // Congregations
  const existingCong = await prisma.congregation.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!existingCong) {
    await prisma.congregation.createMany({
      data: [
        { tenantId: tenant.id, name: "Sede Central", address: "Rua Principal, 100" },
        { tenantId: tenant.id, name: "Filial Norte", address: "Av. Norte, 200" },
      ],
    });
    console.log("✅ 2 congregações criadas");
  } else {
    console.log("⚠️  Congregações já existem");
  }

  // Members de exemplo
  const existingMembers = await prisma.member.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!existingMembers) {
    await prisma.member.createMany({
      data: [
        { tenantId: tenant.id, name: "João Silva", email: "joao@email.com", phone: "11999990001" },
        { tenantId: tenant.id, name: "Maria Souza", email: "maria@email.com", phone: "11999990002", baptized: true },
        { tenantId: tenant.id, name: "Pedro Santos", email: "pedro@email.com", phone: "11999990003" },
      ],
    });
    console.log("✅ 3 membros criados");
  } else {
    console.log("⚠️  Membros já existem");
  }

  console.log("🎉 Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
