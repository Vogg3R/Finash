import { settingsRepository } from '../repositories/settingsRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const settingsService = {
  getSettings() {
    return settingsRepository.getAllSettings();
  },

  async updateBusinessSettings(userId: number, data: {
    isletme_adi: string;
    isletme_adresi: string;
    isletme_telefon: string;
    indirim_ust_limit?: string;
  }) {
    const oldSettings = await settingsRepository.getAllSettings();
    await settingsRepository.setMultipleSettings({
      isletme_adi: data.isletme_adi,
      isletme_adresi: data.isletme_adresi,
      isletme_telefon: data.isletme_telefon,
      ...(data.indirim_ust_limit ? { indirim_ust_limit: data.indirim_ust_limit } : {}),
    });

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'ISLETME_AYARLARI_GUNCELLENDI',
      tablo: 'settings',
      eski_deger: JSON.stringify(oldSettings),
      yeni_deger: JSON.stringify(data),
    });

    return settingsRepository.getAllSettings();
  },
};
