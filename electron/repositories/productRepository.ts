import { eq, sql, lte } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const productRepository = {
  async getAllProducts() {
    const db = getDb();
    return db.select().from(schema.products);
  },

  async findProductById(id: number) {
    const db = getDb();
    const rows = await db.select().from(schema.products).where(eq(schema.products.id, id));
    return rows[0] || null;
  },

  async createProduct(data: {
    ad: string;
    kategori?: string | null;
    birim: 'lt' | 'kg' | 'piece';
    kritik_seviye?: number;
    ort_maliyet_kurus?: number;
  }) {
    const db = getDb();
    const res = await db.insert(schema.products).values({
      ad: data.ad,
      kategori: data.kategori || null,
      birim: data.birim,
      kritik_seviye: data.kritik_seviye ?? 0,
      mevcut_miktar: 0,
      ort_maliyet_kurus: data.ort_maliyet_kurus ?? 0,
    }).returning();
    return res[0];
  },

  async updateProduct(id: number, data: {
    ad?: string;
    kategori?: string | null;
    birim?: 'lt' | 'kg' | 'piece';
    kritik_seviye?: number;
    ort_maliyet_kurus?: number;
  }) {
    const db = getDb();
    await db.update(schema.products)
      .set(data)
      .where(eq(schema.products.id, id));
    return this.findProductById(id);
  },

  async updateStockCache(id: number, delta: number) {
    const db = getDb();
    await db.update(schema.products)
      .set({
        mevcut_miktar: sql`${schema.products.mevcut_miktar} + ${delta}`,
      })
      .where(eq(schema.products.id, id));
  },

  async getCriticalProducts() {
    const db = getDb();
    return db
      .select()
      .from(schema.products)
      .where(lte(schema.products.mevcut_miktar, schema.products.kritik_seviye));
  },
};
