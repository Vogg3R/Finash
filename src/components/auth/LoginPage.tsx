import React, { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Group,
  Stack,
  Alert,
  SegmentedControl,
  ThemeIcon,
  Modal,
} from '@mantine/core';
import { IconCar, IconAlertCircle, IconLock, IconShieldCheck, IconUser } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, changePassword, user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // P7 Zorunlu şifre değiştirme durumu
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changePassError, setChangePassError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Lütfen şifre veya PIN giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(selectedUser, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Giriş yapılamadı.');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      setChangePassError('Şifre en az 4 haneli/karakterli olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError('Yeni şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    setChangePassError(null);
    const res = await changePassword(newPassword);
    setLoading(false);

    if (!res.success) {
      setChangePassError(res.error || 'Şifre değiştirilemedi.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#070b13',
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(30, 58, 138, 0.25) 0%, transparent 70%)',
        padding: 20,
      }}
    >
      <Paper
        p={36}
        radius="lg"
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(51, 65, 85, 0.45)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
        }}
      >
        <Stack align="center" gap="xs" mb="lg">
          <ThemeIcon size={54} radius="xl" variant="gradient" gradient={{ from: 'blue.6', to: 'cyan.5' }}>
            <IconCar size={32} />
          </ThemeIcon>
          <Title order={2} c="white" fw={800} style={{ letterSpacing: '-0.02em' }}>
            WashTrack
          </Title>
          <Text size="sm" c="dimmed">
            Oto Kuaför ve Araç Yıkama Takip Sistemi
          </Text>
        </Stack>

        <form onSubmit={handleLogin}>
          <Stack gap="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                {error}
              </Alert>
            )}

            <div>
              <Text size="xs" fw={600} c="dimmed" mb={6} tt="uppercase">
                Kullanıcı Seçimi
              </Text>
              <SegmentedControl
                fullWidth
                value={selectedUser}
                onChange={(val) => {
                  setSelectedUser(val);
                  setPassword('');
                  setError(null);
                }}
                data={[
                  { label: 'Yönetici (admin)', value: 'admin' },
                  { label: 'Kasa / Resepsiyon', value: 'kasa' },
                ]}
                color="blue"
              />
            </div>

            <PasswordInput
              label="Şifre veya PIN"
              placeholder="Şifrenizi girin..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftSection={<IconLock size={16} />}
              size="md"
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              size="md"
              loading={loading}
              variant="gradient"
              gradient={{ from: 'blue.6', to: 'indigo.6' }}
              styles={{
                root: {
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                },
              }}
            >
              Giriş Yap
            </Button>

            <Group justify="center" gap={6} mt="xs">
              <IconShieldCheck size={14} color="#64748b" />
              <Text size="xs" c="dimmed">
                Tamamen yerel ve güvenli çevrimdışı erişim
              </Text>
            </Group>
          </Stack>
        </form>
      </Paper>

      {/* P7 Zorunlu İlk Giriş Şifre Değiştirme Modalı */}
      <Modal
        opened={!!user?.ilkgiris_sifre_degistir}
        onClose={() => {}}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        title={
          <Group gap="xs">
            <ThemeIcon color="yellow" size="sm" radius="xl">
              <IconAlertCircle size={14} />
            </ThemeIcon>
            <Text fw={700}>Güvenlik Uyarısı: İlk Giriş Şifre Değişimi</Text>
          </Group>
        }
        centered
        styles={{
          content: {
            backgroundColor: '#0f172a',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          },
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Varsayılan şifrenizle ilk kez giriş yaptınız. Güvenliğiniz için lütfen yeni bir şifre veya PIN belirleyin.
          </Text>

          {changePassError && (
            <Alert color="red" variant="light" radius="md">
              {changePassError}
            </Alert>
          )}

          <PasswordInput
            label="Yeni Şifre / PIN"
            placeholder="En az 4 haneli yeni şifre..."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <PasswordInput
            label="Yeni Şifre Tekrar"
            placeholder="Şifreyi doğrulayın..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button fullWidth color="blue" onClick={handleChangePassword} loading={loading}>
            Şifreyi Güncelle ve Başla
          </Button>
        </Stack>
      </Modal>
    </div>
  );
};
