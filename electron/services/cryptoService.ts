let electronSafeStorage: any = null;
try {
  const electron = require('electron');
  electronSafeStorage = electron.safeStorage;
} catch {
  // Headless test ortamı
}

export const cryptoService = {
  isAvailable(): boolean {
    try {
      return !!electronSafeStorage && typeof electronSafeStorage.isEncryptionAvailable === 'function' && electronSafeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  },

  encrypt(plainText: string): string {
    if (!plainText) return '';
    try {
      if (this.isAvailable()) {
        const buffer = electronSafeStorage.encryptString(plainText);
        return `dpapi:${buffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('safeStorage encrypt başarısız, fallback kullanılıyor:', e);
    }
    // Fallback for tests/node environment
    return `b64:${Buffer.from(plainText, 'utf-8').toString('base64')}`;
  },

  decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      if (cipherText.startsWith('dpapi:') && this.isAvailable()) {
        const base64Data = cipherText.substring(6);
        const buffer = Buffer.from(base64Data, 'base64');
        return electronSafeStorage.decryptString(buffer);
      }
    } catch (e) {
      console.warn('safeStorage decrypt başarısız:', e);
    }

    if (cipherText.startsWith('b64:')) {
      return Buffer.from(cipherText.substring(4), 'base64').toString('utf-8');
    }

    return cipherText;
  },
};
