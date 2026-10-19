import React, { useState, useEffect, useCallback } from 'react';
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
  SimpleGrid,
  Card,
  ThemeIcon,
} from '@mantine/core';
import {
  IconPlus,
  IconCoins,
  IconArrowUpRight,
  IconArrowDownRight,
  IconRotate2,
  IconFilter,
  IconRefresh,
  IconCash,
  IconLock,
  IconCategory,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

export function FinancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('transactions');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({
    totalIncome: 0,
    totalRefund: 0,
    totalExpense: 0,
    netRevenue: 0,
    netProfit: 0,
  });
  const [openSession, setOpenSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtreler
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterTur, setFilterTur] = useState<string>('all');
  const [filterYontem, setFilterYontem] = useState<string>('all');

  // Manuel İşlem Modalı
  const [manualModalOpened, setManualModalOpened] = useState(false);
  const [txTur, setTxTur] = useState<'income' | 'expense'>('expense');
  const [txCategoryId, setTxCategoryId] = useState<string | null>(null);
  const [txTutarTL, setTxTutarTL] = useState<number | string>(100);
  const [txYontem, setTxYontem] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [txAciklama, setTxAciklama] = useState('');

  // Kasa Kapanış Modalı
  const [closeModalOpened, setCloseModalOpened] = useState(false);
  const [sayilanTL, setSayilanTL] = useState<number | string>(0);

  // Yeni Kategori Modalı
  const [newCatModalOpened, setNewCatModalOpened] = useState(false);
  const [catName, setCatName] = useState('');
  const [catTur, setCatTur] = useState<'income' | 'expense'>('expense');

  // Veri yükleme
  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const filters: any = {};
      if (filterStartDate) filters.startDate = `${filterStartDate} 00:00:00`;
      if (filterEndDate) filters.endDate = `${filterEndDate} 23:59:59`;
      if (filterTur !== 'all') filters.tur = filterTur;
      if (filterYontem !== 'all') filters.yontem = filterYontem;

      const [txList, tot, cats, session] = await Promise.all([
        window.electronAPI.invoke('finance:getTransactions', { filters }),
        window.electronAPI.invoke('finance:getNetProfit', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
        window.electronAPI.invoke('finance:getCategories'),
        window.electronAPI.invoke('cash:getOpenSession'),
      ]);

      setTransactions(txList || []);
      setTotals(tot || { totalIncome: 0, totalRefund: 0, totalExpense: 0, netRevenue: 0, netProfit: 0 });
      setCategories(cats || []);
      setOpenSession(session || null);
      if (session) {
        setSayilanTL(Number((session.beklenen_kurus / 100).toFixed(2)));
      }
    } catch (err) {
      console.error('Finans verileri yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStartDate, filterEndDate, filterTur, filterYontem]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manuel İşlem Ekle
  const handleAddManualTransaction = async () => {
    if (!window.electronAPI || !user) return;
    const tutarKurus = Math.round(Number(txTutarTL) * 100);
    if (isNaN(tutarKurus) || tutarKurus <= 0) {
      alert('Geçerli bir tutar giriniz.');
      return;
    }

    try {
      await window.electronAPI.invoke('finance:addTransaction', {
        userId: user.id,
        data: {
          tur: txTur,
          kategori_id: txCategoryId ? parseInt(txCategoryId, 10) : null,
          tutar_kurus: tutarKurus,
          yontem: txYontem,
          aciklama: txAciklama.trim() || null,
        },
      });

      setManualModalOpened(false);
      setTxAciklama('');
      setTxCategoryId(null);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'İşlem eklenirken hata oluştu.');
    }
  };

  // Kasa Kapat
  const handleCloseSession = async () => {
    if (!window.electronAPI || !user || !openSession) return;
    const sayilanKurus = Math.round(Number(sayilanTL) * 100);
    if (isNaN(sayilanKurus) || sayilanKurus < 0) {
      alert('Geçerli bir sayılan kasa tutarı giriniz.');
      return;
    }

    try {
      const res = await window.electronAPI.invoke('finance:closeCashSession', {
        userId: user.id,
        sayilanKurus,
      });

      alert(`Kasa oturumu başarıyla kapatıldı. Fark: ${(res.fark_kurus / 100).toFixed(2)} ₺`);
      setCloseModalOpened(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Kasa kapatılırken hata oluştu.');
    }
  };

  // Yeni Kategori Ekle
  const handleCreateCategory = async () => {
    if (!window.electronAPI) return;
    if (!catName.trim()) {
      alert('Kategori adı zorunludur.');
      return;
    }

    try {
      await window.electronAPI.invoke('finance:createCategory', {
        ad: catName.trim(),
        tur: catTur,
      });
      setNewCatModalOpened(false);
      setCatName('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Kategori oluşturulurken hata oluştu.');
    }
  };

  const getTurBadge = (tur: string) => {
    switch (tur) {
      case 'income':
        return <Badge color="teal" variant="light">Gelir</Badge>;
      case 'refund':
        return <Badge color="orange" variant="light">İade</Badge>;
      case 'expense':
        return <Badge color="red" variant="light">Gider</Badge>;
      default:
        return <Badge color="gray">{tur}</Badge>;
    }
  };

  const getYontemBadge = (yontem: string) => {
    switch (yontem) {
      case 'cash':
        return <Badge color="green" variant="outline">Nakit</Badge>;
      case 'card':
        return <Badge color="blue" variant="outline">Kredi Kartı</Badge>;
      case 'transfer':
        return <Badge color="violet" variant="outline">Havale / EFT</Badge>;
      default:
        return <Badge color="gray">{yontem}</Badge>;
    }
  };

  // Kasa Kapanış fark hesaplama
  const beklenenKurus = openSession ? openSession.beklenen_kurus : 0;
  const girilenSayilanKurus = Math.round(Number(sayilanTL || 0) * 100);
  const hesaplananFarkKurus = girilenSayilanKurus - beklenenKurus;

  return (
    <Stack gap="lg">
      {/* Başlık ve Butonlar */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} c="white">Finans & Kasa Defteri</Title>
          <Text size="sm" c="dimmed">
            Gelir, gider ve iade hareketleri, net kâr hesaplaması ve gün sonu kasa kapanışı (A1, FR-29–34)
          </Text>
        </div>

        <Group gap="xs">
          <Tooltip label="Yenile">
            <ActionIcon variant="light" color="blue" size="lg" onClick={loadData} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>

          {openSession ? (
            <Button
              color="red"
              variant="light"
              leftSection={<IconLock size={16} />}
              onClick={() => setCloseModalOpened(true)}
            >
              Gün Sonu Kasayı Kapat
            </Button>
          ) : (
            <Badge color="yellow" size="lg" variant="light">
              Kasa Kapalı
            </Badge>
          )}

          <Button
            color="teal"
            variant="gradient"
            gradient={{ from: 'teal.6', to: 'cyan.6' }}
            leftSection={<IconPlus size={16} />}
            onClick={() => setManualModalOpened(true)}
          >
            Manuel Gelir / Gider Ekle
          </Button>
        </Group>
      </Group>

      {/* Finansal KPI Kartları (FR-33, FR-35, A1 Formülü: Net Kâr = Gelir - İade - Gider) */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
        <Card p="md" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Toplam Gelir</Text>
            <ThemeIcon size={28} radius="md" color="teal" variant="light">
              <IconArrowUpRight size={16} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={800} c="teal" mt={4}>
            {(totals.totalIncome / 100).toFixed(2)} ₺
          </Text>
        </Card>

        <Card p="md" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Toplam İade</Text>
            <ThemeIcon size={28} radius="md" color="orange" variant="light">
              <IconRotate2 size={16} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={800} c="orange" mt={4}>
            {(totals.totalRefund / 100).toFixed(2)} ₺
          </Text>
        </Card>

        <Card p="md" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Toplam Gider</Text>
            <ThemeIcon size={28} radius="md" color="red" variant="light">
              <IconArrowDownRight size={16} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={800} c="red" mt={4}>
            {(totals.totalExpense / 100).toFixed(2)} ₺
          </Text>
        </Card>

        <Card p="md" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Net Ciro (Gelir - İade)</Text>
            <ThemeIcon size={28} radius="md" color="blue" variant="light">
              <IconCoins size={16} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={800} c="blue" mt={4}>
            {(totals.netRevenue / 100).toFixed(2)} ₺
          </Text>
        </Card>

        <Card p="md" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid #334155' }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Net Kâr</Text>
            <ThemeIcon size={28} radius="md" color={totals.netProfit >= 0 ? 'green' : 'red'} variant="light">
              <IconCash size={16} />
            </ThemeIcon>
          </Group>
          <Text size="xl" fw={800} c={totals.netProfit >= 0 ? 'green' : 'red'} mt={4}>
            {(totals.netProfit / 100).toFixed(2)} ₺
          </Text>
        </Card>
      </SimpleGrid>

      {/* Kasa Durumu Bilgi Şeridi */}
      {openSession && (
        <Paper p="sm" radius="md" style={{ backgroundColor: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.3)' }}>
          <Group justify="space-between">
            <Group gap="sm">
              <ThemeIcon color="teal" size={32} radius="md">
                <IconCash size={18} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={700} c="teal">
                  Aktif Kasa Oturumu #{openSession.id} Açık
                </Text>
                <Text size="xs" c="dimmed">
                  Açılış Tutarı: {(openSession.acilis_kurus / 100).toFixed(2)} ₺ • Açılış Zamanı: {openSession.tarih}
                </Text>
              </div>
            </Group>
            <Group gap="xs">
              <Text size="sm" c="dimmed">Beklenen Nakit Kasa:</Text>
              <Badge color="teal" size="lg" variant="filled">
                {(openSession.beklenen_kurus / 100).toFixed(2)} ₺
              </Badge>
            </Group>
          </Group>
        </Paper>
      )}

      {/* Sekmeler: Defter vs Kategoriler */}
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'transactions')} color="blue" variant="outline">
        <Tabs.List>
          <Tabs.Tab value="transactions" leftSection={<IconCoins size={16} />}>
            İşlem Defteri ({transactions.length})
          </Tabs.Tab>
          <Tabs.Tab value="categories" leftSection={<IconCategory size={16} />}>
            Kategoriler ({categories.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="transactions" pt="md">
          <Stack gap="md">
            {/* Filtre Barı */}
            <Paper p="sm" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid #334155' }}>
              <Group gap="sm" wrap="wrap">
                <Group gap="xs">
                  <IconFilter size={16} color="#94a3b8" />
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">Filtrele:</Text>
                </Group>

                <TextInput
                  placeholder="Başlangıç Tarihi"
                  type="date"
                  size="xs"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />

                <TextInput
                  placeholder="Bitiş Tarihi"
                  type="date"
                  size="xs"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />

                <Select
                  size="xs"
                  placeholder="İşlem Türü"
                  data={[
                    { value: 'all', label: 'Tüm Türler' },
                    { value: 'income', label: 'Gelirler' },
                    { value: 'refund', label: 'İadeler' },
                    { value: 'expense', label: 'Giderler' },
                  ]}
                  value={filterTur}
                  onChange={(val) => setFilterTur(val || 'all')}
                />

                <Select
                  size="xs"
                  placeholder="Ödeme Yöntemi"
                  data={[
                    { value: 'all', label: 'Tüm Yöntemler' },
                    { value: 'cash', label: 'Nakit' },
                    { value: 'card', label: 'Kredi Kartı' },
                    { value: 'transfer', label: 'Havale / EFT' },
                  ]}
                  value={filterYontem}
                  onChange={(val) => setFilterYontem(val || 'all')}
                />

                {(filterStartDate || filterEndDate || filterTur !== 'all' || filterYontem !== 'all') && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterTur('all');
                      setFilterYontem('all');
                    }}
                  >
                    Filtreleri Temizle
                  </Button>
                )}
              </Group>
            </Paper>

            {/* Hareketler Tablosu */}
            <Paper radius="md" withBorder style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', borderColor: '#334155', overflow: 'hidden' }}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Tarih</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Tür</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Kategori</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Yöntem</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Kaynak</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Açıklama</Text></Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={700} c="dimmed">Tutar</Text></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transactions.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                        <Text c="dimmed">Filtrelere uygun işlem kaydı bulunamadı.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    transactions.map((tx) => (
                      <Table.Tr key={tx.id}>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{tx.tarih}</Text>
                        </Table.Td>
                        <Table.Td>
                          {getTurBadge(tx.tur)}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={500} c="white">{tx.kategori_ad || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          {getYontemBadge(tx.yontem)}
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="dot" color={tx.kaynak_tur === 'payment' ? 'teal' : tx.kaynak_tur === 'purchase' ? 'blue' : 'gray'}>
                            {tx.kaynak_tur === 'payment' ? 'Tahsilat' : tx.kaynak_tur === 'purchase' ? 'Stok Alımı' : 'Manuel Giriş'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{tx.aciklama || '—'}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text
                            size="sm"
                            fw={700}
                            c={tx.tur === 'income' ? 'teal' : tx.tur === 'refund' ? 'orange' : 'red'}
                          >
                            {tx.tur === 'income' ? '+' : '-'} {(tx.tutar_kurus / 100).toFixed(2)} ₺
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="categories" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Gelir ve Giderleri sınıflandırmak için kategorileri tanımlayabilirsiniz.</Text>
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconPlus size={14} />}
                onClick={() => setNewCatModalOpened(true)}
              >
                Yeni Kategori Ekle
              </Button>
            </Group>

            <Paper radius="md" withBorder style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', borderColor: '#334155' }}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">ID</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Kategori Adı</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Tür</Text></Table.Th>
                    <Table.Th><Text size="xs" fw={700} c="dimmed">Varsayılan</Text></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {categories.map((cat) => (
                    <Table.Tr key={cat.id}>
                      <Table.Td><Text size="xs" c="dimmed">#{cat.id}</Text></Table.Td>
                      <Table.Td><Text size="sm" fw={600} c="white">{cat.ad}</Text></Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={cat.tur === 'income' ? 'teal' : 'red'}>
                          {cat.tur === 'income' ? 'Gelir' : 'Gider'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {cat.varsayilan ? (
                          <Badge size="xs" color="blue" variant="dot">Sistem Varsayılanı</Badge>
                        ) : (
                          <Text size="xs" c="dimmed">Özel</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Manuel Gelir / Gider Ekle Modalı */}
      <Modal
        opened={manualModalOpened}
        onClose={() => setManualModalOpened(false)}
        title={<Text fw={700} size="lg">Manuel İşlem Girişi</Text>}
        centered
        styles={{ content: { backgroundColor: '#0f172a', border: '1px solid #334155' } }}
      >
        <Stack gap="md">
          <Select
            label="İşlem Türü"
            data={[
              { value: 'expense', label: 'Gider (Elektrik, Su, Kira, Yemek vb.)' },
              { value: 'income', label: 'Ekstra Gelir (Hurda satışı vb.)' },
            ]}
            value={txTur}
            onChange={(val) => {
              setTxTur((val as 'income' | 'expense') || 'expense');
              setTxCategoryId(null);
            }}
          />

          <Select
            label="Kategori"
            placeholder="Kategori seçiniz (opsiyonel)"
            data={categories
              .filter((c) => c.tur === txTur)
              .map((c) => ({ value: c.id.toString(), label: c.ad }))}
            value={txCategoryId}
            onChange={setTxCategoryId}
            clearable
          />

          <NumberInput
            label="Tutar (₺)"
            min={1}
            value={txTutarTL}
            onChange={setTxTutarTL}
            decimalScale={2}
            fixedDecimalScale
          />

          <Select
            label="Ödeme / Tahsilat Yöntemi"
            data={[
              { value: 'cash', label: 'Nakit (Kasayı Etkiler)' },
              { value: 'card', label: 'Kredi Kartı / POS' },
              { value: 'transfer', label: 'Banka / Havale' },
            ]}
            value={txYontem}
            onChange={(val) => setTxYontem((val as any) || 'cash')}
          />

          {txYontem === 'cash' && !openSession && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              Açık kasa oturumu bulunmuyor. Nakit işlem yapabilmek için önce kasa açılışı yapılmalıdır.
            </Alert>
          )}

          <TextInput
            label="Açıklama"
            placeholder="İşlem detayı giriniz"
            value={txAciklama}
            onChange={(e) => setTxAciklama(e.target.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setManualModalOpened(false)}>
              İptal
            </Button>
            <Button
              color={txTur === 'income' ? 'teal' : 'red'}
              onClick={handleAddManualTransaction}
              disabled={txYontem === 'cash' && !openSession}
            >
              Kaydet
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Gün Sonu Kasa Kapanış Modalı (FR-32, P3) */}
      <Modal
        opened={closeModalOpened}
        onClose={() => setCloseModalOpened(false)}
        title={<Text fw={700} size="lg">Gün Sonu Kasa Kapanışı</Text>}
        centered
        styles={{ content: { backgroundColor: '#0f172a', border: '1px solid #334155' } }}
      >
        <Stack gap="md">
          <Alert color="blue" icon={<IconCash size={16} />}>
            Kasada fiziki olarak bulunan parayı sayıp giriniz. Sistem beklenen nakit kasa ile karşılaştırıp farkı kaydedecektir (A1).
          </Alert>

          <Paper p="sm" radius="md" style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)' }}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Sistemde Beklenen Nakit Kasa:</Text>
              <Text size="lg" fw={800} c="white">
                {(beklenenKurus / 100).toFixed(2)} ₺
              </Text>
            </Group>
          </Paper>

          <NumberInput
            label="Fiziki Sayılan Nakit Kasa (₺)"
            description="Kasadaki paranın toplam sayım sonucu"
            min={0}
            value={sayilanTL}
            onChange={setSayilanTL}
            decimalScale={2}
            fixedDecimalScale
          />

          {/* Canlı Fark Göstergesi */}
          <Paper
            p="sm"
            radius="md"
            style={{
              backgroundColor: hesaplananFarkKurus === 0
                ? 'rgba(16, 185, 129, 0.1)'
                : hesaplananFarkKurus < 0
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${
                hesaplananFarkKurus === 0
                  ? 'rgba(16, 185, 129, 0.4)'
                  : hesaplananFarkKurus < 0
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'rgba(59, 130, 246, 0.4)'
              }`,
            }}
          >
            <Group justify="space-between">
              <Text size="sm" fw={600} c={hesaplananFarkKurus === 0 ? 'green' : hesaplananFarkKurus < 0 ? 'red' : 'blue'}>
                {hesaplananFarkKurus === 0
                  ? 'Kasa Tam (Fark Yok)'
                  : hesaplananFarkKurus < 0
                  ? 'Kasa Açığı (Eksik)'
                  : 'Kasa Fazlası'}
              </Text>
              <Text size="lg" fw={800} c={hesaplananFarkKurus === 0 ? 'green' : hesaplananFarkKurus < 0 ? 'red' : 'blue'}>
                {(hesaplananFarkKurus / 100).toFixed(2)} ₺
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setCloseModalOpened(false)}>
              Vazgeç
            </Button>
            <Button color="red" leftSection={<IconCheck size={16} />} onClick={handleCloseSession}>
              Kasayı Kapat ve Kaydet
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Yeni Kategori Modalı */}
      <Modal
        opened={newCatModalOpened}
        onClose={() => setNewCatModalOpened(false)}
        title={<Text fw={700} size="lg">Yeni Kategori Ekle</Text>}
        centered
        styles={{ content: { backgroundColor: '#0f172a', border: '1px solid #334155' } }}
      >
        <Stack gap="md">
          <TextInput
            label="Kategori Adı"
            placeholder="Örn: Kırtasiye, İkramlar, Tamirat"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />

          <Select
            label="Tür"
            data={[
              { value: 'expense', label: 'Gider' },
              { value: 'income', label: 'Gelir' },
            ]}
            value={catTur}
            onChange={(val) => setCatTur((val as 'income' | 'expense') || 'expense')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setNewCatModalOpened(false)}>
              İptal
            </Button>
            <Button color="blue" onClick={handleCreateCategory}>
              Oluştur
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
