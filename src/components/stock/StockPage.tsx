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
  Checkbox,
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
  IconAlertTriangle,
  IconPackage,
  IconShoppingCartPlus,
  IconFlame,
  IconHistory,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

export function StockPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modallar
  const [newProductModal, setNewProductModal] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [manualModal, setManualModal] = useState(false);

  // Yeni Ürün Formu
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodUnit, setProdUnit] = useState<'lt' | 'kg' | 'piece'>('lt');
  const [prodCritical, setProdCritical] = useState<number | string>(5);

  // Satın Alma Formu
  const [purchaseProductId, setPurchaseProductId] = useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<number | string>(10);
  const [purchaseTotalTL, setPurchaseTotalTL] = useState<number | string>(500);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<string | null>(null);
  const [purchaseCreateExpense, setPurchaseCreateExpense] = useState(true);

  // Fire / Düzeltme Formu
  const [manualProductId, setManualProductId] = useState<string | null>(null);
  const [manualType, setManualType] = useState<'waste' | 'audit'>('waste');
  const [manualAmount, setManualAmount] = useState<number | string>(1);
  const [manualDesc, setManualDesc] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const [prods, movs, supps] = await Promise.all([
        window.electronAPI.invoke('stock:getAllProducts'),
        window.electronAPI.invoke('stock:getMovements', { limit: 50 }),
        window.electronAPI.invoke('stock:getSuppliers'),
      ]);
      setProducts(prods || []);
      setMovements(movs || []);
      setSuppliers(supps || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Yeni Ürün Kaydet
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      setFormError('Lütfen ürün adını girin.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('stock:createProduct', {
          userId: user?.id,
          data: {
            ad: prodName.trim(),
            kategori: prodCategory.trim() || undefined,
            birim: prodUnit,
            kritik_seviye: Number(prodCritical) || 0,
          },
        });
      }
      setNewProductModal(false);
      setProdName('');
      setProdCategory('');
      loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Ürün eklenirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Satın Alma Kaydet
  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseProductId) {
      setFormError('Lütfen ürün seçin.');
      return;
    }

    const qty = Number(purchaseAmount);
    const totalTL = Number(purchaseTotalTL);
    if (qty <= 0 || totalTL <= 0) {
      setFormError('Miktar ve tutar sıfırdan büyük olmalıdır.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('stock:addPurchase', {
          userId: user?.id,
          data: {
            urun_id: parseInt(purchaseProductId, 10),
            miktar: qty,
            toplam_tutar_kurus: Math.round(totalTL * 100),
            supplier_id: purchaseSupplierId ? parseInt(purchaseSupplierId, 10) : undefined,
            createExpense: purchaseCreateExpense,
          },
        });
      }
      setPurchaseModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Satın alma kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fire / Sayım Kaydet
  const handleManualMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProductId) {
      setFormError('Lütfen ürün seçin.');
      return;
    }

    const qty = Number(manualAmount);
    if (qty <= 0) {
      setFormError('Miktar sıfırdan büyük olmalıdır.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('stock:recordMovement', {
          userId: user?.id,
          data: {
            urun_id: parseInt(manualProductId, 10),
            tur: manualType,
            miktar: qty,
            aciklama: manualDesc.trim() || undefined,
          },
        });
      }
      setManualModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err?.message || 'İşlem kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Kritik Stok Sayısı
  const criticalCount = products.filter((p) => p.mevcut_miktar <= p.kritik_seviye).length;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} c="white">
            Stok & Malzeme Yönetimi
          </Title>
          <Text size="sm" c="dimmed">
            Ürün kartları, otomatik reçete tüketimi ve satın alma takibi (FR-19 - FR-26).
          </Text>
        </div>

        <Group gap="xs">
          <Tooltip label="Yenile">
            <ActionIcon variant="light" color="blue" size="lg" onClick={loadData} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>

          <Button
            leftSection={<IconFlame size={16} />}
            color="red"
            variant="light"
            onClick={() => {
              setFormError(null);
              setManualModal(true);
            }}
          >
            Fire / Sayım
          </Button>

          <Button
            leftSection={<IconShoppingCartPlus size={16} />}
            color="teal"
            variant="light"
            onClick={() => {
              setFormError(null);
              setPurchaseModal(true);
            }}
          >
            Stok Girişi (Satın Alma)
          </Button>

          <Button
            leftSection={<IconPlus size={16} />}
            color="blue"
            onClick={() => {
              setFormError(null);
              setNewProductModal(true);
            }}
          >
            Yeni Ürün Ekle
          </Button>
        </Group>
      </Group>

      {/* Kritik Stok Uyarısı Banner */}
      {criticalCount > 0 && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title={`Kritik Stok Uyarısı (${criticalCount} Ürün)`}
          styles={{ root: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' } }}
        >
          Aşağıdaki ürünlerin stok miktarı belirlenen kritik seviyenin altına düşmüştür. Lütfen tedarik siparişi veriniz.
        </Alert>
      )}

      {/* Sekmeler */}
      <Tabs value={activeTab} onChange={(val) => val && setActiveTab(val)} variant="pills" color="blue">
        <Tabs.List mb="md">
          <Tabs.Tab value="products">
            Stok Kartları ({products.length})
          </Tabs.Tab>
          <Tabs.Tab value="movements">
            Hareket Geçmişi ({movements.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Ürün Kartları */}
        <Tabs.Panel value="products">
          <Paper
            p="md"
            radius="md"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Ürün Adı</Table.Th>
                  <Table.Th>Kategori</Table.Th>
                  <Table.Th>Birim</Table.Th>
                  <Table.Th>Mevcut Stok</Table.Th>
                  <Table.Th>Kritik Seviye</Table.Th>
                  <Table.Th>Ort. Maliyet</Table.Th>
                  <Table.Th>Durum</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} ta="center" c="dimmed">
                      Henüz kayıtlı stok ürünü bulunmuyor.
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  products.map((p) => {
                    const isCritical = p.mevcut_miktar <= p.kritik_seviye;
                    return (
                      <Table.Tr key={p.id}>
                        <Table.Td fw={700} c="white">
                          {p.ad}
                        </Table.Td>
                        <Table.Td c="dimmed">{p.kategori || '-'}</Table.Td>
                        <Table.Td>
                          <Badge variant="outline" color="gray" size="sm">
                            {p.birim}
                          </Badge>
                        </Table.Td>
                        <Table.Td fw={800} c={isCritical ? 'red' : 'teal'}>
                          {Number(p.mevcut_miktar).toFixed(2)} {p.birim}
                        </Table.Td>
                        <Table.Td c="dimmed">
                          {p.kritik_seviye} {p.birim}
                        </Table.Td>
                        <Table.Td>
                          {(p.ort_maliyet_kurus / 100).toFixed(2)} ₺ / {p.birim}
                        </Table.Td>
                        <Table.Td>
                          {isCritical ? (
                            <Badge color="red" variant="filled">
                              Kritik
                            </Badge>
                          ) : (
                            <Badge color="teal" variant="light">
                              Yeterli
                            </Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* Tab 2: Hareket Geçmişi */}
        <Tabs.Panel value="movements">
          <Paper
            p="md"
            radius="md"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Zaman</Table.Th>
                  <Table.Th>Ürün</Table.Th>
                  <Table.Th>Hareket Türü</Table.Th>
                  <Table.Th>Kaynak</Table.Th>
                  <Table.Th>Miktar</Table.Th>
                  <Table.Th>Tedarikçi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {movements.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} ta="center" c="dimmed">
                      Henüz stok hareketi kaydedilmemiş.
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  movements.map((m) => {
                    const mov = m.movement;
                    const dateStr = new Date(mov.zaman).toLocaleString('tr-TR');

                    let badgeColor = 'blue';
                    let typeLabel = mov.tur;
                    if (mov.tur === 'in') {
                      badgeColor = 'teal';
                      typeLabel = 'Giriş (Alım)';
                    } else if (mov.tur === 'consumption') {
                      badgeColor = 'cyan';
                      typeLabel = 'Reçete Tüketimi';
                    } else if (mov.tur === 'reversal') {
                      badgeColor = 'yellow';
                      typeLabel = 'İade (Reversal)';
                    } else if (mov.tur === 'waste') {
                      badgeColor = 'red';
                      typeLabel = 'Fire Çıkışı';
                    } else if (mov.tur === 'audit') {
                      badgeColor = 'purple';
                      typeLabel = 'Sayım Düzeltme';
                    }

                    return (
                      <Table.Tr key={mov.id}>
                        <Table.Td><Text size="xs" c="dimmed">{dateStr}</Text></Table.Td>
                        <Table.Td fw={700} c="white">{m.product?.ad}</Table.Td>
                        <Table.Td>
                          <Badge color={badgeColor} variant="light">{typeLabel}</Badge>
                        </Table.Td>
                        <Table.Td c="dimmed">{mov.kaynak_tur}</Table.Td>
                        <Table.Td fw={700} c={mov.tur === 'in' || mov.tur === 'reversal' ? 'teal' : 'red'}>
                          {mov.tur === 'in' || mov.tur === 'reversal' ? '+' : '-'}
                          {Number(mov.miktar).toFixed(2)} {m.product?.birim}
                        </Table.Td>
                        <Table.Td c="dimmed">{m.supplier?.ad || '-'}</Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Modal 1: Yeni Ürün Ekle */}
      <Modal
        opened={newProductModal}
        onClose={() => setNewProductModal(false)}
        title={
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" color="blue"><IconPackage size={16} /></ThemeIcon>
            <Text fw={700}>Yeni Stok Kartı Ekle</Text>
          </Group>
        }
        styles={{
          content: { backgroundColor: '#0f172a', border: '1px solid rgba(51, 65, 85, 0.6)' },
          header: { backgroundColor: '#0f172a', borderBottom: '1px solid rgba(51, 65, 85, 0.4)' },
        }}
        centered
      >
        <form onSubmit={handleCreateProduct}>
          <Stack gap="md">
            {formError && <Alert color="red">{formError}</Alert>}
            <TextInput
              label="Ürün Adı"
              placeholder="Örn: Cilalı Oto Şampuanı 20L"
              value={prodName}
              onChange={(e) => setProdName(e.currentTarget.value)}
              required
              autoFocus
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />
            <TextInput
              label="Kategori (Opsiyonel)"
              placeholder="Örn: Kimyasal, Bez, Temizlik"
              value={prodCategory}
              onChange={(e) => setProdCategory(e.currentTarget.value)}
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />
            <SimpleGrid cols={2}>
              <Select
                label="Ölçü Birimi"
                value={prodUnit}
                onChange={(val) => val && setProdUnit(val as any)}
                data={[
                  { value: 'lt', label: 'Litre (lt)' },
                  { value: 'kg', label: 'Kilogram (kg)' },
                  { value: 'piece', label: 'Adet (piece)' },
                ]}
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
              />
              <NumberInput
                label="Kritik Stok Seviyesi"
                value={prodCritical}
                onChange={(val) => setProdCritical(val)}
                min={0}
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
              />
            </SimpleGrid>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="gray" onClick={() => setNewProductModal(false)}>İptal</Button>
              <Button type="submit" color="blue" loading={submitting}>Ürünü Kaydet</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal 2: Stok Girişi (Satın Alma) */}
      <Modal
        opened={purchaseModal}
        onClose={() => setPurchaseModal(false)}
        title={
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" color="teal"><IconShoppingCartPlus size={16} /></ThemeIcon>
            <Text fw={700}>Stok Girişi (Satın Alma)</Text>
          </Group>
        }
        styles={{
          content: { backgroundColor: '#0f172a', border: '1px solid rgba(51, 65, 85, 0.6)' },
          header: { backgroundColor: '#0f172a', borderBottom: '1px solid rgba(51, 65, 85, 0.4)' },
        }}
        centered
      >
        <form onSubmit={handlePurchase}>
          <Stack gap="md">
            {formError && <Alert color="red">{formError}</Alert>}
            <Select
              label="Ürün Seçin"
              placeholder="Ürün seçin"
              value={purchaseProductId}
              onChange={setPurchaseProductId}
              data={products.map((p) => ({ value: p.id.toString(), label: `${p.ad} (${p.birim})` }))}
              required
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />
            <SimpleGrid cols={2}>
              <NumberInput
                label="Giriş Miktarı"
                value={purchaseAmount}
                onChange={(val) => setPurchaseAmount(val)}
                min={0.1}
                required
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
              />
              <NumberInput
                label="Toplam Alış Tutarı (TL)"
                value={purchaseTotalTL}
                onChange={(val) => setPurchaseTotalTL(val)}
                min={0}
                required
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
              />
            </SimpleGrid>

            <Select
              label="Tedarikçi (Opsiyonel)"
              placeholder="Tedarikçi seçin"
              clearable
              value={purchaseSupplierId}
              onChange={setPurchaseSupplierId}
              data={suppliers.map((s) => ({ value: s.id.toString(), label: s.ad }))}
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />

            <Checkbox
              label="Kasadan Malzeme Gideri Olarak Düş (Transactions Tablosuna Yaz)"
              checked={purchaseCreateExpense}
              onChange={(e) => setPurchaseCreateExpense(e.currentTarget.checked)}
              styles={{ label: { color: '#fff' } }}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="gray" onClick={() => setPurchaseModal(false)}>İptal</Button>
              <Button type="submit" color="teal" loading={submitting}>Stok Girişini Onayla</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal 3: Fire / Sayım */}
      <Modal
        opened={manualModal}
        onClose={() => setManualModal(false)}
        title={
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" color="red"><IconFlame size={16} /></ThemeIcon>
            <Text fw={700}>Manuel Stok Çıkışı / Sayım Düzeltmesi</Text>
          </Group>
        }
        styles={{
          content: { backgroundColor: '#0f172a', border: '1px solid rgba(51, 65, 85, 0.6)' },
          header: { backgroundColor: '#0f172a', borderBottom: '1px solid rgba(51, 65, 85, 0.4)' },
        }}
        centered
      >
        <form onSubmit={handleManualMovement}>
          <Stack gap="md">
            {formError && <Alert color="red">{formError}</Alert>}
            <Select
              label="İşlem Türü"
              value={manualType}
              onChange={(val) => val && setManualType(val as any)}
              data={[
                { value: 'waste', label: 'Fire / Zayiat Çıkışı' },
                { value: 'audit', label: 'Haftalık Sayım Düzeltmesi' },
              ]}
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />
            <Select
              label="Ürün Seçin"
              value={manualProductId}
              onChange={setManualProductId}
              data={products.map((p) => ({ value: p.id.toString(), label: `${p.ad} (Mevcut: ${p.mevcut_miktar} ${p.birim})` }))}
              required
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />
            <NumberInput
              label="Düzeltme / Fire Miktarı"
              value={manualAmount}
              onChange={(val) => setManualAmount(val)}
              min={0.01}
              required
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />
            <TextInput
              label="Açıklama / Sebep"
              placeholder="Örn: Bidon patladı, döküldü..."
              value={manualDesc}
              onChange={(e) => setManualDesc(e.currentTarget.value)}
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="gray" onClick={() => setManualModal(false)}>İptal</Button>
              <Button type="submit" color="red" loading={submitting}>Düzeltmeyi Kaydet</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
