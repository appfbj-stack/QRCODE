/**
 * promote-to-super-admin.ts
 *
 * Promove o usuário 'admin@kairos.com' (ou passado por argv) a SUPER_ADMIN
 * GLOBAL. Remove o tenantId dele e marca a flag.
 *
 * IMPORTANTE: SUPER_ADMIN é um papel global, não escopado por tenant.
 *            Esses usuários enxergam TODOS os tenants.
 *
 * Uso:
 *   docker exec kairos-igreja-app sh -c "npx tsx scripts/promote-to-super-admin.ts"
 *   docker exec kairos-igreja-app sh -c "npx tsx scripts/promote-to-super-admin.ts outro@email.com"
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const email = (process.argv[2] || "admin@kairos.com").toLowerCase().trim();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  console.log(`Antes: ${user.email} | role=${user.role} | tenantId=${user.tenantId}`);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "SUPER_ADMIN",
      congregationId: null, // SUPER_ADMIN não tem congregação fixa
    },
  });

  console.log(`Depois: ${updated.email} | role=${updated.role} | tenantId=${updated.tenantId}`);
  console.log("✓ Promovido a SUPER_ADMIN. Pode logar e acessar /super-admin.");
}

main()
  .catch((e) => { console.error("ERR:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
