import { prisma } from "../config/database";
import { env } from "../config/env";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Backup Service — para Postgres usa `pg_dump` via shell.
 * A interface BackupProvider é desacoplada pra permitir
 * GDrive/S3/OneDrive no futuro sem alterar este código.
 */
export interface BackupProvider {
  save(filename: string, data: Buffer): Promise<string>;
  list(): Promise<string[]>;
  delete(filename: string): Promise<void>;
}

class LocalBackupProvider implements BackupProvider {
  private dir: string;

  constructor() {
    this.dir = env.BACKUP_DIR;
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  async save(filename: string, data: Buffer): Promise<string> {
    const filepath = path.join(this.dir, filename);
    fs.writeFileSync(filepath, data);
    return filepath;
  }

  async list(): Promise<string[]> {
    return fs.readdirSync(this.dir);
  }

  async delete(filename: string): Promise<void> {
    const filepath = path.join(this.dir, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
}

// TODO: Implementar quando necessário
// class GDriveBackupProvider implements BackupProvider { ... }
// class S3BackupProvider implements BackupProvider { ... }
// class OneDriveBackupProvider implements BackupProvider { ... }

function isPostgres(): boolean {
  return env.DATABASE_URL.startsWith("postgres://") || env.DATABASE_URL.startsWith("postgresql://");
}

export class BackupService {
  private provider: BackupProvider;

  constructor(provider?: BackupProvider) {
    this.provider = provider || new LocalBackupProvider(); // DI — troca fácil
  }

  /**
   * Backup completo do banco.
   * - SQLite: copia o .db
   * - Postgres: roda `pg_dump` via shell e captura stdout
   */
  async createFullBackup(tenantId: string): Promise<{ filename: string; size: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = isPostgres() ? "sql" : "db";
    const filename = `kairos-backup-${tenantId}-${timestamp}.${ext}`;

    let data: Buffer;
    if (isPostgres()) {
      // pg_dump — precisa do client `psql` no PATH da imagem
      const dump = execSync(`pg_dump "${env.DATABASE_URL}" --no-owner --no-acl`, {
        maxBuffer: 200 * 1024 * 1024,
      });
      data = Buffer.from(dump);
    } else {
      // SQLite: copia o arquivo do banco
      const dbPath = env.DATABASE_URL.replace("file:", "");
      data = fs.readFileSync(dbPath);
    }

    const savedPath = await this.provider.save(filename, data);
    const size = data.length;

    await prisma.backup.create({
      data: { tenantId, filename, size, type: isPostgres() ? "pg_dump" : "local", path: savedPath },
    });

    return { filename, size };
  }

  /** Lista backups de um tenant */
  async listBackups(tenantId: string) {
    return prisma.backup.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Restaura um backup. Em Postgres ainda não há restore — só registra a operação. */
  async restoreBackup(backupId: string, tenantId: string) {
    const backup = await prisma.backup.findFirst({
      where: { id: backupId, tenantId, deletedAt: null },
    });
    if (!backup) throw new Error("Backup não encontrado");

    if (isPostgres()) {
      // Em Postgres, restauramos via psql
      if (!backup.path || !fs.existsSync(backup.path)) {
        throw new Error("Arquivo de backup não encontrado");
      }
      execSync(`psql "${env.DATABASE_URL}" -f "${backup.path}"`, { stdio: "inherit" });
      return { message: "Backup Postgres restaurado com sucesso" };
    }

    // SQLite: substitui o arquivo do banco
    if (!backup.path || !fs.existsSync(backup.path)) {
      throw new Error("Arquivo de backup não encontrado");
    }
    const dbPath = env.DATABASE_URL.replace("file:", "");
    fs.copyFileSync(backup.path, dbPath);
    return { message: "Backup restaurado com sucesso" };
  }
}