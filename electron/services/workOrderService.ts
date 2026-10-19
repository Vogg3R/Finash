import { workOrderRepository } from '../repositories/workOrderRepository';
import { vehicleRepository } from '../repositories/vehicleRepository';
import { serviceRepository } from '../repositories/serviceRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { transactionRepository } from '../repositories/transactionRepository';
import { cashSessionRepository } from '../repositories/cashSessionRepository';
import { userRepository } from '../repositories/userRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';
import { authService } from './authService';
import { stockService } from './stockService';

export const workOrderService = {
  async getTodayWorkOrders() {
    return workOrderRepository.getTodayWorkOrders();
  },

  async getWorkOrderById(id: number) {
    return workOrderRepository.getWorkOrderById(id);
  },

  async createWorkOrder(userId: number, data: {
    arac_id: number;
    items: Array<{
      hizmet_id: number;
      birim_fiyat_kurus?: number;
      miktar?: number;
      staff_id?: number | null;
    }>;
    indirim_kurus?: number;
    adminPin?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error('İş emrinde en az bir hizmet seçilmelidir.');
    }

    const vehicleData = await vehicleRepository.findVehicleById(data.arac_id);
    if (!vehicleData) {
      throw new Error('Araç bulunamadı.');
    }

    const vehicleTypeId = vehicleData.vehicle.vehicle_type_id;

    // Her hizmetin fiyatını hesapla
    const orderItems: Array<{
      hizmet_id: number;
      birim_fiyat_kurus: number;
      miktar: number;
      staff_id?: number | null;
    }> = [];

    let brutToplamKurus = 0;

    for (const item of data.items) {
      let unitPrice = item.birim_fiyat_kurus;
      if (unitPrice === undefined || unitPrice === null) {
        const matrixPrice = await serviceRepository.getPrice(item.hizmet_id, vehicleTypeId);
        unitPrice = matrixPrice ?? 0;
      }
      const miktar = item.miktar ?? 1;
      brutToplamKurus += unitPrice * miktar;

      orderItems.push({
        hizmet_id: item.hizmet_id,
        birim_fiyat_kurus: unitPrice,
        miktar,
        staff_id: item.staff_id || null,
      });
    }

    const indirimKurus = Math.max(0, Math.round(data.indirim_kurus || 0));

    if (indirimKurus > brutToplamKurus) {
      throw new Error('İndirim tutarı toplam tutardan büyük olamaz.');
    }

    // Yetki Kontrolü (B5 kuralı: Kasa rolü max %10 indirim, üstü Yönetici PIN)
    if (indirimKurus > 0 && brutToplamKurus > 0) {
      const user = await userRepository.findById(userId);
      const discountPercent = (indirimKurus / brutToplamKurus) * 100;

      if (user?.rol === 'cashier' && discountPercent > 10) {
        if (!data.adminPin) {
          throw new Error('%10 üzeri indirim için Yönetici PIN onayı zorunludur.');
        }
        const isValidPin = await authService.verifyAdminPin(data.adminPin);
        if (!isValidPin) {
          throw new Error('Geçersiz Yönetici PIN kodu.');
        }

        await auditLogRepository.log({
          user_id: userId,
          eylem: 'INDIRIM_YONETICI_ONAYLI',
          tablo: 'work_orders',
          yeni_deger: JSON.stringify({
            brut_toplam_kurus: brutToplamKurus,
            indirim_kurus: indirimKurus,
            indirim_yuzde: discountPercent.toFixed(2),
          }),
        });
      }
    }

    const orderNo = await workOrderRepository.generateOrderNo();

    const createdOrder = await workOrderRepository.createWorkOrder({
      no: orderNo,
      arac_id: data.arac_id,
      user_id: userId,
      toplam_kurus: brutToplamKurus,
      indirim_kurus: indirimKurus,
      items: orderItems,
    });

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'IS_EMRI_OLUSTURULDU',
      tablo: 'work_orders',
      kayit_id: createdOrder.id,
      yeni_deger: JSON.stringify({
        no: orderNo,
        arac_id: data.arac_id,
        toplam_kurus: brutToplamKurus,
        indirim_kurus: indirimKurus,
      }),
    });

    return createdOrder;
  },

  async updateStatus(userId: number, orderId: number, newStatus: 'pending' | 'washing' | 'completed' | 'delivered' | 'cancelled', options?: {
    cancelReason?: string;
    adminPin?: string;
  }) {
    const current = await workOrderRepository.getWorkOrderById(orderId);
    if (!current) {
      throw new Error('İş emri bulunamadı.');
    }

    // Durum Makinesi Geçiş Matrisi (B2, P2 kuralları)
    const allowedTransitions: Record<string, string[]> = {
      pending: ['washing', 'cancelled'],
      washing: ['completed', 'cancelled'],
      completed: ['delivered', 'cancelled'],
      delivered: ['cancelled'], // P2: Sadece Yönetici PIN ile iptal edilebilir
      cancelled: [], // Terminal durum
    };

    const possibleNext = allowedTransitions[current.durum] || [];
    if (!possibleNext.includes(newStatus)) {
      throw new Error(`Geçersiz durum geçişi: ${current.durum} -> ${newStatus}`);
    }

    // İptal Senaryosu (FR-09, B3, P2, P3)
    if (newStatus === 'cancelled') {
      if (!options?.cancelReason || options.cancelReason.trim().length === 0) {
        throw new Error('İş emrini iptal etmek için iptal gerekçesi belirtilmesi zorunludur.');
      }

      // delivered -> cancelled için Yönetici PIN kontrolü
      if (current.durum === 'delivered') {
        if (!options.adminPin) {
          throw new Error('Teslim edilmiş iş emrinin iptali için Yönetici PIN onayı zorunludur.');
        }
        const isValidPin = await authService.verifyAdminPin(options.adminPin);
        if (!isValidPin) {
          throw new Error('Geçersiz Yönetici PIN kodu.');
        }
      }

      // İade İşlemleri: Yapılan tahsilatları kontrol et
      const payments = await paymentRepository.getPaymentsByWorkOrderId(orderId);
      const hasCashPayment = payments.some(p => p.yontem === 'cash');

      let openSession: any = null;
      if (hasCashPayment) {
        openSession = await cashSessionRepository.getOpenSession();
        if (!openSession) {
          throw new Error('Nakit iade yapılabilmesi için açık bir kasa oturumu olmalıdır. Lütfen önce kasayı açın.');
        }
      }

      // Her ödeme için ters 'refund' finans kaydı oluştur
      for (const p of payments) {
        if (p.yontem === 'cash') {
          await transactionRepository.createTransaction({
            tur: 'refund',
            tutar_kurus: p.tutar_kurus, // A1 kuralı: pozitif tutar
            yontem: 'cash',
            kaynak_tur: 'payment',
            kaynak_id: p.id,
            cash_session_id: openSession.id,
            aciklama: `İş Emri İptal İadesi (${current.no})`,
          });
          // Açık kasa bakiyesinden düş
          await cashSessionRepository.updateExpectedCash(openSession.id, -p.tutar_kurus);
        } else {
          await transactionRepository.createTransaction({
            tur: 'refund',
            tutar_kurus: p.tutar_kurus,
            yontem: p.yontem,
            kaynak_tur: 'payment',
            kaynak_id: p.id,
            cash_session_id: null,
            aciklama: `İş Emri İptal İadesi (${current.no})`,
          });
        }
      }

      // Stok İadesi (P1, P2, FR-22 kuralı: stok düşülmüşse ters kayıt yaz)
      if (current.stok_dusuldu_at) {
        await stockService.reverseRecipeStockForWorkOrder(userId, orderId);
      }

      await workOrderRepository.updateStatus(orderId, 'cancelled', options.cancelReason);

      await auditLogRepository.log({
        user_id: userId,
        eylem: 'IS_EMRI_IPTAL',
        tablo: 'work_orders',
        kayit_id: orderId,
        eski_deger: JSON.stringify({ durum: current.durum }),
        yeni_deger: JSON.stringify({ durum: 'cancelled', gerekce: options.cancelReason }),
      });

      return;
    }

    // Normal durum ilerletme
    await workOrderRepository.updateStatus(orderId, newStatus);

    // İş tamamlandığında otomatik reçete bazlı stok düşümü (FR-22, P1, B1)
    if (newStatus === 'completed' || newStatus === 'delivered') {
      if (!current.stok_dusuldu_at) {
        await stockService.deductRecipeStockForWorkOrder(userId, orderId);
      }
    }

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'DURUM_GUNCELLEME',
      tablo: 'work_orders',
      kayit_id: orderId,
      eski_deger: JSON.stringify({ durum: current.durum }),
      yeni_deger: JSON.stringify({ durum: newStatus }),
    });
  },

  async addPayment(userId: number, workOrderId: number, tutarKurus: number, yontem: 'cash' | 'card' | 'transfer') {
    const order = await workOrderRepository.getWorkOrderById(workOrderId);
    if (!order) {
      throw new Error('İş emri bulunamadı.');
    }

    if (order.durum === 'cancelled') {
      throw new Error('İptal edilmiş bir iş emrine ödeme alınamaz.');
    }

    if (tutarKurus <= 0) {
      throw new Error('Tahsilat tutarı sıfırdan büyük olmalıdır.');
    }

    let sessionId: number | null = null;
    if (yontem === 'cash') {
      const openSession = await cashSessionRepository.getOpenSession();
      if (!openSession) {
        throw new Error('Nakit tahsilat yapılabilmesi için açık bir kasa oturumu olmalıdır. Lütfen önce kasayı açın.');
      }
      sessionId = openSession.id;
    }

    // 1. Ödeme kaydı
    const payment = await paymentRepository.createPayment({
      work_order_id: workOrderId,
      tutar_kurus: Math.round(tutarKurus),
      yontem,
    });

    // 2. Gelir (transactions) kaydı
    await transactionRepository.createTransaction({
      tur: 'income',
      tutar_kurus: Math.round(tutarKurus),
      yontem,
      kaynak_tur: 'payment',
      kaynak_id: payment.id,
      cash_session_id: sessionId,
      aciklama: `İş Emri Tahsilatı (${order.no})`,
    });

    // 3. Nakit ise açık kasa oturumunun beklenen tutarını artır
    if (yontem === 'cash' && sessionId) {
      await cashSessionRepository.updateExpectedCash(sessionId, Math.round(tutarKurus));
    }

    // 4. Audit Log
    await auditLogRepository.log({
      user_id: userId,
      eylem: 'TAHSILAT_ALINDI',
      tablo: 'payments',
      kayit_id: payment.id,
      yeni_deger: JSON.stringify({
        work_order_id: workOrderId,
        tutar_kurus: Math.round(tutarKurus),
        yontem,
      }),
    });

    return payment;
  },
};
