import React, { useState } from 'react';
import {
  Modal,
  Textarea,
  PasswordInput,
  Button,
  Group,
  Text,
  Alert,
  ThemeIcon,
  Stack,
  Badge,
} from '@mantine/core';
import { IconAlertTriangle, IconAlertCircle, IconCheck, IconShieldLock } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

interface CancelOrderModalProps {
  opened: boolean;
  order: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelOrderModal({ opened, order, onClose, onSuccess }: CancelOrderModalProps) {
  const { user } = useAuth();
  const [cancelReason, setCancelReason] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const isDelivered = order.durum === 'delivered';
  const hasPayments = (order.payments || []).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cancelReason.trim()) {
      setError('İş emrini iptal etmek için lütfen bir gerekçe belirtiniz.');
      return;
    }

    if (isDelivered && !adminPin.trim()) {
      setError('Teslim edilmiş iş emrinin iptali için Yönetici PIN onayı zorunludur.');
      return;
    }

    setLoading(true);

    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('orders:updateStatus', {
          userId: user?.id,
          orderId: order.id,
          status: 'cancelled',
          options: {
            cancelReason: cancelReason.trim(),
            adminPin: isDelivered ? adminPin.trim() : undefined,
          },
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'İş emri iptal edilirken bir hata oluştu.');
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
          <ThemeIcon size={28} radius="md" color="red">
            <IconAlertTriangle size={16} />
          </ThemeIcon>
          <Text fw={700}>İş Emrini İptal Et • {order.no}</Text>
        </Group>
      }
      styles={{
        content: { backgroundColor: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.4)' },
        header: { backgroundColor: '#0f172a', borderBottom: '1px solid rgba(51, 65, 85, 0.4)' },
      }}
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Plaka: <Text span fw={700} c="white">{order.vehicle?.plaka || order.plaka}</Text></Text>
            <Badge color="red" variant="light">Durum: {order.durum}</Badge>
          </Group>

          {hasPayments && (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />} title="İade Bildirimi">
              <Text size="xs">
                Bu iş emrine ait tahsilatlar bulunmaktadır. İptal işlemiyle birlikte tüm ödemeler finans defterine iade (refund) olarak işlenecek ve nakit iadeler açık kasa bakiyesinden düşülecektir.
              </Text>
            </Alert>
          )}

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          )}

          <Textarea
            label="İptal Gerekçesi (Zorunlu)"
            placeholder="Örn: Müşteri acil çıktı, işlem tamamlanamadı..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.currentTarget.value)}
            required
            autoFocus
            minRows={3}
            styles={{
              input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' },
            }}
          />

          {isDelivered && (
            <Alert color="yellow" icon={<IconShieldLock size={16} />} title="P2 Kuralı: Yönetici PIN Onayı">
              <Text size="xs" mb="xs">
                Teslim edilmiş iş emrinin iptali yetki gerektirir. Lütfen Yönetici PIN kodunu giriniz.
              </Text>
              <PasswordInput
                placeholder="Yönetici PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.currentTarget.value)}
                required
                styles={{
                  input: { backgroundColor: '#1e293b', borderColor: '#f59e0b', color: '#fff' },
                }}
              />
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              color="red"
              loading={loading}
              leftSection={<IconAlertTriangle size={16} />}
            >
              İptali Onayla
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
