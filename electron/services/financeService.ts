import { transactionRepository, TransactionFilters } from '../repositories/transactionRepository';
import { cashSessionRepository } from '../repositories/cashSessionRepository';
import { categoryRepository } from '../repositories/categoryRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const financeService = {
  async getCategories(tur?: 'income' | 'expense') {
    return categoryRepository.getAllCategories(tur);
  },

  async createCategory(data: { ad: string; tur: 'income' | 'expense' }) {
    if (!data.ad || !data.ad.trim()) {
      throw new Error('Kategori adı zorunludur.');
    }
    return categoryRepository.createCategory({
      ad: data.ad.trim(),
      tur: data.tur,
    });
  },

  async getTransactions(filters?: TransactionFilters) {
    return transactionRepository.getTransactions(filters);
  },

  async getNetProfitSummary(startDate?: string, endDate?: string) {
    return transactionRepository.getTotals(startDate, endDate);
  },

  async addManualTransaction(
    userId: number,
    data: {
      tur: 'income' | 'expense';
      kategori_id?: number | null;
      tutar_kurus: number;
      yontem: 'cash' | 'card' | 'transfer';
      aciklama?: string | null;
    }
  ) {
    if (!data.tutar_kurus || data.tutar_kurus <= 0) {
      throw new Error('İşlem tutarı 0\'dan büyük pozitif bir değer olmalıdır.');
    }

    let openSession = null;
    if (data.yontem === 'cash') {
      openSession = await cashSessionRepository.getOpenSession();
      if (!openSession) {
        throw new Error('Açık kasa oturumu bulunamadı. Nakit gelir/gider eklemek için önce kasa açılışı yapılmalıdır.');
      }
    }

    const tx = await transactionRepository.createTransaction({
      tur: data.tur,
      kategori_id: data.kategori_id || null,
      tutar_kurus: Math.round(data.tutar_kurus),
      yontem: data.yontem,
      aciklama: data.aciklama || null,
      kaynak_tur: 'manual',
      cash_session_id: openSession ? openSession.id : null,
    });

    if (data.yontem === 'cash' && openSession) {
      const delta = data.tur === 'income' ? Math.round(data.tutar_kurus) : -Math.round(data.tutar_kurus);
      await cashSessionRepository.updateExpectedCash(openSession.id, delta);
    }

    await auditLogRepository.log({
      user_id: userId,
      eylem: data.tur === 'income' ? 'MANUEL_GELIR' : 'MANUEL_GIDER',
      tablo: 'transactions',
      kayit_id: tx.id,
      yeni_deger: JSON.stringify(tx),
    });

    return tx;
  },

  async closeCashSession(userId: number, sayilanKurus: number) {
    const openSession = await cashSessionRepository.getOpenSession();
    if (!openSession) {
      throw new Error('Açık kasa oturumu bulunamadı.');
    }

    const sayilan = Math.round(sayilanKurus);
    const beklenen = openSession.beklenen_kurus;
    const fark = sayilan - beklenen;

    await cashSessionRepository.closeSession(openSession.id, sayilan, fark);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'KASA_KAPANIS',
      tablo: 'cash_sessions',
      kayit_id: openSession.id,
      eski_deger: JSON.stringify({ beklenen_kurus: beklenen }),
      yeni_deger: JSON.stringify({ sayilan_kurus: sayilan, fark_kurus: fark }),
    });

    return {
      id: openSession.id,
      beklenen_kurus: beklenen,
      sayilan_kurus: sayilan,
      fark_kurus: fark,
      closed_at: new Date().toISOString(),
    };
  },
};
