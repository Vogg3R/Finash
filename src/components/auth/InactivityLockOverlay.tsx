import React, { useState } from 'react';
import { Paper, PasswordInput, Button, Title, Text, Stack, Alert, ThemeIcon, Group } from '@mantine/core';
import { IconLock, IconAlertCircle, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
export const InactivityLockOverlay: React.FC = () => {
  const { isLocked, user, unlock, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!isLocked || !user) return null;
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Lütfen şifre veya PIN girin.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await unlock(pin);
    setLoading(false);
    if (!res.success) {
      setError('Hatalı şifre veya PIN.');
    } else {
      setPin('');
    }
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(245, 246, 248, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Paper
        p={32}
        radius="xl"
        shadow="lg"
        style={{
          width: '100%',
          maxWidth: 380,
        }}
      >
        <Stack align="center" gap="xs" mb="md">
          <ThemeIcon size={48} radius="xl" color="yellow" variant="light">
            <IconLock size={28} />
          </ThemeIcon>
          <Title order={3}>
            Oturum Kilitlendi
          </Title>
          <Text size="xs" c="dimmed" ta="center">
            15 dakika hareketsizlik nedeniyle oturumunuz kilitlendi. Devam etmek için şifrenizi girin.
          </Text>
          <Text size="sm" fw={600}>
            Kullanıcı: {user.kullanici_adi} ({user.rol === 'admin' ? 'Yönetici' : 'Kasa'})
          </Text>
        </Stack>

        <form onSubmit={handleUnlock}>
          <Stack gap="sm">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                {error}
              </Alert>
            )}

            <PasswordInput
              placeholder="Şifre veya PIN girin..."
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              size="md"
            />

            <Button type="submit" fullWidth color="brand" size="md" loading={loading}>
              Kilidi Aç
            </Button>

            <Group justify="center" mt="xs">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconLogout size={14} />}
                onClick={logout}
              >
                Farklı Kullanıcıyla Giriş Yap
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </div>
  );
};
