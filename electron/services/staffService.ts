import { staffRepository } from '../repositories/staffRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const staffService = {
  getAllStaff() {
    return staffRepository.getAllStaff();
  },

  getActiveStaff() {
    return staffRepository.getActiveStaff();
  },

  async createStaff(userId: number, data: { ad: string; telefon?: string; prim_orani?: number }) {
    if (!data.ad || data.ad.trim().length === 0) {
      throw new Error('Personel adı zorunludur.');
    }
    const created = await staffRepository.createStaff({
      ad: data.ad.trim(),
      telefon: data.telefon?.trim(),
      prim_orani: data.prim_orani ?? 0,
    });

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'PERSONEL_EKLENDI',
      tablo: 'staff',
      kayit_id: created.id,
      yeni_deger: JSON.stringify(created),
    });

    return created;
  },

  async updateStaff(userId: number, id: number, data: { ad?: string; telefon?: string; prim_orani?: number; aktif?: boolean }) {
    const existing = await staffRepository.findById(id);
    if (!existing) throw new Error('Personel bulunamadı.');

    const updated = await staffRepository.updateStaff(id, data);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'PERSONEL_GUNCELLENDI',
      tablo: 'staff',
      kayit_id: id,
      eski_deger: JSON.stringify(existing),
      yeni_deger: JSON.stringify(updated),
    });

    return updated;
  },
};
