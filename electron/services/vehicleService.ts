import { vehicleRepository } from '../repositories/vehicleRepository';
import { normalizePlate } from '../utils/plateNormalizer';

export const vehicleService = {
  getVehicleTypes() {
    return vehicleRepository.getAllVehicleTypes();
  },

  /**
   * P4 & A7 Kuralı: Plaka arama normalize edilmiş plaka üzerinden yapılır.
   */
  async searchPlate(rawInput: string) {
    const norm = normalizePlate(rawInput);
    if (!norm.isValid || !norm.normalizedPlate) {
      return {
        isValid: false,
        error: norm.error,
        exactMatch: null,
        suggestions: [],
      };
    }

    const exactMatch = await vehicleRepository.findByNormalizedPlate(norm.normalizedPlate);
    const suggestions = await vehicleRepository.searchByNormalizedPlatePrefix(norm.normalizedPlate.substring(0, 4));

    return {
      isValid: true,
      normalizedPlate: norm.normalizedPlate,
      exactMatch,
      suggestions: suggestions.filter((s) => s.vehicle.plaka_normalized !== norm.normalizedPlate),
    };
  },

  async registerVehicle(data: {
    rawPlate: string;
    marka?: string;
    model?: string;
    renk?: string;
    vehicle_type_id: number;
    customer_id?: number | null;
  }) {
    const norm = normalizePlate(data.rawPlate);
    if (!norm.isValid || !norm.normalizedPlate) {
      throw new Error(norm.error || 'Geçersiz plaka formatı.');
    }

    const existing = await vehicleRepository.findByNormalizedPlate(norm.normalizedPlate);
    if (existing) {
      // Araç zaten kayıtlı, bilgilerini güncelle
      await vehicleRepository.updateVehicle(existing.vehicle.id, {
        marka: data.marka,
        model: data.model,
        renk: data.renk,
        vehicle_type_id: data.vehicle_type_id,
        customer_id: data.customer_id,
      });
      return vehicleRepository.findByNormalizedPlate(norm.normalizedPlate);
    }

    const created = await vehicleRepository.createVehicle({
      plaka: data.rawPlate.trim().toUpperCase(),
      plaka_normalized: norm.normalizedPlate,
      marka: data.marka,
      model: data.model,
      renk: data.renk,
      vehicle_type_id: data.vehicle_type_id,
      customer_id: data.customer_id,
    });

    return vehicleRepository.findByNormalizedPlate(norm.normalizedPlate);
  },
};
