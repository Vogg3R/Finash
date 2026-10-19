import { eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const paymentRepository = {
  async getPaymentsByWorkOrderId(workOrderId: number) {
    const db = getDb();
    return db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.work_order_id, workOrderId));
  },

  async createPayment(data: {
    work_order_id: number;
    tutar_kurus: number;
    yontem: 'cash' | 'card' | 'transfer';
  }) {
    const db = getDb();
    const res = await db.insert(schema.payments).values(data).returning();
    return res[0];
  },
};
