import { eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const settingsRepository = {
  async getAllSettings(): Promise<Record<string, string>> {
    const db = getDb();
    const rows = await db.select().from(schema.settings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.anahtar] = row.deger;
    }
    return result;
  },

  async getSetting(key: string): Promise<string | null> {
    const db = getDb();
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.anahtar, key));
    return rows[0]?.deger ?? null;
  },

  async setSetting(key: string, value: string) {
    const db = getDb();
    const existing = await db.select().from(schema.settings).where(eq(schema.settings.anahtar, key));
    if (existing.length > 0) {
      await db.update(schema.settings).set({ deger: value }).where(eq(schema.settings.anahtar, key));
    } else {
      await db.insert(schema.settings).values({ anahtar: key, deger: value });
    }
  },

  async setMultipleSettings(settingsMap: Record<string, string>) {
    for (const [k, v] of Object.entries(settingsMap)) {
      await this.setSetting(k, v);
    }
  },
};
