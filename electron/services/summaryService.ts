import { workOrderRepository } from '../repositories/workOrderRepository';
import { transactionRepository } from '../repositories/transactionRepository';
import { productRepository } from '../repositories/productRepository';
import { cashSessionRepository } from '../repositories/cashSessionRepository';
import { staffRepository } from '../repositories/staffRepository';

export interface DailySummary {
  date: string;
  workOrders: {
    total: number;
    pending: number;
    washing: number;
    completed: number;
    delivered: number;
    cancelled: number;
    washedVehicles: number;
  };
  finance: {
    totalIncome: number;
    totalRefund: number;
    totalExpense: number;
    netRevenue: number;
    netProfit: number;
    byMethod: {
      cash: number;
      card: number;
      transfer: number;
    };
    monthNetProfit: number;
  };
  stock: {
    criticalCount: number;
    criticalItems: any[];
  };
  cashSession: {
    id?: number;
    status: 'open' | 'closed';
    acilisKurus?: number;
    beklenenKurus?: number;
  };
}

export interface ReportData {
  period: 'daily' | 'weekly' | 'monthly';
  trend: Array<{
    label: string;
    vehicleCount: number;
    revenue: number; // TL
    expense: number; // TL
    netProfit: number; // TL
  }>;
  serviceBreakdown: Array<{
    serviceId: number;
    serviceName: string;
    count: number;
    totalRevenueKurus: number;
  }>;
  staffPerformance: Array<{
    id: number;
    name: string;
    primOrani: number;
    jobCount: number;
    totalRevenueKurus: number;
    commissionKurus: number;
  }>;
}

