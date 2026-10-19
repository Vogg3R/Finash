import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getDb } from '../electron/db/index';
import { runMigrations } from '../electron/db/migrate';
import { authService } from '../electron/services/authService';
import { emailOutboxRepository } from '../electron/repositories/emailOutboxRepository';
import { emailService } from '../electron/services/emailService';
import { cryptoService } from '../electron/services/cryptoService';
import { excelExportService } from '../electron/services/excelExportService';
import * as schema from '../electron/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

describe('Gün 6: E-Posta Kuyruğu, Kilit Mekanizması, SafeStorage ve Excel Raporu Testleri (FR-51 - FR-55, B6, AC-13, FR-40)', () => {
  const testDbPath = path.resolve(__dirname, 'test_email_queue.db');
  let adminUser: any;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

    initDatabase({ dbPath: testDbPath });
    await runMigrations();

    const users = await authService.getUsers();
    adminUser = users.find((u) => u.rol === 'admin');
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('1. SafeStorage / DPAPI Şifreleme ve Çözme Birim Testi (FR-54)', () => {
    const rawSecret = 'GoogleAppPassword123!';
    const encrypted = cryptoService.encrypt(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = cryptoService.decrypt(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('2. Kuyruk Atomik Kilitleme (pending -> sending) ve Çift Gönderim Engeli (B6, AC-13)', async () => {
    // 1. Kuyruğa yeni bir ciro raporu ekle
    const item = await emailOutboxRepository.enqueueEmail({
      tur: 'daily',
      donem: '2026-10-08',
      tetikleyen: 'button',
      user_id: adminUser.id,
    });

    expect(item.durum).toBe('pending');
    expect(item.deneme_sayisi).toBe(0);

    // 2. Birinci işlem kilidi alır
    const lock1 = await emailOutboxRepository.acquireLock(item.id);
    expect(lock1).toBe(true);

    // İkinci eşzamanlı işlem aynı anda kilit almaya çalışırsa başarısız olmalıdır (AC-13 Çift Gönderim Engeli)
    // Çünkü durum artık 'sending' oldu ve henüz zaman aşımına uğramadı
    const lock2 = await emailOutboxRepository.acquireLock(item.id);
    expect(lock2).toBe(false);

    // Kilit zamanı doldurulduğunu doğrula
    const db = getDb();
    const rows = await db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.id, item.id));
    expect(rows[0].durum).toBe('sending');
    expect(rows[0].deneme_sayisi).toBe(1);
    expect(rows[0].kilit_zamani).not.toBeNull();
  });

  it('3. Kilit Zaman Aşımı (5 dk) sonrası retry mekanizması kilidi tekrar verebilmelidir (B6)', async () => {
    const item = await emailOutboxRepository.enqueueEmail({
      tur: 'daily',
      donem: '2026-10-09',
      tetikleyen: 'auto',
      user_id: adminUser.id,
    });

    // Kilidi al ve kilit_zamani'nı 6 dakika öncesine çek (zaman aşımı simülasyonu)
    await emailOutboxRepository.acquireLock(item.id);

    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const db = getDb();
    await db.update(schema.emailOutbox).set({ kilit_zamani: sixMinutesAgo }).where(eq(schema.emailOutbox.id, item.id));

    // getPendingOrRetryable zaman aşımına uğramış kaydı bulmalıdır
    const retryable = await emailOutboxRepository.getPendingOrRetryable(5);
    const found = retryable.find((r) => r.id === item.id);
    expect(found).toBeDefined();

    // Zaman aşımına uğrayan kayıt tekrar kilitlenebilmeli
    const relock = await emailOutboxRepository.acquireLock(item.id);
    expect(relock).toBe(true);

    const updated = await db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.id, item.id));
    expect(updated[0].deneme_sayisi).toBe(2); // Deneme sayısı arttı
  });

  it('4. Başarıyla gönderilen e-posta durumu sent yapılmalı ve kilit kaldırılmalıdır', async () => {
    const item = await emailOutboxRepository.enqueueEmail({
      tur: 'daily',
      donem: '2026-10-10',
      tetikleyen: 'button',
      user_id: adminUser.id,
    });

    await emailOutboxRepository.acquireLock(item.id);
    await emailOutboxRepository.markSent(item.id);

    const db = getDb();
    const rows = await db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.id, item.id));
    expect(rows[0].durum).toBe('sent');
    expect(rows[0].gonderim_zamani).not.toBeNull();
    expect(rows[0].kilit_zamani).toBeNull();
  });

  it('5. triggerDailyEmail: Aynı gün için daha önce gönderilmişse onay penceresi uyarısı vermelidir (FR-53)', async () => {
    const todayStr = new Date().toISOString().substring(0, 10);

    // Bugün için bir kaydı 'sent' olarak ekle
    const sentItem = await emailOutboxRepository.enqueueEmail({
      tur: 'daily',
      donem: todayStr,
      tetikleyen: 'button',
      user_id: adminUser.id,
    });
    await emailOutboxRepository.markSent(sentItem.id);

    // force = false ile çağrıldığında alreadySent true dönmelidir
    const resNoForce = await emailService.triggerDailyEmail(adminUser.id, false);
    expect(resNoForce.alreadySent).toBe(true);

    // force = true ile zorlandığında kuyruğa yeni bir gönderim eklemelidir
    const resForce = await emailService.triggerDailyEmail(adminUser.id, true);
    expect(resForce.alreadySent).toBe(false);
    expect(resForce.success).toBe(true);
  });

  it('6. ExcelJS ile Çok Sayfalı Rapor Dosyası Üretimi (FR-40)', async () => {
    const buffer = await excelExportService.generateReportExcel('daily');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000); // Geçerli bir .xlsx dosyası
  });
});
