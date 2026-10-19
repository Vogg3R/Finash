import { eq, like } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const vehicleRepository = {
  async getAllVehicleTypes() {
    const db = getDb();
    return db.select().from(schema.vehicleTypes).orderBy(schema.vehicleTypes.sira);
  },

  async findVehicleById(id: number) {
    const db = getDb();
    const rows = await db
      .select({
        vehicle: schema.vehicles,
        vehicleType: schema.vehicleTypes,
        customer: schema.customers,
      })
      .from(schema.vehicles)
      .leftJoin(schema.vehicleTypes, eq(schema.vehicles.vehicle_type_id, schema.vehicleTypes.id))
      .leftJoin(schema.customers, eq(schema.vehicles.customer_id, schema.customers.id))
      .where(eq(schema.vehicles.id, id));
    return rows[0] || null;
  },

  async findByNormalizedPlate(normalizedPlate: string) {
    const db = getDb();
    const rows = await db
      .select({
        vehicle: schema.vehicles,
        vehicleType: schema.vehicleTypes,
        customer: schema.customers,
      })
      .from(schema.vehicles)
      .leftJoin(schema.vehicleTypes, eq(schema.vehicles.vehicle_type_id, schema.vehicleTypes.id))
      .leftJoin(schema.customers, eq(schema.vehicles.customer_id, schema.customers.id))
      .where(eq(schema.vehicles.plaka_normalized, normalizedPlate));

    return rows[0] || null;
  },

  async searchByNormalizedPlatePrefix(prefix: string) {
    const db = getDb();
    const pattern = `${prefix}%`;
    return db
      .select({
        vehicle: schema.vehicles,
        vehicleType: schema.vehicleTypes,
        customer: schema.customers,
      })
      .from(schema.vehicles)
      .leftJoin(schema.vehicleTypes, eq(schema.vehicles.vehicle_type_id, schema.vehicleTypes.id))
      .leftJoin(schema.customers, eq(schema.vehicles.customer_id, schema.customers.id))
      .where(like(schema.vehicles.plaka_normalized, pattern))
      .limit(20);
  },

  async createVehicle(data: {
    plaka: string;
    plaka_normalized: string;
    marka?: string;
    model?: string;
    renk?: string;
    vehicle_type_id: number;
    customer_id?: number | null;
  }) {
    const db = getDb();
    const res = await db.insert(schema.vehicles).values({
      plaka: data.plaka,
      plaka_normalized: data.plaka_normalized,
      marka: data.marka || null,
      model: data.model || null,
      renk: data.renk || null,
      vehicle_type_id: data.vehicle_type_id,
      customer_id: data.customer_id || null,
    }).returning();
    return res[0];
  },

  async updateVehicle(id: number, data: {
    marka?: string;
    model?: string;
    renk?: string;
    vehicle_type_id?: number;
    customer_id?: number | null;
  }) {
    const db = getDb();
    await db.update(schema.vehicles)
      .set(data)
      .where(eq(schema.vehicles.id, id));
  },
};
