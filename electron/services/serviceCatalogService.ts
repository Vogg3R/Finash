import { serviceRepository } from '../repositories/serviceRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const serviceCatalogService = {
  getAllServices(includeInactive = false) {
    return serviceRepository.getAllServices(includeInactive);
  },

  async createService(userId: number, data: { ad: string; aciklama?: string; sure_dk?: number }) {
    if (!data.ad || data.ad.trim().length === 0) {
      throw new Error('Hizmet adı zorunludur.');
    }
    const created = await serviceRepository.createService({
      ad: data.ad.trim(),
      aciklama: data.aciklama?.trim(),
      sure_dk: data.sure_dk ?? 30,
    });

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'HIZMET_EKLENDI',
      tablo: 'services',
      kayit_id: created.id,
      yeni_deger: JSON.stringify(created),
    });

    return created;
  },

  async updateService(userId: number, id: number, data: { ad?: string; aciklama?: string; sure_dk?: number; aktif?: boolean }) {
    const existing = await serviceRepository.findServiceById(id);
    if (!existing) throw new Error('Hizmet bulunamadı.');

    const updated = await serviceRepository.updateService(id, data);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'HIZMET_GUNCELLENDI',
      tablo: 'services',
      kayit_id: id,
      eski_deger: JSON.stringify(existing),
      yeni_deger: JSON.stringify(updated),
    });

    return updated;
  },

  getPriceMatrix() {
    return serviceRepository.getPriceMatrix();
  },

  /**
   * B4 Kuralı: Fiyat değişikliği audit_log'a yazılmak zorundadır.
   */
  async updatePrice(userId: number, serviceId: number, vehicleTypeId: number, priceKurus: number) {
    if (priceKurus < 0) {
      throw new Error('Fiyat negatif olamaz.');
    }

    const oldPrice = await serviceRepository.getPrice(serviceId, vehicleTypeId);
    await serviceRepository.setPrice(serviceId, vehicleTypeId, priceKurus);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'FIYAT_DEGISTIRILDI',
      tablo: 'service_prices',
      eski_deger: oldPrice !== null ? `${oldPrice} kuruş` : 'Tanımsız',
      yeni_deger: `${priceKurus} kuruş (Hizmet: ${serviceId}, Araç Tipi: ${vehicleTypeId})`,
    });
  },
};
