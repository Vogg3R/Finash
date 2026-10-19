import { eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const staffRepository = {
  async getAllStaff() {
    const db = getDb();
    return db.select().from(schema.staff);
  },

  async getActiveStaff() {
    const db = getDb();
    return db.select().from(schema.staff).where(eq(schema.staff.aktif, true));
  },

  async findById(id: number) {
    const db = getDb();
    const rows = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
    return rows[0] || null;
  },

  async createStaff(data: { ad: string; telefon?: string; prim_orani?: number }) {
    const db = getDb();
    const res = await db.insert(schema.staff).values({
      ad: data.ad,
      telefon: data.telefon || null,
      prim_orani: data.prim_orani ?? 0,
      aktif: true,
    }).returning();
    return res[0];
  },

  async updateStaff(id: number, data: { ad?: string; telefon?: string; prim_orani?: number; aktif?: boolean }) {
    const db = getDb();
    await db.update(schema.staff)
      .set(data)
      .where(eq(schema.staff.id, id));
    return this.findById(id);
  },
};
