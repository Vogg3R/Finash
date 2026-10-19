import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase } from '../electron/db/index';
import { runMigrations } from '../electron/db/migrate';
import { authService } from '../electron/services/authService';
import path from 'path';
import fs from 'fs';

describe('Gün 2: Kimlik Doğrulama, Roller ve Güvenlik Testleri (FR-42, FR-43, P7)', () => {
  const testDbPath = path.resolve(__dirname, 'test_auth.db');

  beforeAll(async () => {
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

  it('1. Hatalı kullanıcı adı veya şifre ile giriş reddedilmelidir', async () => {
    const res = await authService.login('gecersiz', '123456');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Kullanıcı bulunamadı.');

    const wrongPass = await authService.login('admin', 'yanlissifre');
    expect(wrongPass.success).toBe(false);
    expect(wrongPass.error).toBe('Hatalı şifre veya PIN.');
  });

  it('2. Varsayılan admin girişi başarılı olmalı ve ilk girişte şifre değişimine zorlanmalıdır (P7)', async () => {
    const res = await authService.login('admin', '123456');
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.rol).toBe('admin');
    expect(res.user?.ilkgiris_sifre_degistir).toBe(true);
  });

  it('3. Admin şifresini değiştirdiğinde ilkgiris_sifre_degistir false olmalı ve yeni şifreyle giriş yapılabilmelidir', async () => {
    const loginRes = await authService.login('admin', '123456');
    const adminId = loginRes.user!.id;

    // Şifreyi güncelle
    const changeRes = await authService.changePassword(adminId, 'yeniGucluSifre99');
    expect(changeRes.success).toBe(true);

    // Eski şifreyle giriş başarısız olmalı
    const oldLogin = await authService.login('admin', '123456');
    expect(oldLogin.success).toBe(false);

    // Yeni şifreyle giriş başarılı olmalı ve zorunlu şifre bayrağı kalkmalı
    const newLogin = await authService.login('admin', 'yeniGucluSifre99');
    expect(newLogin.success).toBe(true);
    expect(newLogin.user?.ilkgiris_sifre_degistir).toBe(false);
  });

  it('4. Kasa kullanıcısı kendi PIN/şifresiyle giriş yapabilmelidir', async () => {
    const res = await authService.login('kasa', '1234');
    expect(res.success).toBe(true);
    expect(res.user?.rol).toBe('cashier');
  });

  it('5. Yönetici PIN doğrulama (verifyAdminPin) fonksiyonu çalışmalıdır', async () => {
    const validPin = await authService.verifyAdminPin('yeniGucluSifre99');
    expect(validPin).toBe(true);

    const invalidPin = await authService.verifyAdminPin('0000');
    expect(invalidPin).toBe(false);
  });
});
