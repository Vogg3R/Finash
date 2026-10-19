import ExcelJS from 'exceljs';
import { summaryService } from './summaryService';

export const excelExportService = {
  async generateReportExcel(period: 'daily' | 'weekly' | 'monthly'): Promise<Buffer> {
    const reportData = await summaryService.getReports(period);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WashTrack Oto Kuaför';
    workbook.created = new Date();

    // Sayfa 1: Trend ve Finansal Özet
    const trendSheet = workbook.addWorksheet('Dönem Trendi & Finans');
    trendSheet.columns = [
      { header: 'Dönem / Tarih', key: 'label', width: 20 },
      { header: 'Yıkanan Araç', key: 'vehicleCount', width: 16 },
      { header: 'Net Ciro (₺)', key: 'revenue', width: 18 },
      { header: 'Gider (₺)', key: 'expense', width: 18 },
      { header: 'Net Kâr (₺)', key: 'netProfit', width: 18 },
    ];

    // Başlık stilleri
    trendSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    trendSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };

    for (const row of reportData.trend) {
      trendSheet.addRow({
        label: row.label,
        vehicleCount: row.vehicleCount,
        revenue: row.revenue,
        expense: row.expense,
        netProfit: row.netProfit,
      });
    }

    // Sayfa 2: Hizmet Satışları
    const serviceSheet = workbook.addWorksheet('Hizmet Satış Dağılımı');
    serviceSheet.columns = [
      { header: 'Hizmet Adı', key: 'serviceName', width: 30 },
      { header: 'Satış Adedi', key: 'count', width: 16 },
      { header: 'Toplam Ciro (₺)', key: 'revenueTL', width: 20 },
    ];

    serviceSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    serviceSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' },
    };

    for (const s of reportData.serviceBreakdown) {
      serviceSheet.addRow({
        serviceName: s.serviceName,
        count: s.count,
        revenueTL: Number((s.totalRevenueKurus / 100).toFixed(2)),
      });
    }

    // Sayfa 3: Personel Primleri
    const staffSheet = workbook.addWorksheet('Personel Hak Edilen Primler');
    staffSheet.columns = [
      { header: 'Personel Adı', key: 'name', width: 25 },
      { header: 'Sözleşmeli Prim (%)', key: 'primOrani', width: 20 },
      { header: 'Tamamlanan İş', key: 'jobCount', width: 18 },
      { header: 'Üretilen Ciro (₺)', key: 'totalRevenueTL', width: 20 },
      { header: 'Hak Edilen Prim (₺)', key: 'commissionTL', width: 22 },
    ];

    staffSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    staffSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    for (const st of reportData.staffPerformance) {
      staffSheet.addRow({
        name: st.name,
        primOrani: `%${st.primOrani}`,
        jobCount: st.jobCount,
        totalRevenueTL: Number((st.totalRevenueKurus / 100).toFixed(2)),
        commissionTL: Number((st.commissionKurus / 100).toFixed(2)),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};
