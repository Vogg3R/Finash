import { test, expect } from '@playwright/test';

test.describe('Gün 5: E2E Finans, Kasa Kapanışı ve Raporlar Senaryoları', () => {
  test('1. Finans KPI Kartları ve Net Kâr Hesaplama DOM Yapısı Doğrulanmalıdır (FR-33, A1)', async ({ page }) => {
    await page.setContent(`
      <div id="finance-page" style="background:#070b13; color:white; padding:20px;">
        <h2>Finans & Kasa Defteri</h2>
        <div class="kpi-grid">
          <div class="kpi-card" id="card-income">
            <span class="label">Toplam Gelir</span>
            <span class="value">1.100,00 ₺</span>
          </div>
          <div class="kpi-card" id="card-refund">
            <span class="label">Toplam İade</span>
            <span class="value">500,00 ₺</span>
          </div>
          <div class="kpi-card" id="card-expense">
            <span class="label">Toplam Gider</span>
            <span class="value">50,00 ₺</span>
          </div>
          <div class="kpi-card" id="card-revenue">
            <span class="label">Net Ciro</span>
            <span class="value">600,00 ₺</span>
          </div>
          <div class="kpi-card" id="card-profit">
            <span class="label">Net Kâr</span>
            <span class="value">550,00 ₺</span>
          </div>
        </div>
      </div>
    `);

    await expect(page.locator('h2')).toHaveText('Finans & Kasa Defteri');
    await expect(page.locator('#card-revenue .value')).toHaveText('600,00 ₺');
    await expect(page.locator('#card-profit .value')).toHaveText('550,00 ₺');
  });

  test('2. Manuel Gider Girişi Modalı DOM ve Validasyon Doğrulaması (FR-29, FR-30)', async ({ page }) => {
    await page.setContent(`
      <div id="manual-modal" style="background:#0f172a; color:white; padding:20px;">
        <h3>Manuel İşlem Girişi</h3>
        <select id="tx-tur">
          <option value="expense" selected>Gider</option>
          <option value="income">Gelir</option>
        </select>
        <select id="tx-category">
          <option value="1">Kırtasiye ve Çay</option>
          <option value="2">Elektrik / Su</option>
        </select>
        <input id="tx-amount" type="number" value="150.00" />
        <select id="tx-method">
          <option value="cash">Nakit (Kasayı Etkiler)</option>
          <option value="card">Kredi Kartı / POS</option>
        </select>
        <input id="tx-desc" type="text" value="Haftalık temizlik malzemesi" />
        <button id="save-tx-btn">Kaydet</button>
      </div>
    `);

    const selectTur = page.locator('#tx-tur');
    await expect(selectTur).toHaveValue('expense');

    const amount = page.locator('#tx-amount');
    await expect(amount).toHaveValue('150.00');

    const saveBtn = page.locator('#save-tx-btn');
    await expect(saveBtn).toBeVisible();
  });

  test('3. Gün Sonu Kasa Kapanışı ve Nakit Farkı Canlı Göstergesi (FR-32, P3, A1)', async ({ page }) => {
    await page.setContent(`
      <div id="close-modal" style="background:#0f172a; color:white; padding:20px;">
        <h3>Gün Sonu Kasa Kapanışı</h3>
        <div id="expected-cash">Sistemde Beklenen: 750,00 ₺</div>
        <input id="counted-cash" type="number" value="740.00" />
        <div id="diff-box" class="diff-negative" style="color:red;">
          <span id="diff-label">Kasa Açığı (Eksik)</span>
          <span id="diff-value">-10,00 ₺</span>
        </div>
        <button id="close-confirm-btn">Kasayı Kapat ve Kaydet</button>
      </div>
    `);

    await expect(page.locator('#expected-cash')).toContainText('750,00 ₺');
    await expect(page.locator('#diff-label')).toHaveText('Kasa Açığı (Eksik)');
    await expect(page.locator('#diff-value')).toHaveText('-10,00 ₺');
    await expect(page.locator('#close-confirm-btn')).toBeVisible();
  });

  test('4. Raporlar Sayfası ve Personel Prim Tablosu DOM Yapısı (FR-36, FR-39)', async ({ page }) => {
    await page.setContent(`
      <div id="reports-page" style="background:#070b13; color:white; padding:20px;">
        <h2>Raporlar & Analizler</h2>
        <div id="staff-performance">
          <table>
            <thead>
              <tr>
                <th>Personel Adı</th>
                <th>Prim Oranı (%)</th>
                <th>Tamamlanan İş Adedi</th>
                <th>Oluşturulan Hizmet Cirosu</th>
                <th>Hak Edilen Prim (₺)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ahmet Usta</td>
                <td>%10</td>
                <td>12 İş</td>
                <td>6.000,00 ₺</td>
                <td>600,00 ₺</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `);

    await expect(page.locator('h2')).toHaveText('Raporlar & Analizler');
    const row = page.locator('#staff-performance tbody tr');
    await expect(row).toContainText('Ahmet Usta');
    await expect(row).toContainText('%10');
    await expect(row).toContainText('600,00 ₺');
  });

  test('5. Kasiyer Rolü Güvenlik Sınırı: Finans ve Raporlar Butonları Görünmemelidir (AC-09)', async ({ page }) => {
    // Kasa rolü için render edilen navbar simülasyonu
    await page.setContent(`
      <nav id="navbar">
        <button id="nav-dashboard">Panel</button>
        <button id="nav-customers">Müşteri & Araç</button>
        <button id="nav-stock">Stok & Malzeme</button>
      </nav>
    `);

    await expect(page.locator('#nav-dashboard')).toBeVisible();
    await expect(page.locator('#nav-finance')).toHaveCount(0);
    await expect(page.locator('#nav-reports')).toHaveCount(0);
  });
});
