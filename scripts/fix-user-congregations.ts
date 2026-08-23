/**
 * fix-user-congregations.ts
 *
 * Script one-shot: associa cada usuário existente à sua congregação
 * baseado em heurística de nome/email. Não remove ninguém — só preenche
 * o `congregationId` que ficou null na migração do banco Python antigo.
 *
 * Heurística:
 *  - email/nome contém "sede"        → primeira congregação com nome "SEDE"
 *  - email/nome contém "norte"        → congregação com "NORTE" no nome
 *  - email/nome contém "sul" ou "cajuru" → congregação com "SUL" ou "CAJURU"
 *  - role ADMIN/SUPER_ADMIN          → fica null (vê tudo)
 *  - role GERENTE e sem match        → primeira congregação ativa
 *  - role OPERADOR/USUARIO           → fica null (assume ser da sede pelo nome genérico)
 *
 * Uso: docker exec kairos-igreja-app sh -c "cd /app && npx tsx scripts/fix-user-congregations.ts"
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não definida");
}
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

function pickCongregationId(name: string, email: string, congregations: { id: string; name: string }[]): string | null {
  const txt = `${name} ${email}`.toLowerCase();

  // Helpers
  const findBy = (pattern: RegExp) =>
    congregations.find((c) => pattern.test(c.name))?.id ?? null;

  // Regras em ordem
  if (/sede/.test(txt)) return findBy(/sede/i);
  if (/norte/.test(txt)) return findBy(/norte/i);
  if (/sul|cajuru/.test(txt)) return findBy(/sul|cajuru/i);
  if (/mineir|mineirao/.test(txt)) return findBy(/mineir/i);
  if (/salto/.test(txt)) return findBy(/salto/i);
  if (/brigadeiro/.test(txt)) return findBy(/brigadeiro/i);
  if (/mancherter|manchester/.test(txt)) return findBy(/manch/i);
  if (/taquari|tatuape|tatuapé|vilamariana/.test(txt)) return findBy(new RegExp(txt.split(' ').pop() || '.', 'i'));

  return null;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const congregations = await prisma.congregation.findMany({
    where: { deletedAt: null, active: true },
    orderBy: { name: 'asc' },
  });

  console.log(`→ ${users.length} usuários, ${congregations.length} congregações`);

  for (const u of users) {
    if (u.congregationId) {
      console.log(`  ✓ ${u.email} já tem congregação`);
      continue;
    }
    if (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') {
      console.log(`  — ${u.email} (${u.role}) → mantém null (global)`);
      continue;
    }
    const cid = pickCongregationId(u.name, u.email, congregations);
    if (cid) {
      const cong = congregations.find((c) => c.id === cid);
      await prisma.user.update({
        where: { id: u.id },
        data: { congregationId: cid },
      });
      console.log(`  ✓ ${u.email} → ${cong?.name}`);
    } else {
      console.log(`  ⚠ ${u.email} (${u.role}) → sem match, fica null`);
    }
  }

  console.log('\n✓ Atualização concluída');
}

main()
  .catch((e) => { console.error('ERR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
