import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  SegmentedControl,
  Button,
  Group,
  Text,
  Alert,
  ThemeIcon,
  Stack,
  Paper,
  Badge,
} from '@mantine/core';
import {
  IconCoins,
  IconAlertCircle,
  IconCheck,
  IconCreditCard,
  IconBuildingBank,
  IconCash,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
interface PaymentModalProps {
  opened: boolean;
  order: any | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenCashModal: () => void;
}
export function PaymentModal({ opened, order, onClose, onSuccess, onOpenCashModal }: PaymentModalProps) {
  const { user } = useAuth();
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [amountTl, setAmountTl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOpenCash, setHasOpenCash] = useState(false);
  useEffect(() => {
    if (!opened || !order) return;
    setError(null);

    // Açık kasa kontrolü
    if (window.electronAPI) {
      window.electronAPI.invoke('cash:getOpenSession').then((session) => {
        setHasOpenCash(!!session);
      }).catch(() => setHasOpenCash(false));
    }

    // Kalan tutarı hesapla
    const totalKurus = order.toplam_kurus - (order.indirim_kurus || 0);
    const paidKurus = (order.payments || []).reduce((sum: number, p: any) => sum + p.tutar_kurus, 0);
    const remainingKurus = Math.max(0, totalKurus - paidKurus);
    setAmountTl((remainingKurus / 100).toFixed(2));
  }, [opened, order]);
  if (!order) return null;
  const totalKurus = order.toplam_kurus - (order.indirim_kurus || 0);
  const paidKurus = (order.payments || []).reduce((sum: number, p: any) => sum + p.tutar_kurus, 0);
  const remainingKurus = Math.max(0, totalKurus - paidKurus);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseFloat(amountTl);
    if (isNaN(val) || val <= 0) {
      setError('Lütfen geçerli bir tahsilat tutarı girin.');
      return;
    }
    const amountKurus = Math.round(val * 100);
    if (method === 'cash' && !hasOpenCash) {
      setError('Nakit tahsilat yapılabilmesi için açık bir kasa oturumu olmalıdır. Lütfen önce kasayı açın.');
      return;
    }
    setLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('orders:addPayment', {
          userId: user?.id,
          workOrderId: order.id,
          tutarKurus: amountKurus,
          yontem: method,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Tahsilat alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" color="teal">
            <IconCoins size={16} />
          </ThemeIcon>
          <Text fw={700}>Tahsilat Al • {order.no}</Text>
        </Group>
      }
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Sipariş Özeti */}
          <Paper p="sm" radius="md">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed">Plaka</Text>
                <Badge color="brand" size="md">{order.vehicle?.plaka || order.plaka}</Badge>
              </div>
              <div>
                <Text size="xs" c="dimmed">Toplam</Text>
                <Text fw={700} size="sm">{(totalKurus / 100).toFixed(2)} ₺</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Ödenen</Text>
                <Text fw={700} size="sm" c="teal">{(paidKurus / 100).toFixed(2)} ₺</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Kalan Bakiye</Text>
                <Text fw={800} size="md" c={remainingKurus > 0 ? 'yellow' : 'teal'}>
                  {(remainingKurus / 100).toFixed(2)} ₺
                </Text>
              </div>
            </Group>
          </Paper>

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          )}

          {method === 'cash' && !hasOpenCash && (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />} title="Kasa Kapalı">
              <Text size="xs" mb="xs">
                Nakit tahsilat alabilmek için önce günün kasa oturumunu açmanız gerekmektedir.
              </Text>
              <Button size="xs" color="yellow" variant="light" onClick={onOpenCashModal}>
                Kasayı Aç
              </Button>
            </Alert>
          )}

          <div>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">Ödeme Yöntemi</Text>
            <SegmentedControl
              value={method}
              onChange={(val) => setMethod(val as any)}
              data={[
                { label: 'Nakit', value: 'cash' },
                { label: 'Kredi Kartı', value: 'card' },
                { label: 'Havale/EFT', value: 'transfer' },
              ]}
              fullWidth
            />
          </div>

          <TextInput
            label="Tahsil Edilen Tutar (TL)"
            placeholder="0.00"
            value={amountTl}
            onChange={(e) => setAmountTl(e.currentTarget.value)}
            type="number"
            step="0.01"
            min="0.01"
            required
            autoFocus
            styles={{
              input: { fontSize: 18, fontWeight: 700 },
            }}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button
              type="submit"
              loading={loading}
              leftSection={<IconCheck size={16} />}
              disabled={method === 'cash' && !hasOpenCash}
            >
              Tahsilatı Kaydet
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
