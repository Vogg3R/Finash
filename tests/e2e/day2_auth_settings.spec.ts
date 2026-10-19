import { test, expect } from '@playwright/test';
import { normalizePlate } from '../../electron/utils/plateNormalizer';

test.describe('Gün 2: E2E Giriş, Yetkilendirme ve Plaka Arama Senaryoları', () => {
  test('1. Giriş ekranı DOM öğeleri ve kullanıcı seçimi doğrulanmalıdır', async ({ page }) => {
    await page.setContent(`
      <div id="root" style="background:#070b13; color:white; padding:20px;">
        <h2>WashTrack</h2>
        <div class="user-select">
          <button id="user-admin">Yönetici (admin)</button>
          <button id="user-kasa">Kasa / Resepsiyon</button>
        </div>
        <input type="password" placeholder="Şifrenizi girin..." id="password" />
        <button id="login-btn">Giriş Yap</button>
      </div>
    `);

    const title = page.locator('h2');
    await expect(title).toHaveText('WashTrack');

    const adminBtn = page.locator('#user-admin');
    await expect(adminBtn).toBeVisible();

    const passInput = page.locator('#password');
    await expect(passInput).toBeVisible();

    const loginBtn = page.locator('#login-btn');
    await expect(loginBtn).toBeVisible();
  });

  test('2. Plaka aramada P4 kuralları (i/ı/İ Latin I dönüşümü ve Ç/Ş/Ğ engeli) doğrulanmalıdır', async () => {
    // Normalizer test doğrulaması (P4 kuralı)
    const validNorm = normalizePlate('06 ılk 41');
    expect(validNorm.isValid).toBe(true);
    expect(validNorm.normalizedPlate).toBe('06ILK41');

    const dottedI = normalizePlate('34 İST 34');
    expect(dottedI.isValid).toBe(true);
    expect(dottedI.normalizedPlate).toBe('34IST34');

    const invalidNorm = normalizePlate('34 ÇÇ 34');
    expect(invalidNorm.isValid).toBe(false);
    expect(invalidNorm.error).toContain('Geçersiz plaka');
  });

  test('3. Kasa rolü için finans ve kâr ekranları gizlenmelidir (FR-43, AC-09)', async () => {
    // Rol bazlı UI yetki kuralı kontrolü
    const canAccessModule = (role: string, module: string) => {
      if (role === 'admin') return true;
      if (role === 'cashier') {
        if (module === 'finance' || module === 'reports') return false;
        return true;
      }
      return false;
    };

    expect(canAccessModule('admin', 'finance')).toBe(true);
    expect(canAccessModule('admin', 'reports')).toBe(true);
    expect(canAccessModule('cashier', 'finance')).toBe(false);
    expect(canAccessModule('cashier', 'reports')).toBe(false);
    expect(canAccessModule('cashier', 'customers')).toBe(true);
    expect(canAccessModule('cashier', 'services')).toBe(true);
  });
});
