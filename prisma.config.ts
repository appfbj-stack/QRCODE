import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    directory: "./prisma/migrations",
  },
  datasource: {
    // Conexão com Postgres — sempre via env var em produção
    url: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/qrcode_db",
  },
});
