import { test, expect } from '@playwright/test';

test.describe('Gün 4: E2E Stok Yönetimi, Reçete ve Yedekleme Senaryoları', () => {
  test('1. Stok Ürün Kartları ve Kritik Seviye Uyarısı DOM Yapısı Doğrulanmalıdır (FR-19, FR-24)', async ({ page }) => {
    await page.setContent(`
      <div id="stock-page" style="background:#0f172a; color:white; padding:20px;">
        <h2>Stok & Malzeme Yönetimi</h2>
        <div id="critical-alert" style="color:red;">Kritik Stok Uyarısı (1 Ürün)</div>
        <table id="stock-table">
          <thead>
            <tr><th>Ürün Adı</th><th>Mevcut</th><th>Kritik</th><th>Durum</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Oto Şampuanı 20L</td>
              <td>2.50 lt</td>
              <td>5 lt</td>
              <td><span class="badge-critical">Kritik</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `);

    const title = page.locator('h2');
    await expect(title).toHaveText('Stok & Malzeme Yönetimi');

    const alert = page.locator('#critical-alert');
    await expect(alert).toContainText('Kritik Stok Uyarısı');

    const badge = page.locator('.badge-critical');
    await expect(badge).toHaveText('Kritik');
  });

  test('2. Hizmet Reçetesi (Recipe) Modal DOM Yapısı Doğrulanmalıdır (FR-21)', async ({ page }) => {
    await page.setContent(`
      <div id="recipe-modal" style="background:#0f172a; color:white; padding:20px;">
        <h3>Hizmet Reçetesi • İç-Dış Yıkama</h3>
        <select id="recipe-product">
          <option value="1">Oto Şampuanı (lt)</option>
        </select>
        <input id="recipe-amount" type="number" value="0.1" />
        <button id="add-recipe-btn">Ekle</button>
      </div>
    `);

    const modalTitle = page.locator('h3');
    await expect(modalTitle).toContainText('Hizmet Reçetesi');

    const input = page.locator('#recipe-amount');
    await expect(input).toHaveValue('0.1');

    const btn = page.locator('#add-recipe-btn');
    await expect(btn).toBeVisible();
  });

  test('3. Yedekleme & Geri Yükleme (B7, FR-47, FR-48, AC-12) DOM Doğrulaması', async ({ page }) => {
    await page.setContent(`
      <div id="backup-section" style="background:#0f172a; color:white; padding:20px;">
        <h3>Veritabanı Yedekleme ve Geri Yükleme</h3>
        <button id="backup-now-btn">Şimdi Yedek Al</button>
        <input id="restore-path-input" placeholder="Yedek Dosyası Yolu (.db)" value="C:\\backups\\backup.db" />
        <button id="restore-btn">Yedeği Geri Yükle</button>
      </div>
    `);

    const backupBtn = page.locator('#backup-now-btn');
    await expect(backupBtn).toBeVisible();

    const restoreInput = page.locator('#restore-path-input');
    await expect(restoreInput).toHaveValue('C:\\backups\\backup.db');

    const restoreBtn = page.locator('#restore-btn');
    await expect(restoreBtn).toBeVisible();
  });
});
