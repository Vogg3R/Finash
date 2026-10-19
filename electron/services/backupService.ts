import path from 'path';
import fs from 'fs';
import { backupDatabase, getSqlite, closeDatabase, initDatabase } from '../db/index';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const backupService = {
  /**
   * B7 & FR-47: better-sqlite3 .backup() API'si ile WAL moduna uyumlu atomik yedek alır.
   */
  async createBackup(userId: number, customPath?: string): Promise<{ success: boolean; filePath: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }

    const targetPath = customPath || path.join(defaultDir, `washtrack_backup_${timestamp}.db`);

    await backupDatabase(targetPath);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'YEDEK_ALINDI',
      tablo: 'settings',
      yeni_deger: JSON.stringify({ path: targetPath }),
    });

    return { success: true, filePath: targetPath };
  },

  /**
   * B7, FR-48 & AC-12:
   * Geri yükleme (restore) öncesinde mevcut canlı veritabanının otomatik yedeğini alır,
   * ardından hedef yedek dosyasını geri yükler.
   */
  async restoreBackup(userId: number, backupFilePath: string): Promise<{ success: boolean; autoSafetyBackup: string }> {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('Belirtilen yedek dosyası bulunamadı.');
    }

    const activeSqlite = getSqlite();
    const activeDbPath = activeSqlite.name; // Canlı veritabanı dosya yolu

    // 1. Restore öncesi otomatik güvenlik yedeği al (B7 Kuralı)
    const defaultDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    const autoSafetyBackup = path.join(defaultDir, `pre_restore_safety_${Date.now()}.db`);
    await backupDatabase(autoSafetyBackup);

    // 2. Mevcut veritabanı bağlantısını güvenli kapat
    closeDatabase();

    // 3. Dosyayı canlı dosya konumuna kopyala
    fs.copyFileSync(backupFilePath, activeDbPath);

    // Varsa eski -wal ve -shm dosyalarını temizle (yeni veritabanının temiz açılması için)
    if (fs.existsSync(`${activeDbPath}-wal`)) fs.unlinkSync(`${activeDbPath}-wal`);
    if (fs.existsSync(`${activeDbPath}-shm`)) fs.unlinkSync(`${activeDbPath}-shm`);

    // 4. Veritabanını yeniden başlat ve kontrol et
    const reloaded = initDatabase({ dbPath: activeDbPath });
    const check = reloaded.sqlite.pragma('quick_check') as any;
    if (check && check[0] && check[0].quick_check !== 'ok') {
      throw new Error('Geri yüklenen veritabanı bütünlük testini geçemedi.');
    }

    // 5. Audit log'a kaydet (B4 Kuralı)
    await auditLogRepository.log({
      user_id: userId,
      eylem: 'GERI_YUKLEME',
      tablo: 'settings',
      yeni_deger: JSON.stringify({
        restoredFrom: backupFilePath,
        safetyBackup: autoSafetyBackup,
      }),
    });

    return { success: true, autoSafetyBackup };
  },
};
