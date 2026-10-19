import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getDb } from '../electron/db/index';
import { runMigrations } from '../electron/db/migrate';
import { authService } from '../electron/services/authService';
import { cashSessionService } from '../electron/services/cashSessionService';
import { financeService } from '../electron/services/financeService';
import { summaryService } from '../electron/services/summaryService';
import { staffService } from '../electron/services/staffService';
import { vehicleService } from '../electron/services/vehicleService';
import { serviceCatalogService } from '../electron/services/serviceCatalogService';
import { workOrderService } from '../electron/services/workOrderService';
import { transactionRepository } from '../electron/repositories/transactionRepository';
import path from 'path';
import fs from 'fs';

describe('Gün 5: Finans, Kasa Kapanışı, Net Kâr ve SummaryService Testleri (FR-29 - FR-39, P3, A1, AC-06, AC-07)', () => {
  const testDbPath = path.resolve(__dirname, 'test_finance.db');
  let adminUser: any;
  let washerStaff: any;
  let testVehicle: any;
  let testService: any;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

    initDatabase({ dbPath: testDbPath });
    await runMigrations();

    const users = await authService.getUsers();
    adminUser = users.find((u) => u.rol === 'admin');

    // Personel ekle
    washerStaff = await staffService.createStaff(adminUser.id, {
      ad: 'Ahmet Usta',
      telefon: '05551112233',
      prim_orani: 10, // %10 prim
    });

    // Araç ve hizmet ekle
    const reg = await vehicleService.registerVehicle({
      rawPlate: '34 FIN 555',
      marka: 'BMW',
      model: '320',
      vehicle_type_id: 1,
    });
    testVehicle = reg!.vehicle;

    testService = await serviceCatalogService.createService(adminUser.id, {
      ad: 'Detaylı İç Yıkama',
      sure_dk: 45,
    });
    await serviceCatalogService.updatePrice(adminUser.id, testService.id, 1, 50000);
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('1. Kasa kapalıyken manuel nakit gelir/gider ekleme engellenmelidir', async () => {
    await expect(
      financeService.addManualTransaction(adminUser.id, {
        tur: 'expense',
        tutar_kurus: 10000,
        yontem: 'cash',
        aciklama: 'Temizlik bezi alımı',
      })
    ).rejects.toThrow('Açık kasa oturumu bulunamadı');
  });

  it('2. Kasa açılışı sonrası manuel nakit gelir beklenen kasayı artırmalı, gider azaltmalıdır', async () => {
    // Kasa 200 TL (20000 kuruş) ile açılsın
    const session = await cashSessionService.openSession(adminUser.id, 20000);
    expect(session.durum).toBe('open');
    expect(session.beklenen_kurus).toBe(20000);

    // 50 TL manuel nakit gider eklensin
    await financeService.addManualTransaction(adminUser.id, {
      tur: 'expense',
      tutar_kurus: 5000, // 50 TL
      yontem: 'cash',
      aciklama: 'Kırtasiye ve çay gideri',
    });

    let openSession = await cashSessionService.getOpenSession();
    expect(openSession!.beklenen_kurus).toBe(15000); // 200 - 50 = 150 TL

    // 100 TL manuel nakit ekstra gelir eklensin
    await financeService.addManualTransaction(adminUser.id, {
      tur: 'income',
      tutar_kurus: 10000, // 100 TL
      yontem: 'cash',
      aciklama: 'Hurda metal satışı',
    });

    openSession = await cashSessionService.getOpenSession();
    expect(openSession!.beklenen_kurus).toBe(25000); // 150 + 100 = 250 TL
  });

  it('3. Net Kâr formülü: netRevenue = income - refund, netProfit = netRevenue - expense (A1 kuralı)', async () => {
    // Başlangıç totals
    const initialTotals = await financeService.getNetProfitSummary();

    // Bir iş emri oluştur ve tamamla
    const order = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [
        {
          hizmet_id: testService.id,
          birim_fiyat_kurus: 50000, // 500 TL
          miktar: 1,
          staff_id: washerStaff.id,
        },
      ],
    });

    // Tahsilat yap (Nakit 500 TL)
    await workOrderService.addPayment(adminUser.id, order.id, 50000, 'cash');
    await workOrderService.updateStatus(adminUser.id, order.id, 'washing');
    await workOrderService.updateStatus(adminUser.id, order.id, 'completed');

    // Başka bir iş emri oluştur, tahsil et ve iptal edip iade yap
    const cancelOrder = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [
        {
          hizmet_id: testService.id,
          birim_fiyat_kurus: 50000,
          miktar: 1,
          staff_id: washerStaff.id,
        },
      ],
    });
    await workOrderService.addPayment(adminUser.id, cancelOrder.id, 50000, 'card');
    await workOrderService.updateStatus(adminUser.id, cancelOrder.id, 'cancelled', {
      cancelReason: 'Müşteri acil ayrıldı',
      adminPin: '1234',
    });

    // Net Kâr özeti kontrolü
    const totals = await financeService.getNetProfitSummary();

    // Gelirler: önceki 100 TL + 500 TL + 500 TL = 1100 TL (110000 kuruş)
    expect(totals.totalIncome).toBe(110000);
    // İadeler: iptal edilen iş emri = 500 TL (50000 kuruş)
    expect(totals.totalRefund).toBe(50000);
    // Giderler: önceki 50 TL = 5000 kuruş
    expect(totals.totalExpense).toBe(5000);

    // Net Ciro = 110000 - 50000 = 60000 kuruş (600 TL)
    expect(totals.netRevenue).toBe(60000);
    // Net Kâr = 60000 - 5000 = 55000 kuruş (550 TL)
    expect(totals.netProfit).toBe(55000);
  });

  it('4. Gün sonu kasa kapanışı ve fiziki sayım nakit farkı hesabı (FR-32, P3)', async () => {
    const openSession = await cashSessionService.getOpenSession();
    expect(openSession).not.toBeNull();

    // Beklenen kasa: Açılış (200) - Gider (50) + Ekstra Gelir (100) + Tahsilat (500) = 750 TL (75000 kuruş)
    expect(openSession!.beklenen_kurus).toBe(75000);

    // Fiziki sayımda kasada 740 TL (74000 kuruş) olduğunu varsayalım -> 10 TL açık (-1000 kuruş)
    const closed = await financeService.closeCashSession(adminUser.id, 74000);
    expect(closed.beklenen_kurus).toBe(75000);
    expect(closed.sayilan_kurus).toBe(74000);
    expect(closed.fark_kurus).toBe(-1000); // 10 TL kasa açığı

    // Oturumun kapandığını doğrula
    const afterSession = await cashSessionService.getOpenSession();
    expect(afterSession).toBeNull();
  });

  it('5. summaryService.getDailySummary tek merkezden tutarlı KPI verisi üretmelidir (FR-35)', async () => {
    const daily = await summaryService.getDailySummary();

    expect(daily.workOrders.total).toBe(2);
    expect(daily.workOrders.completed).toBe(1);
    expect(daily.workOrders.cancelled).toBe(1);
    expect(daily.workOrders.washedVehicles).toBe(1);

    expect(daily.finance.totalIncome).toBe(110000);
    expect(daily.finance.totalRefund).toBe(50000);
    expect(daily.finance.netRevenue).toBe(60000);
    expect(daily.finance.netProfit).toBe(55000);
  });

  it('6. summaryService.getReports trend, hizmet dağılımı ve personel primini doğru hesaplamalıdır (FR-36 - FR-39)', async () => {
    const reports = await summaryService.getReports('daily');

    expect(reports.trend.length).toBe(7);

    // Hizmet dağılımı: 1 adet Detaylı İç Yıkama (iptal edilen dahil edilmez)
    const detailService = reports.serviceBreakdown.find((s) => s.serviceName === 'Detaylı İç Yıkama');
    expect(detailService).toBeDefined();
    expect(detailService!.count).toBe(1);
    expect(detailService!.totalRevenueKurus).toBe(50000);

    // Personel prim hesabı: Ahmet Usta %10 prim -> 50000 kuruş * %10 = 5000 kuruş (50 TL)
    const staffRep = reports.staffPerformance.find((s) => s.name === 'Ahmet Usta');
    expect(staffRep).toBeDefined();
    expect(staffRep!.jobCount).toBe(1);
    expect(staffRep!.totalRevenueKurus).toBe(50000);
    expect(staffRep!.commissionKurus).toBe(5000); // 50 TL prim
  });
});
