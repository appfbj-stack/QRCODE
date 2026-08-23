import dotenv from "dotenv";
dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "file:./data/kairos.db",
  JWT_SECRET: process.env.JWT_SECRET || "kairos-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  PORT: parseInt(process.env.PORT || "3000"),
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_URL: process.env.APP_URL || "http://localhost:3000",
  BACKUP_DIR: process.env.BACKUP_DIR || "./backups",
} as const;