export const summaryService = {
  async getDailySummary(dateStr?: string): Promise<DailySummary> {
    const today = dateStr || new Date().toISOString().substring(0, 10);
    const startDate = `${today} 00:00:00`;
    const endDate = `${today} 23:59:59`;

    // 1. İş Emirleri
    const orders = await workOrderRepository.getWorkOrdersByDateRange(startDate, endDate);
    let pending = 0;
    let washing = 0;
    let completed = 0;
    let delivered = 0;
    let cancelled = 0;

    for (const o of orders) {
      if (o.durum === 'pending') pending++;
      else if (o.durum === 'washing') washing++;
      else if (o.durum === 'completed') completed++;
      else if (o.durum === 'delivered') delivered++;
      else if (o.durum === 'cancelled') cancelled++;
    }

    const washedVehicles = completed + delivered;

    // 2. Finans (Bugün)
    const totals = await transactionRepository.getTotals(startDate, endDate);

    // 3. Ayın Net Kârı (Month to Date)
    const monthStart = `${today.substring(0, 7)}-01 00:00:00`;
    const monthTotals = await transactionRepository.getTotals(monthStart, endDate);

    // 4. Kritik Stok
    const criticalItems = await productRepository.getCriticalProducts();

    // 5. Kasa Oturumu
    const openSession = await cashSessionRepository.getOpenSession();

    return {
      date: today,
      workOrders: {
        total: orders.length,
        pending,
        washing,
        completed,
        delivered,
        cancelled,
        washedVehicles,
      },
      finance: {
        totalIncome: totals.totalIncome,
        totalRefund: totals.totalRefund,
        totalExpense: totals.totalExpense,
        netRevenue: totals.netRevenue,
        netProfit: totals.netProfit,
        byMethod: totals.byMethod,
        monthNetProfit: monthTotals.netProfit,
      },
      stock: {
        criticalCount: criticalItems.length,
        criticalItems,
      },
      cashSession: openSession
        ? {
            id: openSession.id,
            status: 'open',
            acilisKurus: openSession.acilis_kurus,
            beklenenKurus: openSession.beklenen_kurus,
          }
        : {
            status: 'closed',
          },
    };
  },

  async getReports(period: 'daily' | 'weekly' | 'monthly'): Promise<ReportData> {
    const now = new Date();
    const trend: ReportData['trend'] = [];

    // Trend tarih aralıkları belirleme
    if (period === 'daily') {
      // Son 7 gün
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().substring(0, 10);
        const start = `${dateStr} 00:00:00`;
        const end = `${dateStr} 23:59:59`;

        const orders = await workOrderRepository.getWorkOrdersByDateRange(start, end);
        const vehicleCount = orders.filter((o) => o.durum === 'completed' || o.durum === 'delivered').length;
        const fin = await transactionRepository.getTotals(start, end);

        // Türkçe gün/ay etiketi (örn: 08 Eki)
        const parts = dateStr.split('-');
        const label = `${parts[2]}/${parts[1]}`;

        trend.push({
          label,
          vehicleCount,
          revenue: Math.round(fin.netRevenue / 100),
          expense: Math.round(fin.totalExpense / 100),
          netProfit: Math.round(fin.netProfit / 100),
        });
      }
    } else if (period === 'weekly') {
      // Son 4 hafta
      for (let i = 3; i >= 0; i--) {
        const dEnd = new Date(now);
        dEnd.setDate(dEnd.getDate() - (i * 7));
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 6);

        const startStr = dStart.toISOString().substring(0, 10) + ' 00:00:00';
        const endStr = dEnd.toISOString().substring(0, 10) + ' 23:59:59';

        const orders = await workOrderRepository.getWorkOrdersByDateRange(startStr, endStr);
        const vehicleCount = orders.filter((o) => o.durum === 'completed' || o.durum === 'delivered').length;
        const fin = await transactionRepository.getTotals(startStr, endStr);

        trend.push({
          label: `${4 - i}. Hafta`,
          vehicleCount,
          revenue: Math.round(fin.netRevenue / 100),
          expense: Math.round(fin.totalExpense / 100),
          netProfit: Math.round(fin.netProfit / 100),
        });
      }
    } else {
      // Son 6 ay
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const monthPrefix = `${year}-${month}`;
        const startStr = `${monthPrefix}-01 00:00:00`;
        const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
        const endStr = `${monthPrefix}-${lastDay} 23:59:59`;

        const orders = await workOrderRepository.getWorkOrdersByDateRange(startStr, endStr);
        const vehicleCount = orders.filter((o) => o.durum === 'completed' || o.durum === 'delivered').length;
        const fin = await transactionRepository.getTotals(startStr, endStr);

        trend.push({
          label: `${month}/${year.toString().substring(2)}`,
          vehicleCount,
          revenue: Math.round(fin.netRevenue / 100),
          expense: Math.round(fin.totalExpense / 100),
          netProfit: Math.round(fin.netProfit / 100),
        });
      }
    }

    // Hizmet Satış Dağılımı (Rapor aralığının tamamı için)
    let overallStart = '';
    if (period === 'daily') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      overallStart = `${d.toISOString().substring(0, 10)} 00:00:00`;
    } else if (period === 'weekly') {
      const d = new Date(now);
      d.setDate(d.getDate() - 27);
      overallStart = `${d.toISOString().substring(0, 10)} 00:00:00`;
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      overallStart = `${d.toISOString().substring(0, 10)} 00:00:00`;
    }
    const overallEnd = `${now.toISOString().substring(0, 10)} 23:59:59`;

    const items = await workOrderRepository.getWorkOrderItemsByDateRange(overallStart, overallEnd);
    const serviceMap = new Map<number, { serviceId: number; serviceName: string; count: number; totalRevenueKurus: number }>();

    for (const item of items) {
      if (item.orderStatus === 'cancelled') continue;
      const existing = serviceMap.get(item.hizmet_id) || {
        serviceId: item.hizmet_id,
        serviceName: item.serviceName,
        count: 0,
        totalRevenueKurus: 0,
      };
      existing.count += item.miktar;
      existing.totalRevenueKurus += item.birim_fiyat_kurus * item.miktar;
      serviceMap.set(item.hizmet_id, existing);
    }

    const serviceBreakdown = Array.from(serviceMap.values()).sort((a, b) => b.totalRevenueKurus - a.totalRevenueKurus);

    // Personel Performansı ve Prim Hesabı
    const allStaff = await staffRepository.getAllStaff();
    const staffPerformance = allStaff.map((st) => {
      const staffItems = items.filter((it) => it.staff_id === st.id && (it.orderStatus === 'completed' || it.orderStatus === 'delivered'));
      let jobCount = 0;
      let totalRevenueKurus = 0;
      for (const it of staffItems) {
        jobCount += it.miktar;
        totalRevenueKurus += it.birim_fiyat_kurus * it.miktar;
      }
      const commissionKurus = Math.round((totalRevenueKurus * st.prim_orani) / 100);

      return {
        id: st.id,
        name: st.ad,
        primOrani: st.prim_orani,
        jobCount,
        totalRevenueKurus,
        commissionKurus,
      };
    }).sort((a, b) => b.totalRevenueKurus - a.totalRevenueKurus);

    return {
      period,
      trend,
      serviceBreakdown,
      staffPerformance,
    };
  },
};
