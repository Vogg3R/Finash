import { eq, like, or } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const customerRepository = {
  async getAllCustomers() {
    const db = getDb();
    return db.select().from(schema.customers);
  },

  async findById(id: number) {
    const db = getDb();
    const rows = await db.select().from(schema.customers).where(eq(schema.customers.id, id));
    return rows[0] || null;
  },

  async searchCustomers(query: string) {
    const db = getDb();
    const searchPattern = `%${query}%`;
    return db.select().from(schema.customers).where(
      or(
        like(schema.customers.ad, searchPattern),
        like(schema.customers.telefon, searchPattern)
      )
    );
  },

  async createCustomer(data: { ad: string; telefon?: string; notlar?: string }) {
    const db = getDb();
    const res = await db.insert(schema.customers).values({
      ad: data.ad,
      telefon: data.telefon || null,
      notlar: data.notlar || null,
      veresiye_bakiye_kurus: 0,
    }).returning();
    return res[0];
  },

  async updateCustomer(id: number, data: { ad?: string; telefon?: string; notlar?: string }) {
    const db = getDb();
    await db.update(schema.customers)
      .set(data)
      .where(eq(schema.customers.id, id));
    return this.findById(id);
  },
};
