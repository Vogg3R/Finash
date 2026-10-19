import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Group,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Card,
  ThemeIcon,
  Stack,
  Tabs,
  Table,
  ActionIcon,
  Tooltip,
  Alert,
  Kbd,
} from '@mantine/core';
import {
  IconCar,
  IconClock,
  IconCoins,
  IconCheck,
  IconAlertTriangle,
  IconPlayerPlay,
  IconWash,
  IconPlus,
  IconCash,
  IconReceipt2,
  IconRefresh,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { NewWorkOrderModal } from './NewWorkOrderModal';
import { PaymentModal } from './PaymentModal';
import { CancelOrderModal } from './CancelOrderModal';
import { CashOpenModal } from '../cash/CashOpenModal';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';

export function OrdersDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [openSession, setOpenSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Modallar
  const [newOrderModalOpened, setNewOrderModalOpened] = useState(false);
  const [paymentModalOrder, setPaymentModalOrder] = useState<any | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cashModalOpened, setCashModalOpened] = useState(false);

  // Veri yükleme
  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const [todayOrders, cash] = await Promise.all([
        window.electronAPI.invoke('orders:getToday'),
        window.electronAPI.invoke('cash:getOpenSession'),
      ]);
      setOrders(todayOrders || []);
      setOpenSession(cash || null);
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  // F2 Kısayol Tuşu Dinleyici
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setNewOrderModalOpened(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Durum ilerletme
  const handleAdvanceStatus = async (orderId: number, nextStatus: 'washing' | 'completed' | 'delivered') => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.invoke('orders:updateStatus', {
        userId: user?.id,
        orderId,
        status: nextStatus,
      });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Durum güncellenirken hata oluştu.');
    }
  };

  // İstatistikler (FR-07, FR-35)
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.durum === 'pending').length;
  const washingCount = orders.filter((o) => o.durum === 'washing').length;
  const completedCount = orders.filter((o) => o.durum === 'completed').length;
  const deliveredCount = orders.filter((o) => o.durum === 'delivered').length;
  const cancelledCount = orders.filter((o) => o.durum === 'cancelled').length;
  const totalRevenueKurus = orders
    .filter((o) => o.durum !== 'cancelled')
    .reduce((sum, o) => sum + (o.toplam_kurus - (o.indirim_kurus || 0)), 0);

  // Filtrelenmiş Liste
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'all') return true;
    return o.durum === activeTab;
  });
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge color="yellow" variant="light">Bekliyor</Badge>;
      case 'washing':
        return <Badge color="cyan" variant="filled">Yıkanıyor</Badge>;
      case 'completed':
        return <Badge color="brand" variant="filled">Tamamlandı</Badge>;
      case 'delivered':
        return <Badge color="teal" variant="filled">Teslim Edildi</Badge>;
      case 'cancelled':
        return <Badge color="red" variant="outline">İptal</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };
  return (
    <Stack gap="lg">
      <PageHeader
        title="İş Emirleri"
        description="Bugün işlem gören araçlar ve durumları. Yeni kayıt için F2."
        actions={
          <>
            <Tooltip label="Yenile">
              <ActionIcon variant="default" size={36} onClick={loadData} loading={loading} aria-label="Yenile">
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Button size="md" leftSection={<IconPlus size={18} />} onClick={() => setNewOrderModalOpened(true)}>
              Yeni İş Emri
              <Kbd ml={8} size="xs">F2</Kbd>
            </Button>
          </>
        }
      />

      {/* Kasa Durum Çubuğu */}
      {!openSession ? (
        <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title="Kasa henüz açılmadı">
          <Group justify="space-between" align="center">
            <Text size="sm">Nakit tahsilat ve iade yapabilmek için günün kasa açılışını yapın.</Text>
            <Button size="xs" color="yellow" onClick={() => setCashModalOpened(true)}>
              Kasayı Aç
            </Button>
          </Group>
        </Alert>
      ) : (
        <Paper px="md" py="sm" radius="md">
          <Group justify="space-between">
            <Group gap="sm">
              <ThemeIcon size={28} radius="md" color="teal" variant="light">
                <IconCash size={16} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Kasa açık
              </Text>
              <Badge color="teal" variant="dot" size="sm">
                Beklenen nakit {(openSession.beklenen_kurus / 100).toFixed(2)} ₺
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Açılış: {(openSession.acilis_kurus / 100).toFixed(2)} ₺
            </Text>
          </Group>
        </Paper>
      )}

      {/* Sayaç Kartları (FR-07, FR-35) */}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
        <StatCard label="Toplam Araç" value={totalCount} icon={<IconCar size={17} />} color="gray" />
        <StatCard label="Bekliyor" value={pendingCount} icon={<IconClock size={17} />} color="yellow" />
        <StatCard label="Yıkanıyor" value={washingCount} icon={<IconWash size={17} />} color="cyan" />
        <StatCard label="Tamamlandı" value={completedCount} icon={<IconCheck size={17} />} color="brand" />
        <StatCard label="Teslim Edildi" value={deliveredCount} icon={<IconReceipt2 size={17} />} color="teal" />
        <StatCard label="Toplam Ciro" value={`${(totalRevenueKurus / 100).toFixed(2)} ₺`} icon={<IconCoins size={17} />} color="green" />
      </SimpleGrid>

      {/* Durum Sekmeleri & İş Emri Tablosu */}
      <Paper p="md" radius="lg">
        <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val)}>
          <Tabs.List mb="md">
            <Tabs.Tab value="all">Tümü ({totalCount})</Tabs.Tab>
            <Tabs.Tab value="pending" color="yellow">Bekleyenler ({pendingCount})</Tabs.Tab>
            <Tabs.Tab value="washing" color="cyan">Yıkananlar ({washingCount})</Tabs.Tab>
            <Tabs.Tab value="completed" color="brand">Tamamlananlar ({completedCount})</Tabs.Tab>
            <Tabs.Tab value="delivered" color="teal">Teslim Edilenler ({deliveredCount})</Tabs.Tab>
            {cancelledCount > 0 && <Tabs.Tab value="cancelled" color="red">İptaller ({cancelledCount})</Tabs.Tab>}
          </Tabs.List>

          {filteredOrders.length === 0 ? (
            <Text ta="center" py="xl" c="dimmed">
              Bu filtreye uygun iş emri bulunamadı.
            </Text>
          ) : (
            <Table
              verticalSpacing="sm"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>İş Emri No</Table.Th>
                  <Table.Th>Plaka</Table.Th>
                  <Table.Th>Araç Tipi</Table.Th>
                  <Table.Th>Müşteri</Table.Th>
                  <Table.Th>Tutar</Table.Th>
                  <Table.Th>Durum</Table.Th>
                  <Table.Th>Giriş Saati</Table.Th>
                  <Table.Th ta="right">İşlemler</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredOrders.map((o) => {
                  const netKurus = o.toplam_kurus - (o.indirim_kurus || 0);
                  const entryTime = o.giris_zamani ? new Date(o.giris_zamani).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-';
                  return (
                    <Table.Tr key={o.id}>
                      <Table.Td fw={700} c="dimmed">
                        {o.no}
                      </Table.Td>
                      <Table.Td>
                        <Badge size="lg" color="brand" variant="outline">
                          {o.plaka}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{o.vehicleTypeName}</Table.Td>
                      <Table.Td>{o.customerName || '-'}</Table.Td>
                      <Table.Td fw={700} c="teal">
                        {(netKurus / 100).toFixed(2)} ₺
                      </Table.Td>
                      <Table.Td>{getStatusBadge(o.durum)}</Table.Td>
                      <Table.Td c="dimmed">{entryTime}</Table.Td>
                      <Table.Td ta="right">
                        <Group justify="flex-end" gap="xs">
                          {/* Durum İlerletme Butonları (Durum Makinesi B2, P2) */}
                          {o.durum === 'pending' && (
                            <Button
                              size="xs"
                              color="cyan"
                              leftSection={<IconWash size={14} />}
                              onClick={() => handleAdvanceStatus(o.id, 'washing')}
                            >
                              Yıkamaya Al
                            </Button>
                          )}

                          {o.durum === 'washing' && (
                            <Button
                              size="xs"
                              color="brand"
                              leftSection={<IconCheck size={14} />}
                              onClick={() => handleAdvanceStatus(o.id, 'completed')}
                            >
                              Tamamla
                            </Button>
                          )}

                          {o.durum === 'completed' && (
                            <Button
                              size="xs"
                              color="teal"
                              leftSection={<IconCar size={14} />}
                              onClick={() => handleAdvanceStatus(o.id, 'delivered')}
                            >
                              Teslim Et
                            </Button>
                          )}

                          {/* Ödeme Al Butonu */}
                          {o.durum !== 'cancelled' && (
                            <Tooltip label="Tahsilat Ekle">
                              <ActionIcon
                                variant="light"
                                color="teal"
                                size="md"
                                onClick={() => setPaymentModalOrder(o)}
                              >
                                <IconReceipt2 size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}

                          {/* İptal Butonu (Delivered dahil P2 Yönetici PIN ile) */}
                          {o.durum !== 'cancelled' && (
                            <Tooltip label="İş Emrini İptal Et">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="md"
                                onClick={() => setCancelModalOrder(o)}
                              >
                                <IconAlertTriangle size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Tabs>
      </Paper>

      {/* Modallar */}
      <NewWorkOrderModal
        opened={newOrderModalOpened}
        onClose={() => setNewOrderModalOpened(false)}
        onSuccess={loadData}
      />

      <CashOpenModal
        opened={cashModalOpened}
        onClose={() => setCashModalOpened(false)}
        onSuccess={loadData}
      />

      <PaymentModal
        opened={!!paymentModalOrder}
        order={paymentModalOrder}
        onClose={() => setPaymentModalOrder(null)}
        onSuccess={loadData}
        onOpenCashModal={() => {
          setPaymentModalOrder(null);
          setCashModalOpened(true);
        }}
      />

      <CancelOrderModal
        opened={!!cancelModalOrder}
        order={cancelModalOrder}
        onClose={() => setCancelModalOrder(null)}
        onSuccess={loadData}
      />
    </Stack>
  );
}
