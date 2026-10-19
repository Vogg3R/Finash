import { eq, and, desc, sql, or } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const emailOutboxRepository = {
  async enqueueEmail(data: {
    tur: 'daily' | 'weekly';
    donem: string;
    tetikleyen: 'button' | 'auto';
    user_id?: number | null;
  }) {
    const db = getDb();
    const res = await db.insert(schema.emailOutbox).values({
      tur: data.tur,
      donem: data.donem,
      tetikleyen: data.tetikleyen,
      user_id: data.user_id || null,
      durum: 'pending',
      deneme_sayisi: 0,
    }).returning();
    return res[0];
  },

  async getLatestForPeriod(tur: 'daily' | 'weekly', donem: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.emailOutbox)
      .where(and(
        eq(schema.emailOutbox.tur, tur),
        eq(schema.emailOutbox.donem, donem)
      ))
      .orderBy(desc(schema.emailOutbox.id))
      .limit(1);
    return rows[0] || null;
  },

  /**
   * B6 Kuralı: Atomik kilitleme ve 5 dakikada bir otomatik yeniden deneme (retry)
   * Gönderilmeyi bekleyen ('pending') ya da 5 dk kilit aşımına uğramış ('sending' & zaman aşımı)
   * veya başarısız olmuş ('failed' ve deneme_sayisi < 5) kayıtları getirir.
   */
  async getPendingOrRetryable(lockTimeoutMinutes = 5) {
    const db = getDb();
    const timeoutThreshold = new Date(Date.now() - lockTimeoutMinutes * 60 * 1000).toISOString();

    return db
      .select()
      .from(schema.emailOutbox)
      .where(
        or(
          eq(schema.emailOutbox.durum, 'pending'),
          and(
            eq(schema.emailOutbox.durum, 'sending'),
            sql`${schema.emailOutbox.kilit_zamani} <= ${timeoutThreshold}`
          ),
          and(
            eq(schema.emailOutbox.durum, 'failed'),
            sql`${schema.emailOutbox.deneme_sayisi} < 5`
          )
        )
      )
      .orderBy(schema.emailOutbox.id);
  },

  /**
   * Atomik kilit alma (B6): `pending` veya zaman aşımına uğramış `sending` kaydını kilitler.
   */
  async acquireLock(id: number, lockTimeoutMinutes = 5): Promise<boolean> {
    const db = getDb();
    const nowIso = new Date().toISOString();
    const timeoutThreshold = new Date(Date.now() - lockTimeoutMinutes * 60 * 1000).toISOString();

    const res = await db
      .update(schema.emailOutbox)
      .set({
        durum: 'sending',
        kilit_zamani: nowIso,
        deneme_sayisi: sql`${schema.emailOutbox.deneme_sayisi} + 1`,
      })
      .where(
        and(
          eq(schema.emailOutbox.id, id),
          or(
            eq(schema.emailOutbox.durum, 'pending'),
            and(
              eq(schema.emailOutbox.durum, 'sending'),
              sql`${schema.emailOutbox.kilit_zamani} <= ${timeoutThreshold}`
            ),
            and(
              eq(schema.emailOutbox.durum, 'failed'),
              sql`${schema.emailOutbox.deneme_sayisi} < 5`
            )
          )
        )
      )
      .returning();

    return res.length > 0;
  },

  async markSent(id: number) {
    const db = getDb();
    const nowIso = new Date().toISOString();

    await db
      .update(schema.emailOutbox)
      .set({
        durum: 'sent',
        gonderim_zamani: nowIso,
        kilit_zamani: null,
        son_hata: null,
      })
      .where(eq(schema.emailOutbox.id, id));
  },

  async markFailed(id: number, errorMessage: string) {
    const db = getDb();

    await db
      .update(schema.emailOutbox)
      .set({
        durum: 'failed',
        son_hata: errorMessage,
        kilit_zamani: null,
      })
      .where(eq(schema.emailOutbox.id, id));
  },

  async getQueueStatus() {
    const db = getDb();
    const todayStr = new Date().toISOString().substring(0, 10);

    const all = await db.select().from(schema.emailOutbox).orderBy(desc(schema.emailOutbox.id)).limit(10);
    const pendingCount = all.filter((e) => e.durum === 'pending' || e.durum === 'sending').length;
    const failedCount = all.filter((e) => e.durum === 'failed').length;
    const todaySent = all.some((e) => e.donem === todayStr && e.durum === 'sent');

    return {
      pendingCount,
      failedCount,
      todaySent,
      latestItem: all[0] || null,
    };
  },
};
