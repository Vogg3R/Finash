import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const supplierRepository = {
  async getAllSuppliers() {
    const db = getDb();
    return db.select().from(schema.suppliers);
  },

  async createSupplier(data: { ad: string; telefon?: string; notlar?: string }) {
    const db = getDb();
    const res = await db.insert(schema.suppliers).values({
      ad: data.ad,
      telefon: data.telefon || null,
      notlar: data.notlar || null,
    }).returning();
    return res[0];
  },
};
