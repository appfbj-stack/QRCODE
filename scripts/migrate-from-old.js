// migrate-from-old.mjs
// Migra dados do banco ANTIGO (kairos_igreja_db, schema Python/FastAPI)
// para o banco NOVO (kairos_igreja_db_v2, schema Prisma).
//
// Uso: npx tsx migrate-from-old.mjs
// Requer:
//   - DATABASE_URL apontando pro banco NOVO (com Prisma)
//   - OLD_DATABASE_URL apontando pro banco ANTIGO (com pg)

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "/app/generated/prisma/client";
import pg from "pg";

const OLD_URL = process.env.OLD_DATABASE_URL ||
  "postgresql://kairos_igreja_user:tMDDYehRWOkhaojneP662TI6KIoSvoCQ@kairos-shared-pg:5432/kairos_igreja_db";
const NEW_URL = process.env.DATABASE_URL;
if (!NEW_URL) {
  console.error("ERRO: DATABASE_URL não definida (banco NOVO)");
  process.exit(1);
}

function mapRole(oldRole) {
  const r = (oldRole || "").toLowerCase();
  if (r.includes("pastor") || r.includes("admin")) return "ADMIN";
  if (r.includes("dirigente") || r.includes("gerente") || r.includes("lider")) return "GERENTE";
  if (r.includes("obreiro") || r.includes("operador")) return "OPERADOR";
  return "USUARIO";
}

async function main() {
  console.log("==> Conectando no banco ANTIGO (Python/FastAPI)");
  const oldDb = new pg.Client({ connectionString: OLD_URL });
  await oldDb.connect();

  console.log("==> Conectando no banco NOVO (Prisma)");
  const newDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: NEW_URL }) });

  // Tenant
  console.log("==> Garantindo Tenant");
  const tenant = await newDb.tenant.upsert({
    where: { slug: "igreja-central" },
    update: {},
    create: { name: "Igreja Central Kairos", slug: "igreja-central" },
  });
  console.log(`    Tenant: ${tenant.name} (${tenant.id})`);

  // Congregations
  console.log("==> Migrando Congregations");
  const oldCongs = await oldDb.query("SELECT id, nome, endereco, dirigente, telefone, ativa FROM congregations ORDER BY id");
  const congMap = new Map();
  for (const r of oldCongs.rows) {
    const created = await newDb.congregation.create({
      data: {
        tenantId: tenant.id,
        name: r.nome,
        address: r.endereco || null,
        phone: r.telefone || null,
        pastorName: r.dirigente || null,
        active: r.ativa !== false,
      },
    });
    congMap.set(r.id, created.id);
    console.log(`    ${r.id} -> ${created.id} (${r.nome})`);
  }

  // Users
  console.log("==> Migrando Users");
  const oldUsers = await oldDb.query("SELECT id, username, nome, hashed_password, role, ativo FROM users ORDER BY id");
  for (const r of oldUsers.rows) {
    const email = r.username.includes("@") ? r.username : `${r.username}@kairos.com`;
    try {
      const created = await newDb.user.create({
        data: {
          tenantId: tenant.id,
          name: r.nome,
          email,
          passwordHash: r.hashed_password,
          role: mapRole(r.role),
          active: r.ativo !== false,
        },
      });
      console.log(`    ${r.username} -> ${email} (${mapRole(r.role)})`);
    } catch (e) {
      console.log(`    AVISO: ${r.username} ja existe ou erro: ${String(e.message).slice(0, 80)}`);
    }
  }

  // Members
  console.log("==> Migrando Members");
  const oldMembers = await oldDb.query(`
    SELECT id, nome_completo, cpf, whatsapp, endereco, data_nascimento, filiacao,
           data_batismo, data_filiacao, validade_carteirinha, congregacao_id,
           eh_obreiro, cargo_obreiro, observacoes, ativo
    FROM members ORDER BY id
  `);
  let okCount = 0;
  let errCount = 0;
  for (const r of oldMembers.rows) {
    try {
      const newCongId = r.congregacao_id ? congMap.get(r.congregacao_id) : null;
      const status = r.eh_obreiro ? "obreiro" : "membro";
      const role = r.cargo_obreiro && r.cargo_obreiro.trim().length > 0 ? r.cargo_obreiro : null;

      await newDb.member.create({
        data: {
          tenantId: tenant.id,
          congregationId: newCongId,
          name: r.nome_completo,
          phone: r.whatsapp || null,
          cpf: r.cpf || null,
          address: r.endereco || null,
          birthDate: r.data_nascimento ? new Date(r.data_nascimento) : null,
          filiation: r.filiacao || null,
          baptismDate: r.data_batismo ? new Date(r.data_batismo) : null,
          memberSince: r.data_filiacao ? new Date(r.data_filiacao) : null,
          cardValidity: r.validade_carteirinha ? new Date(r.validade_carteirinha) : null,
          status,
          role,
          notes: r.observacoes || null,
          active: r.ativo !== false,
        },
      });
      okCount++;
    } catch (e) {
      errCount++;
      console.log(`    ERRO member id=${r.id} (${r.nome_completo}): ${String(e.message).slice(0, 100)}`);
    }
  }
  console.log(`    Migrados: ${okCount} | Erros: ${errCount}`);

  // Patrimonio -> Asset
  console.log("==> Migrando Patrimonio -> Asset");
  const oldPatr = await oldDb.query(`
    SELECT id, item, categoria, valor, data_aquisicao, local, responsavel, congregacao_id, observacoes, ativo
    FROM patrimonio
  `);
  for (const r of oldPatr.rows) {
    // Concatena info extras no name (já que Asset não tem notes)
    const extras = [
      r.local ? `Local: ${r.local}` : null,
      r.responsavel ? `Resp: ${r.responsavel}` : null,
      r.valor ? `R$ ${r.valor}` : null,
    ].filter(Boolean).join(" | ");
    const name = extras ? `${r.item} (${extras})` : r.item;

    await newDb.asset.create({
      data: {
        tenantId: tenant.id,
        name,
        type: (r.categoria || "outros").trim(),
        url: "",
        active: r.ativo !== false,
      },
    });
    console.log(`    ${r.item} -> asset criado`);
  }

  // Agenda -> Event
  console.log("==> Migrando Agenda -> Event");
  const oldAgenda = await oldDb.query(`
    SELECT id, titulo, descricao, data_hora, tipo, local FROM agenda
  `);
  for (const r of oldAgenda.rows) {
    await newDb.event.create({
      data: {
        tenantId: tenant.id,
        title: r.titulo,
        description: r.descricao || null,
        date: new Date(r.data_hora),
        type: r.tipo || null,
        location: r.local || null,
      },
    });
    console.log(`    ${r.titulo} -> event criado`);
  }

  console.log("\n=== RESUMO DA MIGRACAO ===");
  const counts = {
    Tenant: await newDb.tenant.count(),
    User: await newDb.user.count(),
    Congregation: await newDb.congregation.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    Member: await newDb.member.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    Asset: await newDb.asset.count({ where: { tenantId: tenant.id, deletedAt: null } }),
    Event: await newDb.event.count({ where: { tenantId: tenant.id, deletedAt: null } }),
  };
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`);
  }

  await oldDb.end();
  await newDb.$disconnect();
  console.log("\nMigracao concluida com sucesso!");
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
