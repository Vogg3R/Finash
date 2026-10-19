import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

let sqliteDb: Database.Database | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export interface DbOptions {
  dbPath?: string;
  inMemory?: boolean;
}

/**
 * Veritabanı bağlantısını başlatır, WAL modunu ve foreign_keys kısıtlarını aktif eder.
 */
export function initDatabase(options: DbOptions = {}) {
  if (sqliteDb) {
    return { db: drizzleDb!, sqlite: sqliteDb };
  }

  let fullDbPath: string;

  if (options.inMemory) {
    fullDbPath = ':memory:';
  } else if (options.dbPath) {
    fullDbPath = options.dbPath;
  } else {
    // Varsayılan olarak proje kökünde veya userData altında
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      fullDbPath = path.resolve(process.cwd(), 'washtrack.db');
    } else {
      // Electron runtime'da userData klasörünü kontrol et
      const userDataDir = process.env.APPDATA 
        ? path.join(process.env.APPDATA, 'WashTrack')
        : path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      fullDbPath = path.join(userDataDir, 'washtrack.db');
    }
  }

  sqliteDb = new Database(fullDbPath);

  // WAL Modu (NFR-06: Elektrik kesintisine dayanıklılık ve yüksek performans)
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('busy_timeout = 5000');
  sqliteDb.pragma('synchronous = NORMAL');

  drizzleDb = drizzle(sqliteDb, { schema });

  return { db: drizzleDb, sqlite: sqliteDb };
}

export function getDb() {
  if (!drizzleDb) {
    return initDatabase().db;
  }
  return drizzleDb;
}

export function getSqlite() {
  if (!sqliteDb) {
    return initDatabase().sqlite;
  }
  return sqliteDb;
}

export function closeDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    drizzleDb = null;
  }
}

/**
 * B7 Kuralı: better-sqlite3 .backup() API'si ile güvenli veritabanı yedeği alır.
 */
export async function backupDatabase(targetPath: string): Promise<void> {
  const sqlite = getSqlite();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await sqlite.backup(targetPath);
}
