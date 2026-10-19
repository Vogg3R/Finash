import nodemailer from 'nodemailer';
import { emailOutboxRepository } from '../repositories/emailOutboxRepository';
import { settingsRepository } from '../repositories/settingsRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';
import { summaryService, DailySummary } from './summaryService';
import { cryptoService } from './cryptoService';

export const emailService = {
  async getSmtpConfig() {
    const settings = await settingsRepository.getAllSettings();
    return {
      host: settings.smtp_host || 'smtp.gmail.com',
      port: parseInt(settings.smtp_port || '587', 10),
      secure: settings.smtp_secure === 'true',
      user: settings.smtp_user || '',
      passwordCipher: settings.smtp_password || '',
      recipient: settings.smtp_recipient || settings.patron_email || '',
      isletmeAdi: settings.isletme_adi || 'WashTrack Oto Kuaför',
    };
  },

  async updateSmtpConfig(userId: number, config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password?: string;
    recipient: string;
  }) {
    const updateData: Record<string, string> = {
      smtp_host: config.host.trim(),
      smtp_port: config.port.toString(),
      smtp_secure: config.secure ? 'true' : 'false',
      smtp_user: config.user.trim(),
      smtp_recipient: config.recipient.trim(),
    };

    if (config.password && config.password.trim()) {
      // Google Uygulama Şifreleri 'abcd efgh ijkl mnop' şeklinde 4'lü boşluklu verilir; boşlukları temizleyelim
      const cleanPass = config.password.replace(/\s+/g, '');
      updateData.smtp_password = cryptoService.encrypt(cleanPass);
    }

    await settingsRepository.setMultipleSettings(updateData);

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'SMTP_AYARLARI_GUNCELLENDI',
      tablo: 'settings',
      yeni_deger: JSON.stringify({
        host: config.host,
        port: config.port,
        user: config.user,
        recipient: config.recipient,
      }),
    });
  },

  buildEmailHtml(summary: DailySummary, isletmeAdi: string): string {
    const netRevenueTL = (summary.finance.netRevenue / 100).toFixed(2);
    const netProfitTL = (summary.finance.netProfit / 100).toFixed(2);
    const incomeTL = (summary.finance.totalIncome / 100).toFixed(2);
    const refundTL = (summary.finance.totalRefund / 100).toFixed(2);
    const expenseTL = (summary.finance.totalExpense / 100).toFixed(2);
    const cashTL = (summary.finance.byMethod.cash / 100).toFixed(2);
    const cardTL = (summary.finance.byMethod.card / 100).toFixed(2);
    const transferTL = (summary.finance.byMethod.transfer / 100).toFixed(2);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #1e3a8a, #0284c7); padding: 24px; color: white; text-align: center; }
          .header h1 { margin: 0 0 6px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.9; font-size: 14px; }
          .body { padding: 24px; }
          .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .kpi-box { background: #f1f5f9; padding: 14px; border-radius: 8px; text-align: center; }
          .kpi-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
          .kpi-value { font-size: 20px; font-weight: 800; color: #0f172a; }
          .profit-box { background: #dcfce7; border: 1px solid #86efac; }
          .profit-box .kpi-value { color: #15803d; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 14px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f8fafc; color: #475569; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isletmeAdi}</h1>
            <p>Günlük Ciro ve Faaliyet Raporu • ${summary.date}</p>
          </div>
          <div class="body">
            <div class="kpi-grid">
              <div class="kpi-box">
                <div class="kpi-label">Yıkanan Araç</div>
                <div class="kpi-value">${summary.workOrders.washedVehicles} Adet</div>
              </div>
              <div class="kpi-box">
                <div class="kpi-label">Net Ciro</div>
                <div class="kpi-value">${netRevenueTL} ₺</div>
              </div>
              <div class="kpi-box">
                <div class="kpi-label">Toplam Gider</div>
                <div class="kpi-value" style="color:#dc2626;">${expenseTL} ₺</div>
              </div>
              <div class="kpi-box profit-box">
                <div class="kpi-label">Günlük Net Kâr</div>
                <div class="kpi-value">${netProfitTL} ₺</div>
              </div>
            </div>

            <h3 style="margin-top:20px; margin-bottom:8px; font-size:16px;">Tahsilat Dağılımı</h3>
            <table>
              <tr><td>Nakit Tahsilat</td><td style="text-align:right; font-weight:600;">${cashTL} ₺</td></tr>
              <tr><td>Kredi Kartı / POS</td><td style="text-align:right; font-weight:600;">${cardTL} ₺</td></tr>
              <tr><td>Banka / Havale</td><td style="text-align:right; font-weight:600;">${transferTL} ₺</td></tr>
              <tr><td>Toplam İade</td><td style="text-align:right; font-weight:600; color:#ea580c;">-${refundTL} ₺</td></tr>
            </table>

            <h3 style="margin-top:20px; margin-bottom:8px; font-size:16px;">İş Emri Durumları</h3>
            <table>
              <tr><td>Tamamlanan / Teslim Edilen</td><td style="text-align:right;">${summary.workOrders.washedVehicles}</td></tr>
              <tr><td>İşlem Sırasında / Yıkanıyor</td><td style="text-align:right;">${summary.workOrders.washing}</td></tr>
              <tr><td>Bekleyen İş Emirleri</td><td style="text-align:right;">${summary.workOrders.pending}</td></tr>
              <tr><td>İptal Edilen</td><td style="text-align:right; color:#dc2626;">${summary.workOrders.cancelled}</td></tr>
            </table>

            ${summary.stock.criticalCount > 0 ? `
              <div style="margin-top:16px; padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; color:#991b1b; font-size:13px;">
                <strong>⚠️ Kritik Stok Uyarısı:</strong> ${summary.stock.criticalCount} adet malzemenin stoğu kritik seviyenin altındadır.
              </div>
            ` : ''}
          </div>
          <div class="footer">
            Bu e-posta WashTrack Oto Kuaför Yönetim Sistemi tarafından otomatik oluşturulmuştur.
          </div>
        </div>
      </body>
      </html>
    `;
  },

  async triggerDailyEmail(userId: number, force = false) {
    const todayStr = new Date().toISOString().substring(0, 10);
    const latest = await emailOutboxRepository.getLatestForPeriod('daily', todayStr);

    if (latest && latest.durum === 'sent' && !force) {
      return {
        alreadySent: true,
        message: 'Bugünkü ciro e-postası daha önce başarıyla gönderilmiştir. Tekrar göndermek istiyor musunuz?',
      };
    }

    const enqueued = await emailOutboxRepository.enqueueEmail({
      tur: 'daily',
      donem: todayStr,
      tetikleyen: 'button',
      user_id: userId,
    });

    // Hemen arka planda göndermeyi dene
    this.processQueue().catch((err) => console.error('Kuyruk işleme hatası:', err));

    return {
      success: true,
      alreadySent: false,
      message: 'Ciro e-postası kuyruğa alındı ve gönderim başlatıldı.',
      item: enqueued,
    };
  },

  async sendTestEmail(userId: number, testRecipient?: string) {
    const config = await this.getSmtpConfig();
    const recipient = testRecipient || config.recipient;

    if (!config.user || !config.passwordCipher || !recipient) {
      throw new Error('SMTP ayarları eksik. Lütfen gönderici e-posta, şifre ve alıcı adresini kaydedin.');
    }

    const password = cryptoService.decrypt(config.passwordCipher);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: password,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${config.isletmeAdi}" <${config.user}>`,
      to: recipient,
      subject: `[WashTrack] SMTP Test E-Postası`,
      text: `WashTrack SMTP e-posta bağlantı testi başarılı bir şekilde gerçekleştirildi. Tarih: ${new Date().toLocaleString('tr-TR')}`,
    });

    await auditLogRepository.log({
      user_id: userId,
      eylem: 'SMTP_TEST_POSTASI_GONDERILDI',
      tablo: 'settings',
      yeni_deger: JSON.stringify({ recipient }),
    });

    return { success: true, message: `Test e-postası ${recipient} adresine başarıyla iletildi.` };
  },

  async processQueue() {
    const pendingItems = await emailOutboxRepository.getPendingOrRetryable();
    if (pendingItems.length === 0) return;

    const config = await this.getSmtpConfig();
    if (!config.user || !config.passwordCipher || !config.recipient) {
      console.warn('SMTP yapılandırması eksik olduğu için e-posta gönderilemedi.');
      return;
    }

    const password = cryptoService.decrypt(config.passwordCipher);
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: password,
      },
    });

    for (const item of pendingItems) {
      const locked = await emailOutboxRepository.acquireLock(item.id);
      if (!locked) continue; // Başka işlem kilitlediyse atla (B6)

      try {
        const summary = await summaryService.getDailySummary(item.donem);
        const html = this.buildEmailHtml(summary, config.isletmeAdi);

        await transporter.sendMail({
          from: `"${config.isletmeAdi}" <${config.user}>`,
          to: config.recipient,
          subject: `[WashTrack] Günlük Ciro Raporu • ${item.donem} (${(summary.finance.netProfit / 100).toFixed(2)} ₺ Kâr)`,
          html,
        });

        await emailOutboxRepository.markSent(item.id);

        if (item.user_id) {
          await auditLogRepository.log({
            user_id: item.user_id,
            eylem: 'CIRO_EPOSTASI_GONDERILDI',
            tablo: 'email_outbox',
            kayit_id: item.id,
            yeni_deger: JSON.stringify({ donem: item.donem, to: config.recipient }),
          });
        }
      } catch (err: any) {
        console.error(`E-posta #${item.id} gönderimi başarısız:`, err);
        await emailOutboxRepository.markFailed(item.id, err?.message || 'Bilinmeyen hata');
      }
    }
  },

  getQueueStatus() {
    return emailOutboxRepository.getQueueStatus();
  },
};
