import React, { useEffect, useState, useCallback } from 'react';
import {
  AppShell,
  Avatar,
  Box,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {
  IconCar,
  IconCoins,
  IconMail,
  IconUsers,
  IconSettings,
  IconLayoutDashboard,
  IconLogout,
  IconWash,
  IconPackage,
  IconChartBar,
} from '@tabler/icons-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { InactivityLockOverlay } from './components/auth/InactivityLockOverlay';
import { ServicesPage } from './components/services/ServicesPage';
import { CustomersPage } from './components/customers/CustomersPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { OrdersDashboard } from './components/orders/OrdersDashboard';
import { StockPage } from './components/stock/StockPage';
import { FinancePage } from './components/finance/FinancePage';
import { ReportsPage } from './components/reports/ReportsPage';

type NavKey = 'dashboard' | 'customers' | 'services' | 'stock' | 'finance' | 'reports' | 'settings';

type AccessModule = Parameters<ReturnType<typeof useAuth>['canAccess']>[0];

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ReactNode; access?: AccessModule }[] = [
  { key: 'dashboard', label: 'İş Emirleri', icon: <IconLayoutDashboard size={19} stroke={1.7} /> },
  { key: 'customers', label: 'Müşteri & Araç', icon: <IconUsers size={19} stroke={1.7} /> },
  { key: 'services', label: 'Hizmet & Fiyat', icon: <IconWash size={19} stroke={1.7} />, access: 'services' },
  { key: 'stock', label: 'Stok', icon: <IconPackage size={19} stroke={1.7} /> },
  { key: 'finance', label: 'Finans & Kasa', icon: <IconCoins size={19} stroke={1.7} />, access: 'finance' },
  { key: 'reports', label: 'Raporlar', icon: <IconChartBar size={19} stroke={1.7} />, access: 'reports' },
  { key: 'settings', label: 'Ayarlar', icon: <IconSettings size={19} stroke={1.7} />, access: 'settings' },
];

function MainLayout() {
  const { user, isAuthenticated, logout, canAccess } = useAuth();
  const [currentNav, setCurrentNav] = useState<NavKey>('dashboard');
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  const [queueStatus, setQueueStatus] = useState<any>({ todaySent: false, pendingCount: 0, failedCount: 0 });
  const [emailSending, setEmailSending] = useState(false);

  const checkQueueStatus = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const q = await window.electronAPI.invoke('email:getQueueStatus');
      if (q) setQueueStatus(q);
    } catch {}
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      }).catch(() => {});

      checkQueueStatus();
      const interval = setInterval(checkQueueStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [checkQueueStatus]);

  const handleSendDailyEmail = async () => {
    if (!window.electronAPI || !user) return;
    setEmailSending(true);
    try {
      const res = await window.electronAPI.invoke('email:triggerDaily', { userId: user.id });
      if (res.alreadySent) {
        if (confirm('Bugünkü ciro e-postası daha önce başarıyla gönderilmiştir. Tekrar göndermek istiyor musunuz?')) {
          await window.electronAPI.invoke('email:triggerDaily', { userId: user.id, force: true });
          alert('Ciro e-postası tekrar kuyruğa alındı.');
        }
      } else {
        alert(res.message || 'Ciro e-postası kuyruğa alındı.');
      }
      checkQueueStatus();
    } catch (err: any) {
      alert(err?.message || 'E-posta gönderim işlemi başlatılamadı.');
    } finally {
      setEmailSending(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // FR-55: buton yanındaki durum göstergesi
  const mailState = queueStatus.todaySent
    ? { color: 'teal', label: 'Bugün gönderildi' }
    : queueStatus.failedCount > 0
    ? { color: 'red', label: 'Gönderilemedi' }
    : queueStatus.pendingCount > 0
    ? { color: 'yellow', label: 'Kuyrukta bekliyor' }
    : { color: 'gray', label: 'Henüz gönderilmedi' };

  const roleLabel = user?.rol === 'admin' ? 'Yönetici' : user?.rol === 'cashier' ? 'Kasa' : 'Personel';

  return (
    <>
      <InactivityLockOverlay />

      <AppShell navbar={{ width: 248, breakpoint: 0 }} padding={0}>
        <AppShell.Navbar
          p="md"
          style={{ backgroundColor: 'var(--app-sidebar-bg)', borderRight: '1px solid var(--app-border)' }}
        >
          {/* Logo */}
          <Group gap={10} px={6} mb="xl" mt={4} wrap="nowrap">
            <ThemeIcon size={36} radius="md">
              <IconCar size={20} />
            </ThemeIcon>
            <div>
              <Text fw={800} fz={17} lh={1.1} style={{ letterSpacing: '-0.02em' }}>
                WashTrack
              </Text>
              <Text fz={11} c="dimmed" lh={1.2}>
                Oto Kuaför Takip
              </Text>
            </div>
          </Group>

          {/* Menü */}
          <AppShell.Section grow>
            <Stack gap={2}>
              {NAV_ITEMS.filter((item) => !item.access || canAccess(item.access)).map((item) => (
                <NavLink
                  key={item.key}
                  label={item.label}
                  leftSection={item.icon}
                  active={currentNav === item.key}
                  onClick={() => setCurrentNav(item.key)}
                  variant="light"
                  styles={{
                    root: { borderRadius: 'var(--mantine-radius-md)', height: 40 },
                    label: { fontWeight: 600, fontSize: 14 },
                  }}
                />
              ))}
            </Stack>
          </AppShell.Section>

          {/* Ciroyu Gönder (FR-51) + kullanıcı */}
          <AppShell.Section>
            <Stack gap="sm">
              <Box>
                <Button
                  fullWidth
                  variant="default"
                  loading={emailSending}
                  onClick={handleSendDailyEmail}
                  leftSection={<IconMail size={17} />}
                  justify="flex-start"
                >
                  Ciroyu Gönder
                </Button>
                <Group gap={6} mt={6} px={4}>
                  <Box
                    w={7}
                    h={7}
                    style={{ borderRadius: '50%', backgroundColor: `var(--mantine-color-${mailState.color}-6)` }}
                  />
                  <Text fz={12} c="dimmed">
                    {mailState.label}
                  </Text>
                </Group>
              </Box>

              <Box style={{ borderTop: '1px solid var(--app-border)' }} pt="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color="brand" radius="xl" size={34}>
                      {user?.kullanici_adi?.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text fz={14} fw={600} lh={1.2}>
                        {user?.kullanici_adi}
                      </Text>
                      <Text fz={12} c="dimmed" lh={1.2}>
                        {roleLabel}
                      </Text>
                    </div>
                  </Group>
                  <Tooltip label="Çıkış yap">
                    <ActionIcon variant="subtle" color="gray" onClick={logout} aria-label="Çıkış yap">
                      <IconLogout size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Text fz={11} c="dimmed" mt="xs" px={4}>
                  v{appVersion}
                </Text>
              </Box>
            </Stack>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main style={{ backgroundColor: 'var(--app-bg)', minHeight: '100vh' }}>
          <Box maw={1360} mx="auto" px={32} py={28}>
            {currentNav === 'services' && <ServicesPage />}
            {currentNav === 'customers' && <CustomersPage />}
            {currentNav === 'stock' && <StockPage />}
            {currentNav === 'finance' && <FinancePage />}
            {currentNav === 'reports' && <ReportsPage />}
            {currentNav === 'settings' && <SettingsPage />}
            {currentNav === 'dashboard' && <OrdersDashboard />}
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
