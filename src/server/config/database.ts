import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

// Kairos Igreja usa o Postgres compartilhado do Dokploy
// (kairos-shared-pg). DATABASE_URL vem do .env / docker-compose.
//
// Para trocar pra um Postgres dedicado no futuro, basta mudar
// a variável DATABASE_URL — o adapter e o schema já são Postgres.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não definida — verifique o .env ou as variáveis de ambiente do container.");
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
