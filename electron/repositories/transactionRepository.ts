import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  tur?: 'income' | 'expense' | 'refund';
  kategori_id?: number;
  yontem?: 'cash' | 'card' | 'transfer';
}

export const transactionRepository = {
  async createTransaction(data: {
    tur: 'income' | 'expense' | 'refund';
    kategori_id?: number | null;
    tutar_kurus: number; // Her zaman pozitif tam sayı (A1 kuralı)
    yontem: 'cash' | 'card' | 'transfer';
    aciklama?: string | null;
    kaynak_tur: 'payment' | 'purchase' | 'manual';
    kaynak_id?: number | null;
    cash_session_id?: number | null;
  }) {
    const db = getDb();
    const res = await db.insert(schema.transactions).values({
      tur: data.tur,
      kategori_id: data.kategori_id || null,
      tutar_kurus: Math.abs(data.tutar_kurus),
      yontem: data.yontem,
      aciklama: data.aciklama || null,
      kaynak_tur: data.kaynak_tur,
      kaynak_id: data.kaynak_id || null,
      cash_session_id: data.cash_session_id || null,
    }).returning();
    return res[0];
  },

  async getTransactionsByPaymentId(paymentId: number) {
    const db = getDb();
    return db
      .select()
      .from(schema.transactions)
      .where(and(
        eq(schema.transactions.kaynak_tur, 'payment'),
        eq(schema.transactions.kaynak_id, paymentId)
      ));
  },

  async getTransactions(filters?: TransactionFilters) {
    const db = getDb();
    const conditions = [];

    if (filters?.startDate) {
      conditions.push(gte(schema.transactions.tarih, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(schema.transactions.tarih, filters.endDate));
    }
    if (filters?.tur) {
      conditions.push(eq(schema.transactions.tur, filters.tur));
    }
    if (filters?.kategori_id) {
      conditions.push(eq(schema.transactions.kategori_id, filters.kategori_id));
    }
    if (filters?.yontem) {
      conditions.push(eq(schema.transactions.yontem, filters.yontem));
    }

    const query = db
      .select({
        id: schema.transactions.id,
        tur: schema.transactions.tur,
        kategori_id: schema.transactions.kategori_id,
        kategori_ad: schema.categories.ad,
        tutar_kurus: schema.transactions.tutar_kurus,
        yontem: schema.transactions.yontem,
        tarih: schema.transactions.tarih,
        aciklama: schema.transactions.aciklama,
        kaynak_tur: schema.transactions.kaynak_tur,
        kaynak_id: schema.transactions.kaynak_id,
        cash_session_id: schema.transactions.cash_session_id,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.transactions.kategori_id, schema.categories.id));

    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(schema.transactions.tarih));
    }

    return query.orderBy(desc(schema.transactions.tarih));
  },

  async getTotals(startDate?: string, endDate?: string) {
    const db = getDb();
    const conditions = [];

    if (startDate) {
      conditions.push(gte(schema.transactions.tarih, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.transactions.tarih, endDate));
    }

    const rows = conditions.length > 0
      ? await db.select().from(schema.transactions).where(and(...conditions))
      : await db.select().from(schema.transactions);

    let totalIncome = 0;
    let totalRefund = 0;
    let totalExpense = 0;

    let cashIncome = 0;
    let cardIncome = 0;
    let transferIncome = 0;

    for (const r of rows) {
      const kurus = r.tutar_kurus;
      if (r.tur === 'income') {
        totalIncome += kurus;
        if (r.yontem === 'cash') cashIncome += kurus;
        else if (r.yontem === 'card') cardIncome += kurus;
        else if (r.yontem === 'transfer') transferIncome += kurus;
      } else if (r.tur === 'refund') {
        totalRefund += kurus;
      } else if (r.tur === 'expense') {
        totalExpense += kurus;
      }
    }

    const netRevenue = totalIncome - totalRefund;
    const netProfit = netRevenue - totalExpense;

    return {
      totalIncome,
      totalRefund,
      totalExpense,
      netRevenue,
      netProfit,
      byMethod: {
        cash: cashIncome,
        card: cardIncome,
        transfer: transferIncome,
      },
    };
  },
};
