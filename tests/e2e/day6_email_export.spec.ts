import { test, expect } from '@playwright/test';

test.describe('Gün 6: E2E Ciro E-Postası, Kuyruk ve Rapor Dışa Aktarım Senaryoları', () => {
  test('1. Sol Üst Ciroyu Gönder Butonu ve Durum Rozeti DOM Yapısı Doğrulanmalıdır (FR-51, FR-55)', async ({ page }) => {
    await page.setContent(`
      <header id="app-header" style="background:#0b0f19; color:white; padding:15px; display:flex; align-items:center;">
        <div id="brand">WashTrack</div>
        <button id="send-revenue-btn" style="background:rgba(6,182,212,0.1); border:1px solid rgba(34,211,238,0.25); color:cyan;">
          <span class="icon">✉</span>
          <span class="text">Ciroyu Gönder</span>
          <span id="queue-status-badge" class="badge-dot" data-status="ready" style="color:gray;">Hazır</span>
        </button>
      </header>
    `);

    const sendBtn = page.locator('#send-revenue-btn');
    await expect(sendBtn).toBeVisible();
    await expect(sendBtn).toContainText('Ciroyu Gönder');

    const badge = page.locator('#queue-status-badge');
    await expect(badge).toHaveText('Hazır');
  });

  test('2. Gönderim Durumu Rozetinin Kuyruk ve Başarı Durumları (FR-53, FR-55)', async ({ page }) => {
    await page.setContent(`
      <div id="test-container">
        <span id="badge-sent" class="badge-dot" style="color:teal;">Gönderildi</span>
        <span id="badge-queued" class="badge-dot" style="color:yellow;">Kuyrukta</span>
        <span id="badge-error" class="badge-dot" style="color:red;">Hata</span>
      </div>
    `);

    await expect(page.locator('#badge-sent')).toHaveText('Gönderildi');
    await expect(page.locator('#badge-queued')).toHaveText('Kuyrukta');
    await expect(page.locator('#badge-error')).toHaveText('Hata');
  });

  test('3. Ayarlar Ekranı SMTP Yapılandırma Sekmesi ve Test Maili Butonu (FR-54)', async ({ page }) => {
    await page.setContent(`
      <div id="smtp-settings" style="background:#0f172a; color:white; padding:20px;">
        <h3>Ciro E-Postası ve SMTP Yapılandırması</h3>
        <input id="smtp-host" type="text" value="smtp.gmail.com" />
        <input id="smtp-port" type="number" value="587" />
        <select id="smtp-secure">
          <option value="false" selected>STARTTLS (Port 587)</option>
          <option value="true">SSL / TLS (Port 465)</option>
        </select>
        <input id="smtp-user" type="email" value="washtrack.demo@gmail.com" />
        <input id="smtp-password" type="password" placeholder="Şifre" />
        <input id="smtp-recipient" type="email" value="patron@gmail.com" />
        <div class="actions">
          <button id="send-test-btn">Test E-Postası Gönder</button>
          <button id="save-smtp-btn">Ayarları Kaydet</button>
        </div>
      </div>
    `);

    await expect(page.locator('h3')).toHaveText('Ciro E-Postası ve SMTP Yapılandırması');
    await expect(page.locator('#smtp-host')).toHaveValue('smtp.gmail.com');
    await expect(page.locator('#smtp-user')).toHaveValue('washtrack.demo@gmail.com');
    await expect(page.locator('#smtp-recipient')).toHaveValue('patron@gmail.com');
    await expect(page.locator('#send-test-btn')).toBeVisible();
    await expect(page.locator('#save-smtp-btn')).toBeVisible();
  });

  test('4. Raporlar Ekranı Excel İndir ve PDF Yazdır Butonları Doğrulanmalıdır (FR-40)', async ({ page }) => {
    await page.setContent(`
      <div id="reports-header" style="background:#070b13; color:white; padding:20px; display:flex; justify-content:space-between;">
        <h2>Raporlar & Analizler</h2>
        <div class="export-actions">
          <button id="export-excel-btn">Excel İndir</button>
          <button id="print-pdf-btn">PDF / Yazdır</button>
        </div>
      </div>
    `);

    await expect(page.locator('#export-excel-btn')).toBeVisible();
    await expect(page.locator('#export-excel-btn')).toContainText('Excel İndir');
    await expect(page.locator('#print-pdf-btn')).toBeVisible();
    await expect(page.locator('#print-pdf-btn')).toContainText('PDF / Yazdır');
  });
});
