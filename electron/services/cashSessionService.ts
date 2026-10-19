import { cashSessionRepository } from '../repositories/cashSessionRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const cashSessionService = {
  async getOpenSession() {
    return cashSessionRepository.getOpenSession();
  },

  async openSession(userId: number, acilisKurus: number) {
    const existing = await cashSessionRepository.getOpenSession();
    if (existing) {
      throw new Error('Zaten açık bir kasa oturumu bulunmaktadır.');
    }

    if (acilisKurus < 0) {
      throw new Error('Açılış kasa tutarı negatif olamaz.');
    }

    const session = await cashSessionRepository.openSession(Math.round(acilisKurus));

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'KASA_ACILIS',
      tablo: 'cash_sessions',
      kayit_id: session.id,
      yeni_deger: JSON.stringify({ acilis_kurus: session.acilis_kurus }),
    });

    return session;
  },
};
