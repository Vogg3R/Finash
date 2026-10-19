import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Table,
  Badge,
  Group,
  Stack,
  SegmentedControl,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  Card,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCar,
  IconChartBar,
  IconCoins,
  IconUserCheck,
  IconRefresh,
  IconDownload,
  IconPrinter,
} from '@tabler/icons-react';
import { StatCard } from '../ui/StatCard';
import { PageHeader } from '../ui/PageHeader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
// Grafik paleti: ilk renk uygulamanın vurgu rengi (brand-6), diğerleri Mantine 6. tonları
const COLORS = ['#4870e9', '#12b886', '#f59f00', '#e64980', '#7950f2', '#15aabf', '#868e96'];
const CHART_GRID = '#e7e9ee';
const CHART_AXIS = '#868e96';
const TOOLTIP_STYLE = { borderRadius: 10, border: '1px solid #e7e9ee', boxShadow: '0 4px 12px rgba(16, 24, 40, 0.08)' };
export function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportData, setReportData] = useState<any>({
    trend: [],
    serviceBreakdown: [],
    staffPerformance: [],
  });
  const [loading, setLoading] = useState(false);
  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.invoke('summary:getReports', { period });
      setReportData(data || { trend: [], serviceBreakdown: [], staffPerformance: [] });
    } catch (err) {
      console.error('Rapor yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const totalPeriodVehicles = (reportData.trend || []).reduce((sum: number, t: any) => sum + (t.vehicleCount || 0), 0);
  const totalPeriodRevenue = (reportData.trend || []).reduce((sum: number, t: any) => sum + (t.revenue || 0), 0);
  const totalPeriodProfit = (reportData.trend || []).reduce((sum: number, t: any) => sum + (t.netProfit || 0), 0);
  return (
    <Stack gap="lg">
      {/* Üst Bar */}
      <Group justify="space-between" align="flex-end">
        <PageHeader title="Raporlar & Analizler" description="İşletme performansı, araç yıkama trendleri, hizmet satışları ve personel primleri" />

        <Group gap="sm">
          <SegmentedControl
            value={period}
            onChange={(val) => setPeriod(val as any)}
            data={[
              { label: 'Son 7 Gün (Günlük)', value: 'daily' },
              { label: 'Son 4 Hafta (Haftalık)', value: 'weekly' },
              { label: 'Son 6 Ay (Aylık)', value: 'monthly' },
            ]}
          />

          <Tooltip label="Yenile">
            <ActionIcon variant="default" size={36} onClick={loadData} loading={loading} aria-label="Yenile">
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={async () => {
              try {
                const base64 = await window.electronAPI.invoke('report:exportExcel', { period });
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `WashTrack_Rapor_${period}_${new Date().toISOString().substring(0, 10)}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err: any) {
                alert(err?.message || 'Excel dosyası oluşturulamadı.');
              }
            }}
          >
            Excel İndir
          </Button>

          <Button
            variant="default"
            leftSection={<IconPrinter size={16} />}
            onClick={() => window.print()}
          >
            PDF / Yazdır
          </Button>
        </Group>
      </Group>

      {/* Dönem Özeti KPI Kartları */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <StatCard label="Dönem Yıkanan Araç" value={<>{totalPeriodVehicles} Araç</>} icon={<IconCar size={17} />} color="brand" />

        <StatCard label="Dönem Net Gelir" value={<>{totalPeriodRevenue.toLocaleString('tr-TR')} ₺</>} icon={<IconCoins size={17} />} color="teal" />

        <StatCard
          label="Dönem Net Kâr"
          value={`${totalPeriodProfit.toLocaleString('tr-TR')} ₺`}
          icon={<IconCoins size={17} />}
          color={totalPeriodProfit >= 0 ? 'green' : 'red'}
          valueColor={totalPeriodProfit < 0 ? 'red' : undefined}
        />
      </SimpleGrid>

      {/* Grafikler Grid */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        {/* Grafik 1: Araç Sayısı ve Finansal Trend (BarChart) */}
        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="xs">
            Gelir, Gider ve Araç Sayısı Trendi
          </Title>
          <Text size="xs" c="dimmed" mb="md">
            Seçilen döneme ait net ciro (₺), gider (₺) ve yıkanan araç hacmi
          </Text>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="label" stroke={CHART_AXIS} tickLine={false} axisLine={false} fontSize={12} />
                {/* ₺ ve araç adedi farklı ölçeklerde: ayrı eksenler, yoksa araç sütunları görünmez */}
                <YAxis yAxisId="tl" stroke={CHART_AXIS} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis yAxisId="adet" orientation="right" stroke={CHART_AXIS} tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(72, 112, 233, 0.06)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="tl" dataKey="revenue" name="Net Gelir (₺)" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="tl" dataKey="expense" name="Gider (₺)" fill="#fa5252" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="adet" dataKey="vehicleCount" name="Araç Sayısı" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Paper>

        {/* Grafik 2: Hizmet Satış Dağılımı (PieChart & Table) */}
        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="xs">
            Hizmet Satış Dağılımı
          </Title>
          <Text size="xs" c="dimmed" mb="md">
            En çok tercih edilen oto kuaför ve yıkama hizmetleri (Ciro ve Adet)
          </Text>
          <div style={{ width: '100%', height: 300 }}>
            {reportData.serviceBreakdown && reportData.serviceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.serviceBreakdown}
                    dataKey="count"
                    nameKey="serviceName"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {reportData.serviceBreakdown.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} adet (${((item.payload.totalRevenueKurus || 0) / 100).toFixed(2)} ₺)`,
                      name,
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Group justify="center" h="100%">
                <Text c="dimmed">Bu dönemde tamamlanan hizmet bulunmuyor.</Text>
              </Group>
            )}
          </div>
        </Paper>
      </SimpleGrid>

      {/* Personel Performansı ve Prim Raporu Tablosu (FR-39) */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="sm">
          <div>
            <Title order={4}>
              Personel Performansı & Hak Edilen Primler
            </Title>
            <Text size="xs" c="dimmed">
              Yıkama personelinin tamamladığı işlem sayısı, işletmeye kazandırdığı ciro ve sözleşmeli prim tutarları
            </Text>
          </div>
          <ThemeIcon size={32} radius="md" color="indigo" variant="light">
            <IconUserCheck size={18} />
          </ThemeIcon>
        </Group>

        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th><Text size="xs" fw={700} c="dimmed">Personel Adı</Text></Table.Th>
              <Table.Th><Text size="xs" fw={700} c="dimmed">Prim Oranı (%)</Text></Table.Th>
              <Table.Th style={{ textAlign: 'center' }}><Text size="xs" fw={700} c="dimmed">Tamamlanan İş Adedi</Text></Table.Th>
              <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={700} c="dimmed">Oluşturulan Hizmet Cirosu</Text></Table.Th>
              <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={700} c="dimmed">Hak Edilen Prim (₺)</Text></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {!reportData.staffPerformance || reportData.staffPerformance.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                  <Text c="dimmed">Kayıtlı personel bulunamadı.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              reportData.staffPerformance.map((st: any) => (
                <Table.Tr key={st.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>{st.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="brand" variant="light">%{st.primOrani}</Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Badge color="gray" variant="filled">{st.jobCount} İş</Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="sm" fw={600} c="teal">
                      {((st.totalRevenueKurus || 0) / 100).toFixed(2)} ₺
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="sm" fw={800} c="yellow">
                      {((st.commissionKurus || 0) / 100).toFixed(2)} ₺
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
