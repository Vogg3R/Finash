/**
 * P4 Kuralı: Plaka Normalizasyonu
 * Boşluk ve tireler silinir;
 * i, ı ve İ harflerinin tamamı Latin 'I' harfine çevrilir;
 * Harfler A-Z büyük harfe çevrilir;
 * Ç, Ş, Ğ, Ö, Ü içeren girişler geçersiz plaka uyarısı/hatası verir.
 * Dönüşüm açık bir karakter eşleme tablosuyla yapılır, toUpperCase() veya toLocaleUpperCase() kullanılmaz.
 */

const CHAR_MAP: Record<string, string> = {
  // Küçük harfler -> Büyük Latin harf
  a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F', g: 'G', h: 'H',
  j: 'J', k: 'K', l: 'L', m: 'M', n: 'N', o: 'O', p: 'P', r: 'R',
  s: 'S', t: 'T', u: 'U', v: 'V', y: 'Y', z: 'Z', q: 'Q', w: 'W', x: 'X',

  // i, ı, İ -> Latin 'I'
  'i': 'I',
  'ı': 'I',
  'İ': 'I',
  'I': 'I',

  // Büyük harfler
  A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H',
  J: 'J', K: 'K', L: 'L', M: 'M', N: 'N', O: 'O', P: 'P', R: 'R',
  S: 'S', T: 'T', U: 'U', V: 'V', Y: 'Y', Z: 'Z', Q: 'Q', W: 'W', X: 'X',

  // Rakamlar
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
};

const INVALID_TURKISH_CHARS = new Set(['ç', 'Ç', 'ş', 'Ş', 'ğ', 'Ğ', 'ö', 'Ö', 'ü', 'Ü']);

export interface PlateNormalizeResult {
  isValid: boolean;
  normalizedPlate?: string;
  error?: string;
}

export function normalizePlate(input: string): PlateNormalizeResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Plaka boş olamaz.' };
  }

  // Boşluk ve tireleri yoksay
  const cleaned = input.replace(/[\s\-]/g, '');

  if (cleaned.length === 0) {
    return { isValid: false, error: 'Geçersiz plaka formatı.' };
  }

  let result = '';

  for (const char of cleaned) {
    // Ç, Ş, Ğ, Ö, Ü kontrolü
    if (INVALID_TURKISH_CHARS.has(char)) {
      return {
        isValid: false,
        error: `Geçersiz plaka: Türk plakalarında '${char.toUpperCase()}' harfi bulunamaz.`,
      };
    }

    const mapped = CHAR_MAP[char];
    if (mapped) {
      result += mapped;
    } else {
      return {
        isValid: false,
        error: `Geçersiz karakter: '${char}'`,
      };
    }
  }

  // Minimum plaka uzunluğu kontrolü (ör. 06A123 en az 5-6 karakter)
  if (result.length < 4 || result.length > 12) {
    return {
      isValid: false,
      error: 'Plaka uzunluğu 4 ile 12 karakter arasında olmalıdır.',
    };
  }

  return { isValid: true, normalizedPlate: result };
}
