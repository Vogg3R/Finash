import { customerRepository } from '../repositories/customerRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const customerService = {
  getAllCustomers() {
    return customerRepository.getAllCustomers();
  },

  searchCustomers(query: string) {
    if (!query || query.trim().length === 0) {
      return customerRepository.getAllCustomers();
    }
    return customerRepository.searchCustomers(query.trim());
  },

  getCustomerById(id: number) {
    return customerRepository.findById(id);
  },

  async createCustomer(userId: number, data: { ad: string; telefon?: string; notlar?: string }) {
    if (!data.ad || data.ad.trim().length === 0) {
      throw new Error('Müşteri adı zorunludur.');
    }
    const created = await customerRepository.createCustomer({
      ad: data.ad.trim(),
      telefon: data.telefon?.trim(),
      notlar: data.notlar?.trim(),
    });

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'MUSTERI_EKLENDI',
      tablo: 'customers',
      kayit_id: created.id,
      yeni_deger: JSON.stringify(created),
    });

    return created;
  },

  async updateCustomer(userId: number, id: number, data: { ad?: string; telefon?: string; notlar?: string }) {
    const existing = await customerRepository.findById(id);
    if (!existing) throw new Error('Müşteri bulunamadı.');

    const updated = await customerRepository.updateCustomer(id, data);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'MUSTERI_GUNCELLENDI',
      tablo: 'customers',
      kayit_id: id,
      eski_deger: JSON.stringify(existing),
      yeni_deger: JSON.stringify(updated),
    });

    return updated;
  },
};
