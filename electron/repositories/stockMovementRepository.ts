import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const stockMovementRepository = {
  async createMovement(data: {
    urun_id: number;
    tur: 'in' | 'consumption' | 'reversal' | 'waste' | 'audit';
    kaynak_tur: 'work_order' | 'purchase' | 'manual' | 'count';
    miktar: number;
    birim_maliyet_kurus?: number;
    kaynak_id?: number | null;
    supplier_id?: number | null;
  }) {
    const db = getDb();
    const res = await db.insert(schema.stockMovements).values({
      urun_id: data.urun_id,
      tur: data.tur,
      kaynak_tur: data.kaynak_tur,
      miktar: data.miktar,
      birim_maliyet_kurus: data.birim_maliyet_kurus ?? 0,
      kaynak_id: data.kaynak_id || null,
      supplier_id: data.supplier_id || null,
    }).returning();
    return res[0];
  },

  async getMovementsByWorkOrderId(workOrderId: number) {
    const db = getDb();
    return db
      .select()
      .from(schema.stockMovements)
      .where(and(
        eq(schema.stockMovements.kaynak_tur, 'work_order'),
        eq(schema.stockMovements.kaynak_id, workOrderId)
      ));
  },

  async getMovementsByProductId(productId: number) {
    const db = getDb();
    return db
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.urun_id, productId))
      .orderBy(desc(schema.stockMovements.id));
  },

  async getAllMovements(limit = 100) {
    const db = getDb();
    return db
      .select({
        movement: schema.stockMovements,
        product: schema.products,
        supplier: schema.suppliers,
      })
      .from(schema.stockMovements)
      .innerJoin(schema.products, eq(schema.stockMovements.urun_id, schema.products.id))
      .leftJoin(schema.suppliers, eq(schema.stockMovements.supplier_id, schema.suppliers.id))
      .orderBy(desc(schema.stockMovements.id))
      .limit(limit);
  },
};
