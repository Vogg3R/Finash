import { describe, it, expect } from 'vitest';
import { normalizePlate } from '../electron/utils/plateNormalizer';

describe('Gün 2: P4 & A7 Plaka Normalizasyonu ve Karakter Eşleme Testleri', () => {
  it('1. Boşluk ve tireler temizlenmeli ve büyük harfe çevrilmelidir', () => {
    const res1 = normalizePlate('34 abc 123');
    expect(res1.isValid).toBe(true);
    expect(res1.normalizedPlate).toBe('34ABC123');

    const res2 = normalizePlate('06-ANK-06');
    expect(res2.isValid).toBe(true);
    expect(res2.normalizedPlate).toBe('06ANK06');
  });

  it('2. i, ı ve İ harflerinin tamamı Latin "I" harfine çevrilmelidir (P4)', () => {
    // Küçük 'ı' -> Latin 'I'
    const res1 = normalizePlate('06 ılk 41');
    expect(res1.isValid).toBe(true);
    expect(res1.normalizedPlate).toBe('06ILK41');

    // Küçük 'i' -> Latin 'I'
    const res2 = normalizePlate('34 ist 34');
    expect(res2.isValid).toBe(true);
    expect(res2.normalizedPlate).toBe('34IST34');

    // Büyük 'İ' -> Latin 'I'
    const res3 = normalizePlate('34 İST 34');
    expect(res3.isValid).toBe(true);
    expect(res3.normalizedPlate).toBe('34IST34');

    // Büyük 'I' -> Latin 'I'
    const res4 = normalizePlate('34 IST 34');
    expect(res4.isValid).toBe(true);
    expect(res4.normalizedPlate).toBe('34IST34');
  });

  it('3. Ç, Ş, Ğ, Ö, Ü içeren girişler kesin olarak reddedilmelidir (P4)', () => {
    const testCases = ['34 ÇÇ 34', '06 ŞEN 06', '35 DAĞ 35', '16 GÖL 16', '07 GÜL 07'];

    for (const testCase of testCases) {
      const res = normalizePlate(testCase);
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Geçersiz plaka');
    }
  });

  it('4. Boş, çok kısa veya geçersiz semboller içeren girişler reddedilmelidir', () => {
    expect(normalizePlate('').isValid).toBe(false);
    expect(normalizePlate('   ').isValid).toBe(false);
    expect(normalizePlate('12').isValid).toBe(false); // Çok kısa
    expect(normalizePlate('34@ABC').isValid).toBe(false); // @ sembolü
  });
});
