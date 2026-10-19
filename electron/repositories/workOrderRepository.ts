import { eq, desc, sql, like } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const workOrderRepository = {
  async generateOrderNo(): Promise<string> {
    const db = getDb();
    const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const prefix = `WO-${todayStr}-`;

    const lastOrder = await db
      .select({ no: schema.workOrders.no })
      .from(schema.workOrders)
      .where(like(schema.workOrders.no, `${prefix}%`))
      .orderBy(desc(schema.workOrders.id))
      .limit(1);

    if (lastOrder.length === 0) {
      return `${prefix}001`;
    }

    const lastNo = lastOrder[0].no;
    const parts = lastNo.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `${prefix}${seq.toString().padStart(3, '0')}`;
  },

  async createWorkOrder(data: {
    no: string;
    arac_id: number;
    user_id: number;
    toplam_kurus: number;
    indirim_kurus: number;
    items: Array<{
      hizmet_id: number;
      birim_fiyat_kurus: number;
      miktar: number;
      staff_id?: number | null;
    }>;
  }) {
    const db = getDb();
    const sqlite = db.$client; // better-sqlite3 instance

    // Atomik SQLite transaction: İş emri + Detay satırları
    return sqlite.transaction(() => {
      const orderRes = db.insert(schema.workOrders).values({
        no: data.no,
        arac_id: data.arac_id,
        durum: 'pending',
        user_id: data.user_id,
        toplam_kurus: data.toplam_kurus,
        indirim_kurus: data.indirim_kurus,
      }).returning().get();

      for (const item of data.items) {
        db.insert(schema.workOrderItems).values({
          work_order_id: orderRes.id,
          hizmet_id: item.hizmet_id,
          birim_fiyat_kurus: item.birim_fiyat_kurus,
          miktar: item.miktar,
          staff_id: item.staff_id || null,
        }).run();
      }

      return orderRes;
    })();
  },

  async getWorkOrderById(id: number) {
    const db = getDb();
    const orderRows = await db
      .select({
        order: schema.workOrders,
        vehicle: schema.vehicles,
        vehicleType: schema.vehicleTypes,
        customer: schema.customers,
        user: schema.users,
      })
      .from(schema.workOrders)
      .innerJoin(schema.vehicles, eq(schema.workOrders.arac_id, schema.vehicles.id))
      .innerJoin(schema.vehicleTypes, eq(schema.vehicles.vehicle_type_id, schema.vehicleTypes.id))
      .leftJoin(schema.customers, eq(schema.vehicles.customer_id, schema.customers.id))
      .innerJoin(schema.users, eq(schema.workOrders.user_id, schema.users.id))
      .where(eq(schema.workOrders.id, id));

    if (orderRows.length === 0) return null;

    const base = orderRows[0];

    const items = await db
      .select({
        item: schema.workOrderItems,
        service: schema.services,
        staff: schema.staff,
      })
      .from(schema.workOrderItems)
      .innerJoin(schema.services, eq(schema.workOrderItems.hizmet_id, schema.services.id))
      .leftJoin(schema.staff, eq(schema.workOrderItems.staff_id, schema.staff.id))
      .where(eq(schema.workOrderItems.work_order_id, id));

    const payments = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.work_order_id, id));

    return {
      ...base.order,
      vehicle: base.vehicle,
      vehicleType: base.vehicleType,
      customer: base.customer,
      creator: base.user.kullanici_adi,
      items: items.map((i) => ({
        ...i.item,
        serviceName: i.service.ad,
        staffName: i.staff ? i.staff.ad : null,
      })),
      payments,
    };
  },

  async getTodayWorkOrders() {
    const db = getDb();
    const todayStr = new Date().toISOString().substring(0, 10);

    const rows = await db
      .select({
        id: schema.workOrders.id,
        no: schema.workOrders.no,
        durum: schema.workOrders.durum,
        toplam_kurus: schema.workOrders.toplam_kurus,
        indirim_kurus: schema.workOrders.indirim_kurus,
        giris_zamani: schema.workOrders.giris_zamani,
        teslim_zamani: schema.workOrders.teslim_zamani,
        stok_dusuldu_at: schema.workOrders.stok_dusuldu_at,
        plaka: schema.vehicles.plaka,
        vehicleTypeName: schema.vehicleTypes.ad,
        customerName: schema.customers.ad,
      })
      .from(schema.workOrders)
      .innerJoin(schema.vehicles, eq(schema.workOrders.arac_id, schema.vehicles.id))
      .innerJoin(schema.vehicleTypes, eq(schema.vehicles.vehicle_type_id, schema.vehicleTypes.id))
      .leftJoin(schema.customers, eq(schema.vehicles.customer_id, schema.customers.id))
      .where(like(schema.workOrders.giris_zamani, `${todayStr}%`))
      .orderBy(desc(schema.workOrders.id));

    return rows;
  },

  async updateStatus(id: number, status: 'pending' | 'washing' | 'completed' | 'delivered' | 'cancelled', cancelReason?: string | null) {
    const db = getDb();
    const updateData: any = {
      durum: status,
    };
    if (status === 'completed' || status === 'delivered') {
      updateData.teslim_zamani = sql`CURRENT_TIMESTAMP`;
    }
    if (status === 'cancelled' && cancelReason) {
      updateData.iptal_gerekcesi = cancelReason;
    }

    await db.update(schema.workOrders)
      .set(updateData)
      .where(eq(schema.workOrders.id, id));
  },

  async getWorkOrdersByDateRange(startDate: string, endDate: string) {
    const db = getDb();
    return db
      .select({
        id: schema.workOrders.id,
        no: schema.workOrders.no,
        durum: schema.workOrders.durum,
        toplam_kurus: schema.workOrders.toplam_kurus,
        indirim_kurus: schema.workOrders.indirim_kurus,
        giris_zamani: schema.workOrders.giris_zamani,
        teslim_zamani: schema.workOrders.teslim_zamani,
      })
      .from(schema.workOrders)
      .where(sql`${schema.workOrders.giris_zamani} >= ${startDate} AND ${schema.workOrders.giris_zamani} <= ${endDate}`)
      .orderBy(desc(schema.workOrders.id));
  },

  async getWorkOrderItemsByDateRange(startDate: string, endDate: string) {
    const db = getDb();
    return db
      .select({
        id: schema.workOrderItems.id,
        work_order_id: schema.workOrderItems.work_order_id,
        hizmet_id: schema.workOrderItems.hizmet_id,
        birim_fiyat_kurus: schema.workOrderItems.birim_fiyat_kurus,
        miktar: schema.workOrderItems.miktar,
        staff_id: schema.workOrderItems.staff_id,
        serviceName: schema.services.ad,
        orderStatus: schema.workOrders.durum,
        orderDate: schema.workOrders.giris_zamani,
      })
      .from(schema.workOrderItems)
      .innerJoin(schema.workOrders, eq(schema.workOrderItems.work_order_id, schema.workOrders.id))
      .innerJoin(schema.services, eq(schema.workOrderItems.hizmet_id, schema.services.id))
      .where(sql`${schema.workOrders.giris_zamani} >= ${startDate} AND ${schema.workOrders.giris_zamani} <= ${endDate}`)
      .orderBy(desc(schema.workOrderItems.id));
  },
};
