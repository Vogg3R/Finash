import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Text, Alert, ThemeIcon } from '@mantine/core';
import { IconCash, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
interface CashOpenModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
export function CashOpenModal({ opened, onClose, onSuccess }: CashOpenModalProps) {
  const { user } = useAuth();
  const [acilisTl, setAcilisTl] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseFloat(acilisTl);
    if (isNaN(val) || val < 0) {
      setError('Lütfen geçerli bir açılış kasa tutarı girin.');
      return;
    }
    const acilisKurus = Math.round(val * 100);
    setLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('cash:openSession', {
          userId: user?.id,
          acilisKurus,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Kasa açılırken bir hata oluştu.');
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
            <IconCash size={16} />
          </ThemeIcon>
          <Text fw={700}>Günün Kasa Oturumunu Aç</Text>
        </Group>
      }
      centered
    >
      <form onSubmit={handleSubmit}>
        <Text size="sm" c="dimmed" mb="md">
          Nakit tahsilat ve nakit iade işlemleri yapabilmek için günün kasa açılış tutarını giriniz.
        </Text>

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />} mb="md">
            {error}
          </Alert>
        )}

        <TextInput
          label="Açılış Nakit Kasası (TL)"
          placeholder="Örn: 500"
          value={acilisTl}
          onChange={(e) => setAcilisTl(e.currentTarget.value)}
          type="number"
          step="0.01"
          min="0"
          required
          autoFocus
          mb="xl"
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
          >
            Kasayı Aç
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
