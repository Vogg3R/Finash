import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { getDb, initDatabase, closeDatabase } from './index';
import { runSeed } from './seed';

export async function runMigrations(customDb?: ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>) {
  const db = customDb || getDb();
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');

  console.log('Migration klasörü:', migrationsFolder);
  migrate(db as any, { migrationsFolder });
  console.log('[✓] 20 Veritabanı tablosu migration başarıyla tamamlandı.');

  await runSeed(db as any);
  console.log('[✓] Varsayılan seed verileri başarıyla yüklendi.');
}

// Dosya CLI üzerinden doğrudan çalıştırıldığında migration'ı başlat
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  initDatabase();
  runMigrations()
    .then(() => {
      console.log('[✓] Veritabanı kurulumu ve seed işlemi eksiksiz tamamlandı.');
      closeDatabase();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration hatası:', err);
      closeDatabase();
      process.exit(1);
    });
}
