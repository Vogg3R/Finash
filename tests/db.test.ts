import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getSqlite, getDb } from '../electron/db/index';
import { runMigrations } from '../electron/db/migrate';
import * as schema from '../electron/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

describe('Gün 1: Veritabanı ve Şema Entegrasyon Testleri', () => {
  const testDbPath = path.resolve(__dirname, 'test_washtrack.db');

  beforeAll(async () => {
    // Varsa eski test veritabanını temizle
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

    initDatabase({ dbPath: testDbPath });
    await runMigrations();
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('1. SQLite WAL modu ve foreign keys aktif olmalıdır (NFR-06)', () => {
    const sqlite = getSqlite();
    const journalMode = sqlite.pragma('journal_mode', { simple: true });
    const foreignKeys = sqlite.pragma('foreign_keys', { simple: true });

    expect(journalMode).toBe('wal');
    expect(foreignKeys).toBe(1);
  });

  it('2. Drizzle ORM ile 20 tablonun tamamı veritabanında mevcut olmalıdır', () => {
    const sqlite = getSqlite();
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'")
      .all()
      .map((row: any) => row.name);

    const expected20Tables = [
      'users',
      'staff',
      'customers',
      'vehicles',
      'vehicle_types',
      'services',
      'service_prices',
      'work_orders',
      'work_order_items',
      'payments',
      'products',
      'service_recipes',
      'stock_movements',
      'suppliers',
      'categories',
      'transactions',
      'cash_sessions',
      'audit_log',
      'settings',
      'email_outbox',
    ];

    expect(expected20Tables.length).toBe(20);
    for (const table of expected20Tables) {
      expect(tables).toContain(table);
    }
  });

  it('3. Seed verileri: Varsayılan admin ilk girişte şifre değişimine zorlanmalıdır (P7)', async () => {
    const db = getDb();
    const admin = await db.select().from(schema.users).where(eq(schema.users.kullanici_adi, 'admin'));
    expect(admin.length).toBe(1);
    expect(admin[0].rol).toBe('admin');
    expect(admin[0].ilkgiris_sifre_degistir).toBe(true);
  });

  it('4. Seed verileri: 4 varsayılan araç tipi mevcut olmalıdır', async () => {
    const db = getDb();
    const types = await db.select().from(schema.vehicleTypes);
    expect(types.length).toBe(4);
    const names = types.map((t) => t.ad);
    expect(names).toContain('Binek');
    expect(names).toContain('SUV');
    expect(names).toContain('Ticari');
    expect(names).toContain('Motosiklet');
  });

  it('5. Seed verileri: Gider ve gelir kategorileri tanımlanmış olmalıdır (FR-30)', async () => {
    const db = getDb();
    const categories = await db.select().from(schema.categories);
    expect(categories.length).toBeGreaterThanOrEqual(10);
    const expenseCats = categories.filter((c) => c.tur === 'expense').map((c) => c.ad);
    expect(expenseCats).toContain('Kira');
    expect(expenseCats).toContain('Malzeme');
    expect(expenseCats).toContain('Maaş');
  });

  it('6. Seed verileri: Sistem ayarları ve %10 indirim limiti bulunmalıdır (FR-46, B5)', async () => {
    const db = getDb();
    const discountLimit = await db.select().from(schema.settings).where(eq(schema.settings.anahtar, 'indirim_ust_limit'));
    expect(discountLimit.length).toBe(1);
    expect(discountLimit[0].deger).toBe('10');
  });
});
