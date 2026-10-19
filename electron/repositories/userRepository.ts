import { eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const userRepository = {
  async findByUsername(username: string) {
    const db = getDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.kullanici_adi, username));
    return rows[0] || null;
  },

  async findById(id: number) {
    const db = getDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return rows[0] || null;
  },

  async getAllUsers() {
    const db = getDb();
    return db.select({
      id: schema.users.id,
      kullanici_adi: schema.users.kullanici_adi,
      rol: schema.users.rol,
      aktif: schema.users.aktif,
      ilkgiris_sifre_degistir: schema.users.ilkgiris_sifre_degistir,
      created_at: schema.users.created_at,
    }).from(schema.users);
  },

  async createUser(data: { kullanici_adi: string; sifre_hash: string; rol: 'admin' | 'cashier' | 'washer'; ilkgiris_sifre_degistir?: boolean }) {
    const db = getDb();
    const res = await db.insert(schema.users).values({
      kullanici_adi: data.kullanici_adi,
      sifre_hash: data.sifre_hash,
      rol: data.rol,
      aktif: true,
      ilkgiris_sifre_degistir: data.ilkgiris_sifre_degistir ?? false,
    }).returning();
    return res[0];
  },

  async updatePassword(id: number, newHash: string) {
    const db = getDb();
    await db.update(schema.users)
      .set({
        sifre_hash: newHash,
        ilkgiris_sifre_degistir: false,
      })
      .where(eq(schema.users.id, id));
  },

  async updateUser(id: number, data: { rol?: 'admin' | 'cashier' | 'washer'; aktif?: boolean }) {
    const db = getDb();
    await db.update(schema.users)
      .set(data)
      .where(eq(schema.users.id, id));
  },
};
