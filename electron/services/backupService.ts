import path from 'path';
import fs from 'fs';
import { backupDatabase, getSqlite, closeDatabase, initDatabase } from '../db/index';
import { auditLogRepository } from '../repositories/auditLogRepository';

const AUTO_BACKUP_PREFIX = 'washtrack_auto_';
const AUTO_BACKUP_KEEP = 30; // FR-47: son 30 otomatik yedek saklanır

/** Yerel saate göre YYYY-MM-DD (dosya adlarında gün karşılaştırması için) */
function localDateStamp(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTimeStamp(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  // Milisaniye dahil: aynı saniyede alınan iki yedek birbirinin üzerine yazılmasın
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${localDateStamp(d)}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${ms}`;
}

export const backupService = {
  /**
   * Yedek klasörü canlı veritabanının yanındadır (kurulu sürümde AppData\WashTrack\backups).
   * process.cwd() kurulu uygulamada Program Files olabileceği için kullanılmaz.
   */
  getBackupDir(): string {
    const dbPath = getSqlite().name;
    const baseDir = dbPath && dbPath !== ':memory:' ? path.dirname(dbPath) : process.cwd();
    const dir = path.join(baseDir, 'backups');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  },

  /**
   * B7 & FR-47: better-sqlite3 .backup() API'si ile WAL moduna uyumlu atomik yedek alır.
   */
  async createBackup(userId: number, customPath?: string): Promise<{ success: boolean; filePath: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetPath = customPath || path.join(this.getBackupDir(), `washtrack_backup_${timestamp}.db`);

    await backupDatabase(targetPath);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'YEDEK_ALINDI',
      tablo: 'settings',
      yeni_deger: JSON.stringify({ path: targetPath }),
    });

    return { success: true, filePath: targetPath };
  },

  /** Otomatik yedekleri eskiden yeniye sıralı döndürür (dosya adı zaman damgası içerdiği için ada göre sıralanır). */
  listAutoBackups(): string[] {
    const dir = this.getBackupDir();
    return fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(AUTO_BACKUP_PREFIX) && f.endsWith('.db'))
      .sort()
      .map((f) => path.join(dir, f));
  },

  /**
   * FR-47: Otomatik yedek alır ve en yeni 30 otomatik yedek dışındakileri siler.
   * Manuel yedeklere ve restore güvenlik yedeklerine dokunulmaz.
   */
  async createAutoBackup(reason: 'daily' | 'cash_close', userId: number | null = null): Promise<string> {
    const targetPath = path.join(this.getBackupDir(), `${AUTO_BACKUP_PREFIX}${localTimeStamp()}.db`);
    await backupDatabase(targetPath);

    const removed = this.pruneAutoBackups();

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'OTOMATIK_YEDEK_ALINDI',
      tablo: 'settings',
      yeni_deger: JSON.stringify({ path: targetPath, reason, removedCount: removed.length }),
    });

    return targetPath;
  },

  pruneAutoBackups(keep: number = AUTO_BACKUP_KEEP): string[] {
    const all = this.listAutoBackups();
    const toRemove = all.slice(0, Math.max(0, all.length - keep));
    for (const file of toRemove) {
      fs.unlinkSync(file);
    }
    return toRemove;
  },

  /**
   * Bugün için otomatik yedek yoksa alır. Kasa kapatılmadan gün biterse de günlük yedek garanti olsun diye
   * uygulama açılışında ve açık kaldığı sürece periyodik olarak çağrılır.
   */
  async ensureDailyBackup(): Promise<string | null> {
    const todayPrefix = `${AUTO_BACKUP_PREFIX}${localDateStamp()}`;
    const hasToday = this.listAutoBackups().some((f) => path.basename(f).startsWith(todayPrefix));
    if (hasToday) return null;
    return this.createAutoBackup('daily');
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
    const autoSafetyBackup = path.join(this.getBackupDir(), `pre_restore_safety_${Date.now()}.db`);
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
