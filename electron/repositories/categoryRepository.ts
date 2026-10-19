import { eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const categoryRepository = {
  async getAllCategories(tur?: 'income' | 'expense') {
    const db = getDb();
    if (tur) {
      return db.select().from(schema.categories).where(eq(schema.categories.tur, tur));
    }
    return db.select().from(schema.categories);
  },

  async createCategory(data: { ad: string; tur: 'income' | 'expense' }) {
    const db = getDb();
    const res = await db.insert(schema.categories).values({
      ad: data.ad,
      tur: data.tur,
      varsayilan: false,
    }).returning();
    return res[0];
  },

  async findCategoryById(id: number) {
    const db = getDb();
    const rows = await db.select().from(schema.categories).where(eq(schema.categories.id, id));
    return rows[0] || null;
  },
};
