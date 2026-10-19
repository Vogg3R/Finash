import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase } from '../electron/db/index';
import { runMigrations } from '../electron/db/migrate';
import { authService } from '../electron/services/authService';
import { cashSessionService } from '../electron/services/cashSessionService';
import { financeService } from '../electron/services/financeService';
import { backupService } from '../electron/services/backupService';
import path from 'path';
import fs from 'fs';

describe('Gün 6: Otomatik Günlük Yedek ve Son 30 Yedeğin Saklanması (FR-47)', () => {
  const testDir = path.resolve(__dirname, 'test_backup_auto');
  const testDbPath = path.join(testDir, 'test_backup.db');
  const backupDir = path.join(testDir, 'backups');
  let adminUser: any;

  beforeAll(async () => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });

    initDatabase({ dbPath: testDbPath });
    await runMigrations();

    const users = await authService.getUsers();
    adminUser = users.find((u) => u.rol === 'admin');
  });

  afterAll(() => {
    closeDatabase();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('1. Yedek klasörü process.cwd() değil, veritabanı dosyasının yanındaki backups klasörü olmalıdır', () => {
    expect(backupService.getBackupDir()).toBe(backupDir);
    expect(fs.existsSync(backupDir)).toBe(true);
  });

  it('2. ensureDailyBackup günde yalnızca bir kez yedek almalıdır', async () => {
    const first = await backupService.ensureDailyBackup();
    expect(first).not.toBeNull();
    expect(fs.existsSync(first!)).toBe(true);
    expect(fs.statSync(first!).size).toBeGreaterThan(0);

    const second = await backupService.ensureDailyBackup();
    expect(second).toBeNull();
    expect(backupService.listAutoBackups()).toHaveLength(1);
  });

  it('3. Kasa kapanışı otomatik yedek almalı ve yolu sonuçta dönmelidir', async () => {
    await cashSessionService.openSession(adminUser.id, 50000);
    const closed = await financeService.closeCashSession(adminUser.id, 50000);

    expect(closed.backup_path).toBeTruthy();
    expect(fs.existsSync(closed.backup_path!)).toBe(true);
  });

  it('4. En yeni 30 otomatik yedek saklanmalı; manuel ve güvenlik yedeklerine dokunulmamalıdır', async () => {
    // Eski tarihli 35 sahte otomatik yedek
    for (let i = 1; i <= 35; i++) {
      const day = i.toString().padStart(2, '0');
      const month = i <= 28 ? '01' : '02';
      fs.writeFileSync(path.join(backupDir, `washtrack_auto_2020-${month}-${day}_00-00-00.db`), 'eski');
    }
    const manual = path.join(backupDir, 'washtrack_backup_manuel.db');
    const safety = path.join(backupDir, 'pre_restore_safety_1.db');
    fs.writeFileSync(manual, 'manuel');
    fs.writeFileSync(safety, 'guvenlik');

    const newest = await backupService.createAutoBackup('daily');

    const remaining = backupService.listAutoBackups();
    expect(remaining).toHaveLength(30);
    expect(remaining[remaining.length - 1]).toBe(newest);
    // En eski sahte yedekler silinmiş olmalı
    expect(fs.existsSync(path.join(backupDir, 'washtrack_auto_2020-01-01_00-00-00.db'))).toBe(false);
    // Bugün alınan gerçek yedekler korunmalı
    expect(remaining.filter((f) => !path.basename(f).startsWith('washtrack_auto_2020'))).toHaveLength(3);

    expect(fs.existsSync(manual)).toBe(true);
    expect(fs.existsSync(safety)).toBe(true);
  });
});
