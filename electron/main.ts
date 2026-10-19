import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase, getSqlite } from './db/index';
import { runMigrations } from './db/migrate';
import { registerIpcHandlers } from './ipc/index';
import { emailService } from './services/emailService';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WashTrack] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Tekil instance kilidi
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[WashTrack] Başka bir uygulama örneği zaten çalışıyor. Çıkılıyor...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'WashTrack - Oto Kuaför Takip',
    width: 1366,
    height: 820,
    minWidth: 1200,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  if (VITE_DEV_SERVER_URL) {
    await win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const distPath = process.env.DIST || path.join(__dirname, '../dist');
    await win.loadFile(path.join(distPath, 'index.html'));
  }
}

// IPC Handlers
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('db:status', () => {
  try {
    const sqlite = getSqlite();
    const journalMode = sqlite.pragma('journal_mode', { simple: true });
    const tableCount = sqlite
      .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'")
      .get() as { count: number };

    return {
      status: 'connected',
      journalMode,
      tableCount: tableCount.count,
    };
  } catch (err: any) {
    return {
      status: 'error',
      message: err.message,
    };
  }
});

app.whenReady().then(async () => {
  if (!gotTheLock) return;
  try {
    console.log('[WashTrack] Veritabanı başlatılıyor...');
    initDatabase();
    await runMigrations();
    registerIpcHandlers();
    console.log('[WashTrack] Veritabanı ve IPC kanalları hazır.');

    // 60 saniyede bir otomatik e-posta kuyruk işleme döngüsü (FR-53, B6)
    setInterval(() => {
      emailService.processQueue().catch(() => {});
    }, 60000);
  } catch (err) {
    console.error('[WashTrack] Veritabanı başlatma hatası:', err);
  }

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
