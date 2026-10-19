import React, { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Table,
  Badge,
  Group,
  Stack,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Tabs,
  ActionIcon,
  Tooltip,
  Alert,
  PasswordInput,
} from '@mantine/core';
import {
  IconPlus,
  IconBuildingStore,
  IconUsers,
  IconUserPlus,
  IconCheck,
  IconX,
  IconShieldCheck,
  IconDatabase,
  IconDownload,
  IconUpload,
  IconAlertTriangle,
  IconAlertCircle,
  IconMail,
  IconSend,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>('business');

  // İşletme Ayarları
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [discountLimit, setDiscountLimit] = useState<number>(10);
  const [businessSaved, setBusinessSaved] = useState(false);

  // Kullanıcılar
  const [usersList, setUsersList] = useState<any[]>([]);
  const [addUserOpened, setAddUserOpened] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'cashier' | 'washer'>('cashier');

  // Personel
  const [staffList, setStaffList] = useState<any[]>([]);
  const [addStaffOpened, setAddStaffOpened] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffCommission, setStaffCommission] = useState<number>(10);

  // Yedekleme & Geri Yükleme
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [restorePath, setRestorePath] = useState('');

  // SMTP E-Posta Ayarları (FR-54)
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpRecipient, setSmtpRecipient] = useState('');
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    if (!user || !window.electronAPI) return;
    setBackupLoading(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const res = await window.electronAPI.invoke('backup:create', { userId: user.id });
      if (res.success) {
        setBackupMessage(`Yedek başarıyla alındı: ${res.filePath}`);
      }
    } catch (err: any) {
      setBackupError(err.message || 'Yedek alınamadı.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!user || !window.electronAPI || !restorePath.trim()) return;
    if (!confirm('DİKKAT: Veritabanı geri yüklenmeden önce mevcut canlı verilerin otomatik güvenlik yedeği alınacaktır. Onaylıyor musunuz?')) {
      return;
    }
    setBackupLoading(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const res = await window.electronAPI.invoke('backup:restore', {
        userId: user.id,
        backupFilePath: restorePath.trim(),
      });
      if (res.success) {
        setBackupMessage(`Veritabanı başarıyla geri yüklendi! Güvenlik yedeği: ${res.autoSafetyBackup}`);
        fetchData();
      }
    } catch (err: any) {
      setBackupError(err.message || 'Geri yükleme başarısız.');
    } finally {
      setBackupLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      if (window.electronAPI) {
        const [settingsRes, usersRes, staffRes, emailConfig] = await Promise.all([
          window.electronAPI.invoke('settings:get'),
          window.electronAPI.invoke('auth:getUsers'),
          window.electronAPI.invoke('staff:getAll'),
          window.electronAPI.invoke('email:getConfig'),
        ]);

        if (settingsRes) {
          setBusinessName(settingsRes.isletme_adi || '');
          setBusinessAddress(settingsRes.isletme_adresi || '');
          setBusinessPhone(settingsRes.isletme_telefon || '');
          setDiscountLimit(Number(settingsRes.indirim_ust_limit) || 10);
        }

        if (usersRes) setUsersList(usersRes);
        if (staffRes) setStaffList(staffRes);

        if (emailConfig) {
          setSmtpHost(emailConfig.host || 'smtp.gmail.com');
          setSmtpPort(emailConfig.port || 587);
          setSmtpSecure(!!emailConfig.secure);
          setSmtpUser(emailConfig.user || '');
          setSmtpRecipient(emailConfig.recipient || '');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSmtp = async () => {
    if (!user || !window.electronAPI) return;
    try {
      await window.electronAPI.invoke('email:updateConfig', {
        userId: user.id,
        config: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: smtpUser,
          password: smtpPassword,
          recipient: smtpRecipient,
        },
      });
      setSmtpSaved(true);
      setSmtpPassword(''); // Şifre alanını temizle
      setTimeout(() => setSmtpSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'SMTP ayarları kaydedilemedi.');
    }
  };

  const handleSendTestEmail = async () => {
    if (!user || !window.electronAPI) return;
    setTestSending(true);
    setTestMessage(null);
    setTestError(null);
    try {
      // Formdaki güncel bilgileri test öncesi otomatik kaydet
      await window.electronAPI.invoke('email:updateConfig', {
        userId: user.id,
        config: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: smtpUser,
          password: smtpPassword,
          recipient: smtpRecipient,
        },
      });

      const res = await window.electronAPI.invoke('email:sendTest', {
        userId: user.id,
        testRecipient: smtpRecipient,
      });
      if (res.success) {
        setTestMessage(res.message);
      }
    } catch (err: any) {
      setTestError(err.message || 'Test maili gönderilemedi.');
    } finally {
      setTestSending(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveBusiness = async () => {
    if (!user) return;
    try {
      await window.electronAPI.invoke('settings:updateBusiness', {
        userId: user.id,
        data: {
          isletme_adi: businessName,
          isletme_adresi: businessAddress,
          isletme_telefon: businessPhone,
          indirim_ust_limit: String(discountLimit),
        },
      });
      setBusinessSaved(true);
      setTimeout(() => setBusinessSaved(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUser = async () => {
    if (!user || !newUsername || !newPassword) return;
    try {
      await window.electronAPI.invoke('auth:createUser', {
        adminUserId: user.id,
        data: {
          kullanici_adi: newUsername,
          sifre: newPassword,
          rol: newRole,
        },
      });
      setAddUserOpened(false);
      setNewUsername('');
      setNewPassword('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleUserActive = async (targetUser: any) => {
    if (!user) return;
    if (targetUser.kullanici_adi === 'admin') {
      alert('Ana yönetici hesabı pasife alınamaz.');
      return;
    }
    try {
      await window.electronAPI.invoke('auth:updateUser', {
        adminUserId: user.id,
        targetUserId: targetUser.id,
        data: { aktif: !targetUser.aktif },
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateStaff = async () => {
    if (!user || !staffName) return;
    try {
      await window.electronAPI.invoke('staff:create', {
        userId: user.id,
        data: {
          ad: staffName,
          telefon: staffPhone,
          prim_orani: staffCommission,
        },
      });
      setAddStaffOpened(false);
      setStaffName('');
      setStaffPhone('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStaffActive = async (st: any) => {
    if (!user) return;
    try {
      await window.electronAPI.invoke('staff:update', {
        userId: user.id,
        id: st.id,
        data: { aktif: !st.aktif },
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} c="white">
          Sistem ve İşletme Ayarları
        </Title>
        <Text size="sm" c="dimmed">
          İşletme kimliği, kullanıcı yetkileri ve personel prim oranları (FR-42, FR-44, FR-46).
        </Text>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" color="blue">
        <Tabs.List mb="md">
          <Tabs.Tab value="business" leftSection={<IconBuildingStore size={16} />}>
            İşletme Bilgileri (FR-46)
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
            Kullanıcı Hesapları (FR-42, FR-43)
          </Tabs.Tab>
          <Tabs.Tab value="staff" leftSection={<IconUserPlus size={16} />}>
            Yıkama Personeli Kartları (FR-44)
          </Tabs.Tab>
          <Tabs.Tab value="backup" leftSection={<IconDatabase size={16} />}>
            Yedekleme & Geri Yükleme (FR-47, FR-48, B7)
          </Tabs.Tab>
          <Tabs.Tab value="smtp" leftSection={<IconMail size={16} />}>
            Ciro E-Postası (FR-54)
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: İşletme Bilgileri */}
        <Tabs.Panel value="business">
          <Paper
            p="xl"
            radius="md"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(51, 65, 85, 0.4)',
              maxWidth: 680,
            }}
          >
            <Stack gap="md">
              {businessSaved && (
                <Alert color="green" icon={<IconCheck size={16} />} radius="md">
                  İşletme bilgileri ve yetki limitleri başarıyla kaydedildi.
                </Alert>
              )}

              <TextInput
                label="İşletme Adı"
                placeholder="Örn: WashTrack Oto Kuaför"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />

              <TextInput
                label="İşletme Telefonu"
                placeholder="05xx xxx xx xx"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />

              <TextInput
                label="İşletme Adresi"
                placeholder="Adres bilgisi..."
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
              />

              <NumberInput
                label="Kasa İndirim Üst Limiti (%)"
                description="Kasa rolünün Yönetici onayı olmadan uygulayabileceği maksimum indirim yüzdesi (Varsayılan %10 - B5 kuralı)."
                value={discountLimit}
                onChange={(val) => setDiscountLimit(Number(val) || 10)}
                min={0}
                max={50}
                suffix="%"
              />

              <Group justify="flex-end" mt="md">
                <Button color="blue" onClick={handleSaveBusiness}>
                  Bilgileri Kaydet
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Tab 2: Kullanıcı Hesapları */}
        <Tabs.Panel value="users">
          <Paper
            p="md"
            radius="md"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            <Group justify="space-between" mb="md">
              <Text fw={700} size="md" c="white">
                Sisteme Giriş Yapan Kullanıcılar
              </Text>
              <Button size="xs" color="blue" leftSection={<IconPlus size={14} />} onClick={() => setAddUserOpened(true)}>
                Yeni Kullanıcı Ekle
              </Button>
            </Group>

            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Kullanıcı Adı</Table.Th>
                  <Table.Th>Rol</Table.Th>
                  <Table.Th>Durum</Table.Th>
                  <Table.Th>İlk Giriş Şifre Zorunluluğu</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>İşlemler</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {usersList.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td fw={700} c="white">
                      {u.kullanici_adi}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={u.rol === 'admin' ? 'blue' : u.rol === 'cashier' ? 'teal' : 'gray'}
                        variant="light"
                      >
                        {u.rol === 'admin' ? 'Yönetici' : u.rol === 'cashier' ? 'Kasa / Resepsiyon' : 'Personel'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={u.aktif ? 'green' : 'red'} variant="dot">
                        {u.aktif ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {u.ilkgiris_sifre_degistir ? (
                        <Badge color="yellow" size="xs">
                          Zorunlu Değişim (P7)
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">
                          Normal
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {u.kullanici_adi !== 'admin' && (
                        <Tooltip label={u.aktif ? 'Pasife Al' : 'Aktif Et'}>
                          <ActionIcon
                            variant="subtle"
                            color={u.aktif ? 'yellow' : 'green'}
                            onClick={() => handleToggleUserActive(u)}
                          >
                            {u.aktif ? <IconX size={16} /> : <IconCheck size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* Tab 3: Yıkama Personeli */}
        <Tabs.Panel value="staff">
          <Paper
            p="md"
            radius="md"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            <Group justify="space-between" mb="md">
              <Text fw={700} size="md" c="white">
                Yıkama Personeli Kartları (FR-44)
              </Text>
              <Button size="xs" color="blue" leftSection={<IconPlus size={14} />} onClick={() => setAddStaffOpened(true)}>
                Yeni Personel Ekle
              </Button>
            </Group>

            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Personel Adı</Table.Th>
                  <Table.Th>Telefon</Table.Th>
                  <Table.Th>Prim Oranı (%)</Table.Th>
                  <Table.Th>Durum</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>İşlemler</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {staffList.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                      Henüz personel kartı tanımlanmamış. "Yeni Personel Ekle" butonuyla ekleyin.
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  staffList.map((st) => (
                    <Table.Tr key={st.id}>
                      <Table.Td fw={700} c="white">
                        {st.ad}
                      </Table.Td>
                      <Table.Td>{st.telefon || '-'}</Table.Td>
                      <Table.Td>%{st.prim_orani}</Table.Td>
                      <Table.Td>
                        <Badge color={st.aktif ? 'green' : 'gray'} variant="light">
                          {st.aktif ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Tooltip label={st.aktif ? 'Pasife Al' : 'Aktif Et'}>
                          <ActionIcon
                            variant="subtle"
                            color={st.aktif ? 'yellow' : 'green'}
                            onClick={() => handleToggleStaffActive(st)}
                          >
                            {st.aktif ? <IconX size={16} /> : <IconCheck size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* Tab 4: Yedekleme & Geri Yükleme (FR-47, FR-48, B7) */}
        <Tabs.Panel value="backup">
          <Paper
            p="xl"
            radius="md"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(51, 65, 85, 0.4)',
              maxWidth: 720,
            }}
          >
            <Stack gap="lg">
              <div>
                <Title order={3} c="white">
                  Veritabanı Yedekleme ve Geri Yükleme
                </Title>
                <Text size="sm" c="dimmed">
                  SQLite WAL moduna tam uyumlu atomik (.backup() API) yedekleme altyapısı (B7).
                </Text>
              </div>

              {backupMessage && (
                <Alert color="teal" icon={<IconCheck size={16} />}>
                  {backupMessage}
                </Alert>
              )}

              {backupError && (
                <Alert color="red" icon={<IconAlertCircle size={16} />}>
                  {backupError}
                </Alert>
              )}

              {/* Yedek Al Bölümü */}
              <Paper p="md" radius="md" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155' }}>
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={700} c="white">1. Veritabanı Yedeği Al (FR-47)</Text>
                    <Text size="xs" c="dimmed">
                      Aktif veritabanını çalışan sistemi durdurmadan atomik olarak yedekler.
                    </Text>
                  </div>
                  <Button
                    color="teal"
                    leftSection={<IconDownload size={16} />}
                    loading={backupLoading}
                    onClick={handleCreateBackup}
                  >
                    Şimdi Yedek Al
                  </Button>
                </Group>
              </Paper>

              {/* Geri Yükle Bölümü */}
              <Paper p="md" radius="md" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155' }}>
                <Stack gap="sm">
                  <div>
                    <Text fw={700} c="white">2. Yedekten Geri Yükle (Restore - FR-48, B7, AC-12)</Text>
                    <Text size="xs" c="dimmed">
                      Harici USB veya yerel diskteki bir .db dosyasından geri yükler. Geri yükleme öncesinde mevcut canlı veritabanının otomatik güvenlik yedeği alınır.
                    </Text>
                  </div>

                  <TextInput
                    label="Geri Yüklenecek Yedek Dosyası Yolu (.db)"
                    placeholder="Örn: C:\WashTrack_Backups\washtrack_backup.db"
                    value={restorePath}
                    onChange={(e) => setRestorePath(e.currentTarget.value)}
                    styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
                  />

                  <Group justify="flex-end">
                    <Button
                      color="red"
                      variant="light"
                      leftSection={<IconUpload size={16} />}
                      loading={backupLoading}
                      disabled={!restorePath.trim()}
                      onClick={handleRestoreBackup}
                    >
                      Yedeği Geri Yükle
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Tab 5: Ciro E-Postası ve SMTP Ayarları (FR-54) */}
        <Tabs.Panel value="smtp">
          <Paper
            p="xl"
            radius="md"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(51, 65, 85, 0.4)',
              maxWidth: 680,
            }}
          >
            <Stack gap="md">
              <div>
                <Title order={4} c="white">Ciro E-Postası ve SMTP Yapılandırması</Title>
                <Text size="xs" c="dimmed">
                  Gün sonu ciro özetinin patronun e-posta adresine iletilmesi için SMTP ayarları (FR-51–55).
                </Text>
              </div>

              {smtpSaved && (
                <Alert color="green" icon={<IconCheck size={16} />} radius="md">
                  SMTP e-posta ayarları başarıyla kaydedildi.
                </Alert>
              )}

              {testMessage && (
                <Alert color="green" icon={<IconCheck size={16} />} radius="md">
                  {testMessage}
                </Alert>
              )}

              {testError && (
                <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
                  {testError}
                </Alert>
              )}

              <TextInput
                label="SMTP Sunucusu (Host)"
                placeholder="Örn: smtp.gmail.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                required
              />

              <Group grow>
                <NumberInput
                  label="SMTP Portu"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(val) => setSmtpPort(Number(val) || 587)}
                  required
                />
                <Select
                  label="Güvenlik Protokolü"
                  data={[
                    { value: 'false', label: 'STARTTLS (Port 587)' },
                    { value: 'true', label: 'SSL / TLS (Port 465)' },
                  ]}
                  value={smtpSecure ? 'true' : 'false'}
                  onChange={(val) => setSmtpSecure(val === 'true')}
                />
              </Group>

              <TextInput
                label="Gönderici E-Posta Adresi (Kullanıcı Adı)"
                placeholder="ornek@gmail.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                required
              />

              <PasswordInput
                label="Gönderici E-Posta Şifresi (Uygulama Şifresi)"
                description="Güvenlik: Şifre Windows DPAPI (Electron safeStorage) ile şifrelenerek saklanır (FR-54)."
                placeholder={smtpUser ? 'Yeni şifre girmek için yazın...' : 'Şifre'}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
              />

              <TextInput
                label="Alıcı E-Posta Adresi (Patronun Adresi)"
                description="Ciro raporunun iletileceği hedef e-posta adresi."
                placeholder="patron@gmail.com"
                value={smtpRecipient}
                onChange={(e) => setSmtpRecipient(e.target.value)}
                required
              />

              <Group justify="space-between" mt="md">
                <Button
                  variant="light"
                  color="cyan"
                  leftSection={<IconSend size={16} />}
                  loading={testSending}
                  disabled={!smtpUser || !smtpRecipient}
                  onClick={handleSendTestEmail}
                >
                  Test E-Postası Gönder
                </Button>

                <Button color="blue" onClick={handleSaveSmtp}>
                  Ayarları Kaydet
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Kullanıcı Ekle Modalı */}
      <Modal opened={addUserOpened} onClose={() => setAddUserOpened(false)} title="Yeni Kullanıcı Ekle" centered>
        <Stack gap="md">
          <TextInput
            label="Kullanıcı Adı"
            required
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <PasswordInput
            label="Şifre / PIN"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Select
            label="Rol"
            data={[
              { value: 'admin', label: 'Yönetici (Tam Yetki)' },
              { value: 'cashier', label: 'Kasa / Resepsiyon' },
              { value: 'washer', label: 'Yıkama Personeli' },
            ]}
            value={newRole}
            onChange={(val) => setNewRole(val as any)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setAddUserOpened(false)}>
              İptal
            </Button>
            <Button color="blue" onClick={handleCreateUser}>
              Kullanıcıyı Kaydet
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Personel Ekle Modalı */}
      <Modal opened={addStaffOpened} onClose={() => setAddStaffOpened(false)} title="Yeni Personel Ekle" centered>
        <Stack gap="md">
          <TextInput
            label="Personel Adı Soyadı"
            required
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
          />
          <TextInput
            label="Telefon Numarası"
            value={staffPhone}
            onChange={(e) => setStaffPhone(e.target.value)}
          />
          <NumberInput
            label="Prim Oranı (%)"
            description="Yıkama başına hesaplanacak prim yüzdesi (opsiyonel)"
            value={staffCommission}
            onChange={(val) => setStaffCommission(Number(val) || 0)}
            min={0}
            max={100}
            suffix="%"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setAddStaffOpened(false)}>
              İptal
            </Button>
            <Button color="blue" onClick={handleCreateStaff}>
              Personeli Kaydet
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
