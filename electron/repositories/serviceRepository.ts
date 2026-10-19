import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const serviceRepository = {
  async getAllServices(includeInactive = false) {
    const db = getDb();
    if (includeInactive) {
      return db.select().from(schema.services);
    }
    return db.select().from(schema.services).where(eq(schema.services.aktif, true));
  },

  async findServiceById(id: number) {
    const db = getDb();
    const rows = await db.select().from(schema.services).where(eq(schema.services.id, id));
    return rows[0] || null;
  },

  async createService(data: { ad: string; aciklama?: string; sure_dk?: number }) {
    const db = getDb();
    const res = await db.insert(schema.services).values({
      ad: data.ad,
      aciklama: data.aciklama || null,
      sure_dk: data.sure_dk ?? 30,
      aktif: true,
    }).returning();
    return res[0];
  },

  async updateService(id: number, data: { ad?: string; aciklama?: string; sure_dk?: number; aktif?: boolean }) {
    const db = getDb();
    await db.update(schema.services)
      .set(data)
      .where(eq(schema.services.id, id));
    return this.findServiceById(id);
  },

  // Fiyat Matrisi
  async getPriceMatrix() {
    const db = getDb();
    return db
      .select({
        id: schema.servicePrices.id,
        hizmet_id: schema.servicePrices.hizmet_id,
        arac_tipi_id: schema.servicePrices.arac_tipi_id,
        fiyat_kurus: schema.servicePrices.fiyat_kurus,
        gecerlilik_baslangici: schema.servicePrices.gecerlilik_baslangici,
        serviceName: schema.services.ad,
        vehicleTypeName: schema.vehicleTypes.ad,
      })
      .from(schema.servicePrices)
      .innerJoin(schema.services, eq(schema.servicePrices.hizmet_id, schema.services.id))
      .innerJoin(schema.vehicleTypes, eq(schema.servicePrices.arac_tipi_id, schema.vehicleTypes.id));
  },

  async getPrice(serviceId: number, vehicleTypeId: number): Promise<number | null> {
    const db = getDb();
    const rows = await db.select()
      .from(schema.servicePrices)
      .where(and(
        eq(schema.servicePrices.hizmet_id, serviceId),
        eq(schema.servicePrices.arac_tipi_id, vehicleTypeId)
      ));
    return rows[0]?.fiyat_kurus ?? null;
  },

  async setPrice(serviceId: number, vehicleTypeId: number, priceKurus: number) {
    const db = getDb();
    const existing = await db.select()
      .from(schema.servicePrices)
      .where(and(
        eq(schema.servicePrices.hizmet_id, serviceId),
        eq(schema.servicePrices.arac_tipi_id, vehicleTypeId)
      ));

    if (existing.length > 0) {
      await db.update(schema.servicePrices)
        .set({ fiyat_kurus: priceKurus })
        .where(eq(schema.servicePrices.id, existing[0].id));
    } else {
      await db.insert(schema.servicePrices).values({
        hizmet_id: serviceId,
        arac_tipi_id: vehicleTypeId,
        fiyat_kurus: priceKurus,
      });
    }
  },
};
