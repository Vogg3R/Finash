import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const auditLogRepository = {
  async log(data: {
    user_id?: number | null;
    eylem: string;
    tablo: string;
    kayit_id?: number | null;
    eski_deger?: string | null;
    yeni_deger?: string | null;
  }) {
    const db = getDb();
    await db.insert(schema.auditLog).values({
      user_id: data.user_id || null,
      eylem: data.eylem,
      tablo: data.tablo,
      kayit_id: data.kayit_id || null,
      eski_deger: data.eski_deger || null,
      yeni_deger: data.yeni_deger || null,
    });
  },

  async getRecentLogs(limit = 100) {
    const db = getDb();
    return db
      .select({
        id: schema.auditLog.id,
        user_id: schema.auditLog.user_id,
        kullanici_adi: schema.users.kullanici_adi,
        eylem: schema.auditLog.eylem,
        tablo: schema.auditLog.tablo,
        kayit_id: schema.auditLog.kayit_id,
        eski_deger: schema.auditLog.eski_deger,
        yeni_deger: schema.auditLog.yeni_deger,
        zaman: schema.auditLog.zaman,
      })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.auditLog.user_id, schema.users.id))
      .orderBy(desc(schema.auditLog.zaman))
      .limit(limit);
  },
};
