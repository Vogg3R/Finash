import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getDb } from '../electron/db/index';
import { runMigrations } from '../electron/db/migrate';
import { authService } from '../electron/services/authService';
import { vehicleService } from '../electron/services/vehicleService';
import { serviceCatalogService } from '../electron/services/serviceCatalogService';
import { stockService } from '../electron/services/stockService';
import { workOrderService } from '../electron/services/workOrderService';
import { backupService } from '../electron/services/backupService';
import * as schema from '../electron/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

describe('Gün 4: Stok Yönetimi, Reçete, Otomatik Tüketim ve Yedekleme Testleri (FR-19 - FR-26, FR-47, FR-48, P1, B1, B7, AC-05, AC-12)', () => {
  const testDbPath = path.resolve(__dirname, 'test_stock.db');
  let adminUser: any;
  let testVehicle: any;
  let service1: any;
  let service2: any;
  let productShampoo: any;
  let productWax: any;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

    initDatabase({ dbPath: testDbPath });
    await runMigrations();

    const users = await authService.getUsers();
    adminUser = users.find(u => u.rol === 'admin');

    // Araç kaydı
    const reg = await vehicleService.registerVehicle({
      rawPlate: '34 STOK 2026',
      marka: 'Audi',
      model: 'A4',
      vehicle_type_id: 1, // Binek
    });
    testVehicle = reg!.vehicle;

    // 2 Farklı Hizmet Oluştur
    service1 = await serviceCatalogService.createService(adminUser.id, {
      ad: 'Dış Yıkama',
      sure_dk: 30,
    });
    await serviceCatalogService.updatePrice(adminUser.id, service1.id, 1, 15000); // 150 TL

    service2 = await serviceCatalogService.createService(adminUser.id, {
      ad: 'Motor Yıkama',
      sure_dk: 40,
    });
    await serviceCatalogService.updatePrice(adminUser.id, service2.id, 1, 20000); // 200 TL

    // 2 Farklı Ürün Kartı Oluştur (FR-19)
    productShampoo = await stockService.createProduct(adminUser.id, {
      ad: 'Oto Şampuanı 20L',
      kategori: 'Temizlik',
      birim: 'lt',
      kritik_seviye: 5,
    });

    productWax = await stockService.createProduct(adminUser.id, {
      ad: 'Hızlı Cila',
      kategori: 'Koruma',
      birim: 'lt',
      kritik_seviye: 2,
    });

    // Açılış Stok Girişi (Satın Alma - FR-20)
    await stockService.addStockPurchase(adminUser.id, {
      urun_id: productShampoo.id,
      miktar: 10, // 10 litre
      toplam_tutar_kurus: 100000, // 1000 TL
    });

    await stockService.addStockPurchase(adminUser.id, {
      urun_id: productWax.id,
      miktar: 5, // 5 litre
      toplam_tutar_kurus: 75000, // 750 TL
    });

    // Reçeteleri Tanımla (FR-21)
    // Dış Yıkama: 0.1 lt Şampuan, 0.05 lt Cila
    await stockService.setRecipe(adminUser.id, service1.id, productShampoo.id, 0.1);
    await stockService.setRecipe(adminUser.id, service1.id, productWax.id, 0.05);

    // Motor Yıkama: 0.2 lt Şampuan (Aynı ürün!)
    await stockService.setRecipe(adminUser.id, service2.id, productShampoo.id, 0.2);
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('1. P1 & AC-05: Aynı ürünü kullanan çoklu hizmetlerde reçete tüketimleri ürün bazında toplanarak tek hareket yazılmalıdır', async () => {
    // İş emri oluştur: Hem Dış Yıkama hem Motor Yıkama içeriyor
    // Beklenen toplam Şampuan tüketimi = 0.1 + 0.2 = 0.3 lt
    // Beklenen toplam Cila tüketimi = 0.05 lt
    const order = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [
        { hizmet_id: service1.id },
        { hizmet_id: service2.id },
      ],
    });

    expect(order.durum).toBe('pending');
    expect(order.stok_dusuldu_at).toBeNull();

    // İşi tamamla (pending -> washing -> completed)
    await workOrderService.updateStatus(adminUser.id, order.id, 'washing');
    await workOrderService.updateStatus(adminUser.id, order.id, 'completed');

    const completedOrder = await workOrderService.getWorkOrderById(order.id);
    expect(completedOrder?.durum).toBe('completed');
    expect(completedOrder?.stok_dusuldu_at).not.toBeNull();

    // Veritabanındaki stok hareketlerini kontrol et
    const db = getDb();
    const movements = await db
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.kaynak_id, order.id));

    // Şampuan için tam 1 hareket ve Cila için tam 1 hareket olmalı (Toplam 2 consumption hareketi)
    expect(movements.length).toBe(2);

    const shampooMov = movements.find(m => m.urun_id === productShampoo.id && m.tur === 'consumption');
    expect(shampooMov).toBeDefined();
    expect(shampooMov?.miktar).toBeCloseTo(0.3, 4); // 0.1 + 0.2 = 0.3

    const waxMov = movements.find(m => m.urun_id === productWax.id && m.tur === 'consumption');
    expect(waxMov).toBeDefined();
    expect(waxMov?.miktar).toBeCloseTo(0.05, 4);

    // Ürün önbellek miktarlarını kontrol et (10 - 0.3 = 9.7 lt, 5 - 0.05 = 4.95 lt)
    const prods = await stockService.getAllProducts();
    const curShampoo = prods.find(p => p.id === productShampoo.id);
    const curWax = prods.find(p => p.id === productWax.id);

    expect(curShampoo?.mevcut_miktar).toBeCloseTo(9.7, 4);
    expect(curWax?.mevcut_miktar).toBeCloseTo(4.95, 4);
  });

  it('2. B1 & AC-05: İdempotens - Aynı iş emrinin tekrar tamamlanması veya çift çağrılması mükerrer stok düşürmemelidir', async () => {
    const prodsBefore = await stockService.getAllProducts();
    const shampooBefore = prodsBefore.find(p => p.id === productShampoo.id)!.mevcut_miktar;

    // Aynı iş emri için stok düşümünü tekrar çağır
    const order = await workOrderService.getTodayWorkOrders();
    const targetOrder = order[0];

    await stockService.deductRecipeStockForWorkOrder(adminUser.id, targetOrder.id);

    // Miktar değişmemelidir
    const prodsAfter = await stockService.getAllProducts();
    const shampooAfter = prodsAfter.find(p => p.id === productShampoo.id)!.mevcut_miktar;
    expect(shampooAfter).toBe(shampooBefore);
  });

  it('3. P1, P2 & FR-22: Tamamlanmış iş emri iptal edildiğinde ters stok hareketi (reversal) ürün bazında toplanarak yazılmalıdır', async () => {
    const orders = await workOrderService.getTodayWorkOrders();
    const targetOrder = orders[0];

    // İşi iptal et
    await workOrderService.updateStatus(adminUser.id, targetOrder.id, 'cancelled', {
      cancelReason: 'Müşteri vazgeçti',
    });

    // Veritabanında reversal hareketleri oluşmuş olmalıdır
    const db = getDb();
    const reversals = await db
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.kaynak_id, targetOrder.id));

    const shampooReversal = reversals.find(m => m.urun_id === productShampoo.id && m.tur === 'reversal');
    expect(shampooReversal).toBeDefined();
    expect(shampooReversal?.miktar).toBeCloseTo(0.3, 4);

    const waxReversal = reversals.find(m => m.urun_id === productWax.id && m.tur === 'reversal');
    expect(waxReversal).toBeDefined();
    expect(waxReversal?.miktar).toBeCloseTo(0.05, 4);

    // Stok önbelleği başlangıç seviyesine dönmüş olmalıdır (10 lt ve 5 lt)
    const prods = await stockService.getAllProducts();
    const finalShampoo = prods.find(p => p.id === productShampoo.id);
    const finalWax = prods.find(p => p.id === productWax.id);

    expect(finalShampoo?.mevcut_miktar).toBeCloseTo(10, 4);
    expect(finalWax?.mevcut_miktar).toBeCloseTo(5, 4);
  });

  it('4. B7 & AC-12: WAL modu aktifken .backup() API ile yedek alınabilmeli ve restore öncesi otomatik güvenlik yedeği oluşturulmalıdır', async () => {
    const backupDir = path.resolve(__dirname, 'test_backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, `test_backup_${Date.now()}.db`);

    // 1. Yedek al
    const backupRes = await backupService.createBackup(adminUser.id, backupFile);
    expect(backupRes.success).toBe(true);
    expect(fs.existsSync(backupFile)).toBe(true);
    expect(fs.statSync(backupFile).size).toBeGreaterThan(0);

    // 2. Geri yükle (Restore)
    const restoreRes = await backupService.restoreBackup(adminUser.id, backupFile);
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.autoSafetyBackup).toBeDefined();
    expect(fs.existsSync(restoreRes.autoSafetyBackup)).toBe(true);

    // Temizlik
    if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
    if (fs.existsSync(restoreRes.autoSafetyBackup)) fs.unlinkSync(restoreRes.autoSafetyBackup);
    if (fs.existsSync(backupDir)) fs.rmdirSync(backupDir, { recursive: true });
  });
});
