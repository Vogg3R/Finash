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
        backgroundColor: 'var(--app-bg)',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, var(--mantine-color-brand-0) 0%, transparent 70%)',
        padding: 20,
      }}
    >
      <Paper p={40} radius="xl" shadow="lg" style={{ width: '100%', maxWidth: 420 }}>
        <Stack align="center" gap={6} mb={28}>
          <ThemeIcon size={52} radius="lg" mb={8}>
            <IconCar size={28} />
          </ThemeIcon>
          <Title order={2} fz={26} fw={800}>
            WashTrack'e hoş geldiniz
          </Title>
          <Text size="sm" c="dimmed">
            Devam etmek için giriş yapın
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
              <Text fz="md" fw={500} mb={4}>
                Kullanıcı
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
                  { label: 'Yönetici', value: 'admin' },
                  { label: 'Kasa', value: 'kasa' },
                ]}
                size="md"
                radius="md"
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
            >
              Giriş Yap
            </Button>

            <Group justify="center" gap={6} mt="xs">
              <IconShieldCheck size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">
                Verileriniz yalnızca bu bilgisayarda saklanır
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

          <Button fullWidth color="brand" onClick={handleChangePassword} loading={loading}>
            Şifreyi Güncelle ve Başla
          </Button>
        </Stack>
      </Modal>
    </div>
  );
};
