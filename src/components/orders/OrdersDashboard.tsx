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
        return <Badge color="blue" variant="filled">Tamamlandı</Badge>;
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
      {/* Kasa Durum Çubuğu */}
      {!openSession ? (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle size={18} />}
          title="Kasa Oturumu Kapalı"
          styles={{ root: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' } }}
        >
          <Group justify="space-between" align="center">
            <Text size="sm">
              Nakit tahsilat ve nakit iade işlemleri yapabilmek için günün kasa açılışını yapmanız gerekmektedir.
            </Text>
            <Button size="xs" color="yellow" variant="filled" onClick={() => setCashModalOpened(true)}>
              Kasayı Aç
            </Button>
          </Group>
        </Alert>
      ) : (
        <Paper
          p="xs"
          px="md"
          radius="md"
          style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.3)' }}
        >
          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon size={24} radius="xl" color="teal">
                <IconCash size={14} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="teal">
                Kasa Oturumu Açık • Beklenen Nakit Kasa: {(openSession.beklenen_kurus / 100).toFixed(2)} ₺
              </Text>
            </Group>
            <Badge color="teal" variant="light">
              Açılış: {(openSession.acilis_kurus / 100).toFixed(2)} ₺
            </Badge>
          </Group>
        </Paper>
      )}

      {/* Üst Bar: Başlık & Hızlı Yeni İş Emri Butonu (F2) */}
      <Group justify="space-between" align="center">
        <div>
          <Text size="xl" fw={800} c="white">
            İş Emirleri & Günlük Akış
          </Text>
          <Text size="sm" c="dimmed">
            Bugün işlem gören araçlar ve durum takibi (Kısayol: F2 Yeni İş Emri)
          </Text>
        </div>

        <Group gap="xs">
          <Tooltip label="Yenile">
            <ActionIcon variant="light" color="blue" size="lg" onClick={loadData} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>

          <Button
            size="md"
            leftSection={<IconPlus size={18} />}
            color="blue"
            variant="gradient"
            gradient={{ from: 'blue.6', to: 'indigo.6' }}
            onClick={() => setNewOrderModalOpened(true)}
            styles={{
              root: {
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              },
            }}
          >
            Yeni İş Emri (F2)
          </Button>
        </Group>
      </Group>

      {/* Sayaç Kartları (FR-07, FR-35) */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
        <Card p="sm" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">Toplam Araç</Text>
          <Text size="xl" fw={800} c="white" mt={2}>{totalCount}</Text>
        </Card>

        <Card p="sm" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Text size="xs" c="yellow" fw={600} tt="uppercase">Bekliyor</Text>
          <Text size="xl" fw={800} c="yellow" mt={2}>{pendingCount}</Text>
        </Card>

        <Card p="sm" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Text size="xs" c="cyan" fw={600} tt="uppercase">Yıkanıyor</Text>
          <Text size="xl" fw={800} c="cyan" mt={2}>{washingCount}</Text>
        </Card>

        <Card p="sm" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Text size="xs" c="blue" fw={600} tt="uppercase">Tamamlandı</Text>
          <Text size="xl" fw={800} c="blue" mt={2}>{completedCount}</Text>
        </Card>

        <Card p="sm" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Text size="xs" c="teal" fw={600} tt="uppercase">Teslim Edildi</Text>
          <Text size="xl" fw={800} c="teal" mt={2}>{deliveredCount}</Text>
        </Card>

        <Card p="sm" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">Toplam Ciro</Text>
          <Text size="lg" fw={800} c="teal" mt={2}>
            {(totalRevenueKurus / 100).toFixed(2)} ₺
          </Text>
        </Card>
      </SimpleGrid>

      {/* Durum Sekmeleri & İş Emri Tablosu */}
      <Paper p="md" radius="lg" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #334155' }}>
        <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val)}>
          <Tabs.List mb="md">
            <Tabs.Tab value="all">Tümü ({totalCount})</Tabs.Tab>
            <Tabs.Tab value="pending" color="yellow">Bekleyenler ({pendingCount})</Tabs.Tab>
            <Tabs.Tab value="washing" color="cyan">Yıkananlar ({washingCount})</Tabs.Tab>
            <Tabs.Tab value="completed" color="blue">Tamamlananlar ({completedCount})</Tabs.Tab>
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
              styles={{
                th: { color: '#94a3b8', borderBottomColor: '#334155' },
                td: { color: '#fff', borderBottomColor: '#1e293b' },
              }}
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
                        <Badge size="lg" color="blue" variant="outline">
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
                              color="blue"
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
