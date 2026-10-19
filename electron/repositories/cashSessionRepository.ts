import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const cashSessionRepository = {
  async getOpenSession() {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.cashSessions)
      .where(eq(schema.cashSessions.durum, 'open'))
      .orderBy(desc(schema.cashSessions.id))
      .limit(1);
    return rows[0] || null;
  },

  async openSession(acilisKurus: number) {
    const db = getDb();
    const res = await db.insert(schema.cashSessions).values({
      acilis_kurus: acilisKurus,
      beklenen_kurus: acilisKurus, // Açılışta beklenen = açılış kasası
      durum: 'open',
    }).returning();
    return res[0];
  },

  async updateExpectedCash(sessionId: number, deltaKurus: number) {
    const db = getDb();
    await db.update(schema.cashSessions)
      .set({
        beklenen_kurus: sql`${schema.cashSessions.beklenen_kurus} + ${deltaKurus}`,
      })
      .where(eq(schema.cashSessions.id, sessionId));
  },

  async closeSession(sessionId: number, sayilanKurus: number, farkKurus: number) {
    const db = getDb();
    await db.update(schema.cashSessions)
      .set({
        sayilan_kurus: sayilanKurus,
        fark_kurus: farkKurus,
        durum: 'closed',
        closed_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(schema.cashSessions.id, sessionId));
  },
};
