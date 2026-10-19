import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getDb } from '../electron/db/index';
import { runMigrations } from '../electron/db/migrate';
import { authService } from '../electron/services/authService';
import { cashSessionService } from '../electron/services/cashSessionService';
import { workOrderService } from '../electron/services/workOrderService';
import { vehicleService } from '../electron/services/vehicleService';
import { serviceCatalogService } from '../electron/services/serviceCatalogService';
import * as schema from '../electron/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

describe('Gün 3: İş Emri, Durum Makinesi, Kasa ve İptal/İade Testleri (FR-01 - FR-09, B2, B3, B5, P2, P3, A1)', () => {
  const testDbPath = path.resolve(__dirname, 'test_orders.db');
  let adminUser: any;
  let cashierUser: any;
  let testVehicle: any;
  let testService: any;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);

    initDatabase({ dbPath: testDbPath });
    await runMigrations();

    const users = await authService.getUsers();
    adminUser = users.find(u => u.rol === 'admin');

    // Kasiyer kullanıcı oluştur
    cashierUser = await authService.createUser(adminUser.id, {
      kullanici_adi: 'kasiyer1',
      sifre: '1234',
      rol: 'cashier',
    });

    // Araç kaydet
    const reg = await vehicleService.registerVehicle({
      rawPlate: '34 WT 2026',
      marka: 'Toyota',
      model: 'Corolla',
      renk: 'Beyaz',
      vehicle_type_id: 1, // Binek
    });
    testVehicle = reg!.vehicle;

    // Hizmet oluştur ve fiyat matrisine fiyat ekle
    testService = await serviceCatalogService.createService(adminUser.id, {
      ad: 'İç-Dış Yıkama',
      sure_dk: 45,
    });
    await serviceCatalogService.updatePrice(adminUser.id, testService.id, 1, 25000); // 250 TL (Binek)
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('1. Kasa kapalıyken nakit tahsilat engellenmelidir (P3)', async () => {
    const order = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [{ hizmet_id: testService.id }],
    });

    expect(order.id).toBeDefined();
    expect(order.durum).toBe('pending');
    expect(order.toplam_kurus).toBeGreaterThan(0);

    // Kasa henüz açılmadı, nakit tahsilat denenirse hata vermeli
    await expect(
      workOrderService.addPayment(adminUser.id, order.id, 10000, 'cash')
    ).rejects.toThrow('Nakit tahsilat yapılabilmesi için açık bir kasa oturumu olmalıdır');

    // Kart ile tahsilat kasa kapalıyken de yapılabilmelidir
    const cardPayment = await workOrderService.addPayment(adminUser.id, order.id, 5000, 'card');
    expect(cardPayment.yontem).toBe('card');
    expect(cardPayment.tutar_kurus).toBe(5000);
  });

  it('2. Kasa açılışı sonrası nakit tahsilat yapılabilmeli ve beklenen kasa artmalıdır (P3, FR-32)', async () => {
    const session = await cashSessionService.openSession(adminUser.id, 50000); // 500 TL açılış
    expect(session.durum).toBe('open');
    expect(session.beklenen_kurus).toBe(50000);

    const order = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [{ hizmet_id: testService.id }],
    });

    const payment = await workOrderService.addPayment(adminUser.id, order.id, 25000, 'cash'); // 250 TL nakit
    expect(payment.yontem).toBe('cash');

    const updatedSession = await cashSessionService.getOpenSession();
    expect(updatedSession?.beklenen_kurus).toBe(75000); // 500 + 250 = 750 TL
  });

  it('3. İndirim Yetkisi: Kasiyer en fazla %10 indirim yapabilmeli, üstü Yönetici PIN istemelidir (B5, FR-03)', async () => {
    // Hizmet fiyatı 300 TL (30000 kuruş) olsun
    // %10 indirim = 3000 kuruş -> İzin verilmeli
    const order1 = await workOrderService.createWorkOrder(cashierUser.id, {
      arac_id: testVehicle.id,
      items: [{ hizmet_id: testService.id, birim_fiyat_kurus: 30000 }],
      indirim_kurus: 3000,
    });
    expect(order1.indirim_kurus).toBe(3000);

    // %15 indirim = 4500 kuruş -> PIN olmadan reddedilmeli
    await expect(
      workOrderService.createWorkOrder(cashierUser.id, {
        arac_id: testVehicle.id,
        items: [{ hizmet_id: testService.id, birim_fiyat_kurus: 30000 }],
        indirim_kurus: 4500,
      })
    ).rejects.toThrow('%10 üzeri indirim için Yönetici PIN onayı zorunludur');

    // Yanlış PIN ile denenirse reddedilmeli
    await expect(
      workOrderService.createWorkOrder(cashierUser.id, {
        arac_id: testVehicle.id,
        items: [{ hizmet_id: testService.id, birim_fiyat_kurus: 30000 }],
        indirim_kurus: 4500,
        adminPin: '9999',
      })
    ).rejects.toThrow('Geçersiz Yönetici PIN kodu');

    // Doğru Admin PIN ile onaylanmalıdır (Varsayılan şifre '123456')
    const order2 = await workOrderService.createWorkOrder(cashierUser.id, {
      arac_id: testVehicle.id,
      items: [{ hizmet_id: testService.id, birim_fiyat_kurus: 30000 }],
      indirim_kurus: 4500,
      adminPin: '123456',
    });
    expect(order2.indirim_kurus).toBe(4500);
  });

  it('4. Durum Makinesi: İzinli ve izinsiz durum geçişleri doğru doğrulanmalıdır (B2, AC-11)', async () => {
    const order = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [{ hizmet_id: testService.id }],
    });

    expect(order.durum).toBe('pending');

    // pending -> completed doğrudan geçilemez (önce washing olmalı)
    await expect(
      workOrderService.updateStatus(adminUser.id, order.id, 'completed')
    ).rejects.toThrow('Geçersiz durum geçişi: pending -> completed');

    // pending -> washing geçerli
    await workOrderService.updateStatus(adminUser.id, order.id, 'washing');
    let fetched = await workOrderService.getWorkOrderById(order.id);
    expect(fetched?.durum).toBe('washing');

    // washing -> delivered doğrudan geçilemez
    await expect(
      workOrderService.updateStatus(adminUser.id, order.id, 'delivered')
    ).rejects.toThrow('Geçersiz durum geçişi: washing -> delivered');

    // washing -> completed geçerli
    await workOrderService.updateStatus(adminUser.id, order.id, 'completed');
    fetched = await workOrderService.getWorkOrderById(order.id);
    expect(fetched?.durum).toBe('completed');

    // completed -> delivered geçerli
    await workOrderService.updateStatus(adminUser.id, order.id, 'delivered');
    fetched = await workOrderService.getWorkOrderById(order.id);
    expect(fetched?.durum).toBe('delivered');

    // delivered -> washing reddedilmelidir
    await expect(
      workOrderService.updateStatus(adminUser.id, order.id, 'washing')
    ).rejects.toThrow('Geçersiz durum geçişi: delivered -> washing');
  });

  it('5. P2: delivered -> cancelled geçişi Yönetici PIN onayı ve iptal gerekçesi gerektirmelidir', async () => {
    const order = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [{ hizmet_id: testService.id }],
    });
    await workOrderService.updateStatus(adminUser.id, order.id, 'washing');
    await workOrderService.updateStatus(adminUser.id, order.id, 'completed');
    await workOrderService.updateStatus(adminUser.id, order.id, 'delivered');

    // Gerekçesiz iptal reddedilmeli
    await expect(
      workOrderService.updateStatus(adminUser.id, order.id, 'cancelled', {
        adminPin: '123456',
      })
    ).rejects.toThrow('İş emrini iptal etmek için iptal gerekçesi belirtilmesi zorunludur');

    // PIN olmadan iptal reddedilmeli
    await expect(
      workOrderService.updateStatus(adminUser.id, order.id, 'cancelled', {
        cancelReason: 'Müşteri memnuniyetsizliği',
      })
    ).rejects.toThrow('Teslim edilmiş iş emrinin iptali için Yönetici PIN onayı zorunludur');

    // Doğru PIN ve gerekçe ile iptal kabul edilmelidir
    await workOrderService.updateStatus(adminUser.id, order.id, 'cancelled', {
      cancelReason: 'Müşteri memnuniyetsizliği',
      adminPin: '123456',
    });

    const cancelledOrder = await workOrderService.getWorkOrderById(order.id);
    expect(cancelledOrder?.durum).toBe('cancelled');
    expect(cancelledOrder?.iptal_gerekcesi).toBe('Müşteri memnuniyetsizliği');

    // cancelled durumundan başka duruma geçilemez (terminal durum)
    await expect(
      workOrderService.updateStatus(adminUser.id, order.id, 'pending')
    ).rejects.toThrow('Geçersiz durum geçişi: cancelled -> pending');
  });

  it('6. İptal + İade Senaryosu: Nakit ödemesi olan iş iptal edildiğinde refund kaydı atılmalı ve kasa düşmelidir (FR-09, B3, A1, AC-06)', async () => {
    const initialSession = await cashSessionService.getOpenSession();
    const initialCash = initialSession!.beklenen_kurus;

    const order = await workOrderService.createWorkOrder(adminUser.id, {
      arac_id: testVehicle.id,
      items: [{ hizmet_id: testService.id, birim_fiyat_kurus: 20000 }],
    });

    // 200 TL nakit tahsilat al
    await workOrderService.addPayment(adminUser.id, order.id, 20000, 'cash');

    const midSession = await cashSessionService.getOpenSession();
    expect(midSession?.beklenen_kurus).toBe(initialCash + 20000);

    // İşi iptal et
    await workOrderService.updateStatus(adminUser.id, order.id, 'cancelled', {
      cancelReason: 'Araç sahibi acil ayrıldı',
    });

    // Kasa beklenen tutarı 200 TL düşmüş olmalıdır
    const finalSession = await cashSessionService.getOpenSession();
    expect(finalSession?.beklenen_kurus).toBe(initialCash);

    // Veritabanında pozitif tutarlı 'refund' işlemi oluşmuş olmalıdır (A1)
    const db = getDb();
    const refunds = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.tur, 'refund'));

    expect(refunds.length).toBeGreaterThan(0);
    const lastRefund = refunds[refunds.length - 1];
    expect(lastRefund.tutar_kurus).toBe(20000); // Pozitif integer kuruş
    expect(lastRefund.yontem).toBe('cash');
    expect(lastRefund.cash_session_id).toBe(finalSession?.id);
  });
});
