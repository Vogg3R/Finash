import React, { useEffect, useState, useCallback } from 'react';
import {
  AppShell,
  Group,
  Text,
  Badge,
  Button,
  Card,
  SimpleGrid,
  ThemeIcon,
  Stack,
  Paper,
  Tooltip,
} from '@mantine/core';
import {
  IconCar,
  IconCoins,
  IconClock,
  IconAlertTriangle,
  IconMail,
  IconDatabase,
  IconCheck,
  IconPlus,
  IconShieldCheck,
  IconSparkles,
  IconUsers,
  IconSettings,
  IconLayoutDashboard,
  IconLogout,
  IconWash,
  IconPackage,
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
import { IconChartBar } from '@tabler/icons-react';

function MainLayout() {
  const { user, isAuthenticated, logout, canAccess } = useAuth();
  const [currentNav, setCurrentNav] = useState<'dashboard' | 'customers' | 'services' | 'stock' | 'finance' | 'reports' | 'settings'>('dashboard');

  const [dbStatus, setDbStatus] = useState<{
    status: string;
    journalMode?: string;
    tableCount?: number;
  }>({ status: 'connected', journalMode: 'wal', tableCount: 20 });
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
      window.electronAPI.invoke('db:status').then((res) => {
        if (res) setDbStatus(res);
      }).catch(() => {});

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

  return (
    <>
      <InactivityLockOverlay />

      <AppShell
        header={{ height: 106 }}
        padding="md"
        styles={{
          main: {
            backgroundColor: '#070b13',
            minHeight: '100vh',
          },
        }}
      >
        <AppShell.Header
          style={{
            backgroundColor: 'rgba(11, 15, 25, 0.98)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 1. Üst Katman: Logo, Ciro Gönder ve Kullanıcı / Sistem Bilgisi (54px) */}
          <div
            style={{
              height: 54,
              borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
            }}
          >
            <Group gap="md">
              <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => setCurrentNav('dashboard')}>
                <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'blue.6', to: 'cyan.5' }}>
                  <IconCar size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={800} size="md" style={{ letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1 }}>
                    WashTrack
                  </Text>
                  <Text size="10px" c="dimmed" style={{ lineHeight: 1 }}>
                    Oto Kuaför Takip Sistemi
                  </Text>
                </div>
              </Group>

              {/* FR-51: Ciroyu Gönder Butonu */}
              <Tooltip label="Bugünkü ciro özetini patronun e-posta adresine gönderir (FR-51–55)">
                <Button
                  variant="light"
                  color="cyan"
                  size="xs"
                  loading={emailSending}
                  onClick={handleSendDailyEmail}
                  leftSection={<IconMail size={15} />}
                  rightSection={
                    <Badge
                      size="xs"
                      color={queueStatus.todaySent ? 'teal' : queueStatus.failedCount > 0 ? 'red' : queueStatus.pendingCount > 0 ? 'yellow' : 'gray'}
                      variant="dot"
                    >
                      {queueStatus.todaySent ? 'Gönderildi' : queueStatus.failedCount > 0 ? 'Hata' : queueStatus.pendingCount > 0 ? 'Kuyrukta' : 'Hazır'}
                    </Badge>
                  }
                  styles={{
                    root: {
                      border: '1px solid rgba(34, 211, 238, 0.25)',
                      backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    },
                  }}
                >
                  Ciroyu Gönder
                </Button>
              </Tooltip>
            </Group>

            {/* Sağ Kısım: Sistem Durumu, Kullanıcı ve Çıkış */}
            <Group gap="sm">
              <Badge
                variant="outline"
                color={dbStatus.status === 'connected' ? 'teal' : 'yellow'}
                leftSection={<IconDatabase size={12} />}
                size="sm"
              >
                SQLite WAL ({dbStatus.tableCount || 20} Tablo)
              </Badge>

              <Badge
                variant="filled"
                color={user?.rol === 'admin' ? 'blue' : 'teal'}
                leftSection={<IconShieldCheck size={12} />}
                size="sm"
              >
                {user?.kullanici_adi} ({user?.rol === 'admin' ? 'Yönetici' : 'Kasa'})
              </Badge>

              <Tooltip label="Oturumu Kapat">
                <Button variant="subtle" color="red" size="xs" leftSection={<IconLogout size={14} />} onClick={logout}>
                  Çıkış
                </Button>
              </Tooltip>
            </Group>
          </div>

          {/* 2. Alt Katman: Ana Menü Navigasyon Butonları (48px) */}
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            <Group gap="xs">
              <Button
                variant={currentNav === 'dashboard' ? 'filled' : 'subtle'}
                color="blue"
                size="xs"
                radius="sm"
                leftSection={<IconLayoutDashboard size={15} />}
                onClick={() => setCurrentNav('dashboard')}
              >
                Panel
              </Button>

              <Button
                variant={currentNav === 'customers' ? 'filled' : 'subtle'}
                color="blue"
                size="xs"
                radius="sm"
                leftSection={<IconUsers size={15} />}
                onClick={() => setCurrentNav('customers')}
              >
                Müşteri & Araç
              </Button>

              {canAccess('services') && (
                <Button
                  variant={currentNav === 'services' ? 'filled' : 'subtle'}
                  color="blue"
                  size="xs"
                  radius="sm"
                  leftSection={<IconWash size={15} />}
                  onClick={() => setCurrentNav('services')}
                >
                  Hizmetler & Fiyat
                </Button>
              )}

              <Button
                variant={currentNav === 'stock' ? 'filled' : 'subtle'}
                color="blue"
                size="xs"
                radius="sm"
                leftSection={<IconPackage size={15} />}
                onClick={() => setCurrentNav('stock')}
              >
                Stok & Malzeme
              </Button>

              {canAccess('finance') && (
                <Button
                  variant={currentNav === 'finance' ? 'filled' : 'subtle'}
                  color="blue"
                  size="xs"
                  radius="sm"
                  leftSection={<IconCoins size={15} />}
                  onClick={() => setCurrentNav('finance')}
                >
                  Finans & Kasa
                </Button>
              )}

              {canAccess('reports') && (
                <Button
                  variant={currentNav === 'reports' ? 'filled' : 'subtle'}
                  color="blue"
                  size="xs"
                  radius="sm"
                  leftSection={<IconChartBar size={15} />}
                  onClick={() => setCurrentNav('reports')}
                >
                  Raporlar
                </Button>
              )}

              {canAccess('settings') && (
                <Button
                  variant={currentNav === 'settings' ? 'filled' : 'subtle'}
                  color="blue"
                  size="xs"
                  radius="sm"
                  leftSection={<IconSettings size={15} />}
                  onClick={() => setCurrentNav('settings')}
                >
                  Ayarlar
                </Button>
              )}
            </Group>
          </div>
        </AppShell.Header>

        <AppShell.Main>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px' }}>
            {currentNav === 'services' && <ServicesPage />}
            {currentNav === 'customers' && <CustomersPage />}
            {currentNav === 'stock' && <StockPage />}
            {currentNav === 'finance' && <FinancePage />}
            {currentNav === 'reports' && <ReportsPage />}
            {currentNav === 'settings' && <SettingsPage />}
            {currentNav === 'dashboard' && <OrdersDashboard />}
          </div>
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
