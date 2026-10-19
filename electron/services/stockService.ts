import { productRepository } from '../repositories/productRepository';
import { recipeRepository } from '../repositories/recipeRepository';
import { stockMovementRepository } from '../repositories/stockMovementRepository';
import { transactionRepository } from '../repositories/transactionRepository';
import { supplierRepository } from '../repositories/supplierRepository';
import { workOrderRepository } from '../repositories/workOrderRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';
import { getDb } from '../db/index';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export const stockService = {
  async getAllProducts() {
    return productRepository.getAllProducts();
  },

  async getCriticalProducts() {
    return productRepository.getCriticalProducts();
  },

  async createProduct(userId: number, data: {
    ad: string;
    kategori?: string | null;
    birim: 'lt' | 'kg' | 'piece';
    kritik_seviye?: number;
  }) {
    const product = await productRepository.createProduct(data);
    await auditLogRepository.log({
      user_id: userId,
      eylem: 'STOK_URUN_EKLE',
      tablo: 'products',
      kayit_id: product.id,
      yeni_deger: JSON.stringify(data),
    });
    return product;
  },

  async updateProduct(userId: number, id: number, data: {
    ad?: string;
    kategori?: string | null;
    birim?: 'lt' | 'kg' | 'piece';
    kritik_seviye?: number;
  }) {
    const updated = await productRepository.updateProduct(id, data);
    await auditLogRepository.log({
      user_id: userId,
      eylem: 'STOK_URUN_GUNCELLE',
      tablo: 'products',
      kayit_id: id,
      yeni_deger: JSON.stringify(data),
    });
    return updated;
  },

  // Reçete Yönetimi (FR-21)
  async getRecipesByServiceId(serviceId: number) {
    return recipeRepository.getRecipesByServiceId(serviceId);
  },

  async setRecipe(userId: number, serviceId: number, productId: number, miktar: number) {
    if (miktar <= 0) {
      throw new Error('Reçete miktarı sıfırdan büyük olmalıdır.');
    }
    await recipeRepository.setRecipe(serviceId, productId, miktar);
    await auditLogRepository.log({
      user_id: userId,
      eylem: 'RECETE_GUNCELLE',
      tablo: 'service_recipes',
      yeni_deger: JSON.stringify({ serviceId, productId, miktar }),
    });
  },

  async removeRecipe(userId: number, serviceId: number, productId: number) {
    await recipeRepository.removeRecipe(serviceId, productId);
    await auditLogRepository.log({
      user_id: userId,
      eylem: 'RECETE_SIL',
      tablo: 'service_recipes',
      yeni_deger: JSON.stringify({ serviceId, productId }),
    });
  },

  // Satın Alma / Stok Girişi (FR-20, A2)
  async addStockPurchase(userId: number, data: {
    urun_id: number;
    miktar: number;
    toplam_tutar_kurus: number;
    supplier_id?: number | null;
    createExpense?: boolean;
    yontem?: 'cash' | 'card' | 'transfer';
  }) {
    if (data.miktar <= 0) {
      throw new Error('Satın alma miktarı pozitif olmalıdır.');
    }

    const db = getDb();
    const sqlite = db.$client;

    return sqlite.transaction(() => {
      const unitCost = Math.round(data.toplam_tutar_kurus / data.miktar);

      // 1. Stok hareketi
      const movement = db.insert(schema.stockMovements).values({
        urun_id: data.urun_id,
        tur: 'in',
        kaynak_tur: 'purchase',
        miktar: data.miktar,
        birim_maliyet_kurus: unitCost,
        supplier_id: data.supplier_id || null,
      }).returning().get();

      // 2. Önbellek miktarını artır
      db.update(schema.products)
        .set({
          mevcut_miktar: sql`${schema.products.mevcut_miktar} + ${data.miktar}`,
          ort_maliyet_kurus: unitCost,
        })
        .where(eq(schema.products.id, data.urun_id))
        .run();

      // 3. İsteğe bağlı gider kaydı oluştur (FR-20)
      if (data.createExpense && data.toplam_tutar_kurus > 0) {
        db.insert(schema.transactions).values({
          tur: 'expense',
          tutar_kurus: Math.round(data.toplam_tutar_kurus),
          yontem: data.yontem || 'cash',
          aciklama: 'Malzeme / Stok Alımı',
          kaynak_tur: 'purchase',
          kaynak_id: movement.id,
        }).run();
      }

      return movement;
    })();
  },

  // Manuel Fire / Sayım Düzeltmesi (FR-23, FR-25)
  async recordManualMovement(userId: number, data: {
    urun_id: number;
    tur: 'waste' | 'audit';
    miktar: number; // pozitif miktar
    aciklama?: string;
  }) {
    if (data.miktar <= 0) {
      throw new Error('Miktar sıfırdan büyük olmalıdır.');
    }

    const db = getDb();
    const delta = data.tur === 'waste' ? -data.miktar : data.miktar;

    const res = await stockMovementRepository.createMovement({
      urun_id: data.urun_id,
      tur: data.tur,
      kaynak_tur: data.tur === 'waste' ? 'manual' : 'count',
      miktar: data.miktar,
    });

    await productRepository.updateStockCache(data.urun_id, delta);

    await auditLogRepository.log({
      user_id: userId,
      eylem: data.tur === 'waste' ? 'STOK_FIRE_CIKISI' : 'STOK_SAYIM_DUZELTME',
      tablo: 'stock_movements',
      kayit_id: res.id,
      yeni_deger: JSON.stringify(data),
    });

    return res;
  },

  /**
   * P1, B1 & FR-22 Kuralı:
   * İş emrindeki tüm hizmetlerin reçete miktarları ürün bazında toplanır ve
   * her ürün için tek bir 'consumption' hareketi yazılır.
   * stok_dusuldu_at doluysa mükerrer düşüm engellenir (idempotens).
   */
  async deductRecipeStockForWorkOrder(userId: number, workOrderId: number) {
    const db = getDb();
    const order = await workOrderRepository.getWorkOrderById(workOrderId);
    if (!order) return;

    // İdempotens kontrolü (B1)
    if (order.stok_dusuldu_at) {
      return; // Zaten stok düşüldü, mükerrer düşüm yapma
    }

    // İş emrindeki detay satırları
    const items = order.items;
    if (!items || items.length === 0) return;

    // Ürün bazında miktarları topla (P1 Kuralı)
    const aggregatedProducts: Record<number, number> = {};

    for (const item of items) {
      const recipes = await recipeRepository.getRecipesByServiceId(item.hizmet_id);
      for (const recipe of recipes) {
        const itemMultiplier = item.miktar || 1;
        const totalForThisService = recipe.miktar * itemMultiplier;
        aggregatedProducts[recipe.urun_id] = (aggregatedProducts[recipe.urun_id] || 0) + totalForThisService;
      }
    }

    const productIds = Object.keys(aggregatedProducts).map(Number);
    if (productIds.length === 0) {
      // Reçetesi olan ürün yoksa sadece damgayı güncelle
      await db.update(schema.workOrders)
        .set({ stok_dusuldu_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.workOrders.id, workOrderId));
      return;
    }

    // Atomik SQLite transaction ile hareketleri ve stok damgasını yaz
    const sqlite = db.$client;
    sqlite.transaction(() => {
      for (const pId of productIds) {
        const totalQty = aggregatedProducts[pId];

        // 1. Stok hareketi (consumption)
        db.insert(schema.stockMovements).values({
          urun_id: pId,
          tur: 'consumption',
          kaynak_tur: 'work_order',
          kaynak_id: workOrderId,
          miktar: totalQty,
        }).run();

        // 2. Önbelleği düş
        db.update(schema.products)
          .set({
            mevcut_miktar: sql`${schema.products.mevcut_miktar} - ${totalQty}`,
          })
          .where(eq(schema.products.id, pId))
          .run();
      }

      // 3. İş emrinde stok_dusuldu_at damgasını doldur
      db.update(schema.workOrders)
        .set({
          stok_dusuldu_at: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(schema.workOrders.id, workOrderId))
        .run();
    })();

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'STOK_OTOMATIK_DUSULDU',
      tablo: 'work_orders',
      kayit_id: workOrderId,
      yeni_deger: JSON.stringify(aggregatedProducts),
    });
  },

  /**
   * P1, P2, FR-22 & A1 Kuralı:
   * İptal edilen tamamlanmış/teslim edilmiş iş emrinin stok iadesi.
   * Tüketilen her ürün için tek bir 'reversal' hareketi yazılır ve önbellek artırılır.
   */
  async reverseRecipeStockForWorkOrder(userId: number, workOrderId: number) {
    const db = getDb();
    const order = await workOrderRepository.getWorkOrderById(workOrderId);
    if (!order || !order.stok_dusuldu_at) {
      return; // Henüz stok düşülmemişse iadeye gerek yok (Rule 5)
    }

    // Bu iş emrine bağlı yapılmış olan tüketim hareketlerini getir
    const movements = await stockMovementRepository.getMovementsByWorkOrderId(workOrderId);
    const consumptionMovements = movements.filter((m) => m.tur === 'consumption');

    if (consumptionMovements.length === 0) return;

    const sqlite = db.$client;
    sqlite.transaction(() => {
      for (const cm of consumptionMovements) {
        // 1. Reversal hareketi yaz
        db.insert(schema.stockMovements).values({
          urun_id: cm.urun_id,
          tur: 'reversal',
          kaynak_tur: 'work_order',
          kaynak_id: workOrderId,
          miktar: cm.miktar,
        }).run();

        // 2. Önbelleği geri artır
        db.update(schema.products)
          .set({
            mevcut_miktar: sql`${schema.products.mevcut_miktar} + ${cm.miktar}`,
          })
          .where(eq(schema.products.id, cm.urun_id))
          .run();
      }
    })();

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'STOK_OTOMATIK_IADE',
      tablo: 'work_orders',
      kayit_id: workOrderId,
      yeni_deger: JSON.stringify(consumptionMovements.map((c) => ({ urun_id: c.urun_id, miktar: c.miktar }))),
    });
  },

  async getMovements(limit = 100) {
    return stockMovementRepository.getAllMovements(limit);
  },

  async getAllSuppliers() {
    return supplierRepository.getAllSuppliers();
  },

  async createSupplier(data: { ad: string; telefon?: string; notlar?: string }) {
    return supplierRepository.createSupplier(data);
  },
};
