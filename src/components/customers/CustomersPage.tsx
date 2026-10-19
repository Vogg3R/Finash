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
  Textarea,
  Select,
  Alert,
  Card,
  SimpleGrid,
  ThemeIcon,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconCar,
  IconUser,
  IconPhone,
  IconAlertCircle,
  IconCheck,
  IconEdit,
} from '@tabler/icons-react';
import { PageHeader } from '../ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { normalizePlate } from '../../../electron/utils/plateNormalizer';
export interface CustomerItem {
  id: number;
  ad: string;
  telefon: string | null;
  notlar: string | null;
  veresiye_bakiye_kurus: number;
  created_at: string;
}
export interface VehicleTypeOption {
  value: string;
  label: string;
}
export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [plateSearch, setPlateSearch] = useState('');
  const [plateSearchResult, setPlateSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Müşteri Ekle Modalı
  const [customerModalOpened, setCustomerModalOpened] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Araç Kaydet Modalı
  const [vehicleModalOpened, setVehicleModalOpened] = useState(false);
  const [vehPlate, setVehPlate] = useState('');
  const [vehBrand, setVehBrand] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehColor, setVehColor] = useState('');
  const [vehTypeId, setVehTypeId] = useState<string>('1');
  const [vehCustomerId, setVehCustomerId] = useState<string | null>(null);
  const [vehError, setVehError] = useState<string | null>(null);

  // Canlı plaka normalizasyonu önizlemesi
  const platePreview = normalizePlate(plateSearch);
  const fetchCustomers = async (query = '') => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('customers:search', { query });
        if (res) setCustomers(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const fetchVehicleTypes = async () => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('vehicles:getTypes');
        if (res) {
          setVehicleTypes(res.map((vt: any) => ({ value: String(vt.id), label: vt.ad })));
          if (res.length > 0) setVehTypeId(String(res[0].id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchCustomers();
    fetchVehicleTypes();
  }, []);
  const handleSearchPlate = async () => {
    if (!plateSearch.trim()) return;
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('vehicles:searchPlate', { rawPlate: plateSearch });
        setPlateSearchResult(res);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleSaveCustomer = async () => {
    if (!custName.trim() || !user) return;
    try {
      if (editingCustomer) {
        await window.electronAPI.invoke('customers:update', {
          userId: user.id,
          id: editingCustomer.id,
          data: {
            ad: custName,
            telefon: custPhone,
            notlar: custNotes,
          },
        });
      } else {
        await window.electronAPI.invoke('customers:create', {
          userId: user.id,
          data: {
            ad: custName,
            telefon: custPhone,
            notlar: custNotes,
          },
        });
      }
      setCustomerModalOpened(false);
      fetchCustomers(searchQuery);
    } catch (err: any) {
      alert(err.message);
    }
  };
  const handleSaveVehicle = async () => {
    if (!vehPlate.trim()) return;
    setVehError(null);
    const norm = normalizePlate(vehPlate);
    if (!norm.isValid) {
      setVehError(norm.error || 'Geçersiz plaka formatı.');
      return;
    }
    try {
      await window.electronAPI.invoke('vehicles:register', {
        rawPlate: vehPlate,
        marka: vehBrand,
        model: vehModel,
        renk: vehColor,
        vehicle_type_id: Number(vehTypeId),
        customer_id: vehCustomerId ? Number(vehCustomerId) : null,
      });
      setVehicleModalOpened(false);
      setVehPlate('');
      setVehBrand('');
      setVehModel('');
      setVehColor('');
      if (plateSearch) handleSearchPlate();
    } catch (err: any) {
      setVehError(err.message);
    }
  };
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <PageHeader title="Müşteri ve Araç Yönetimi" description="Plaka arama, müşteri kartları ve araç kayıtları." />

        <Group>
          <Button
            variant="default"
            leftSection={<IconCar size={16} />}
            onClick={() => setVehicleModalOpened(true)}
          >
            Yeni Araç Kaydet
          </Button>
          <Button
            color="brand"
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setEditingCustomer(null);
              setCustName('');
              setCustPhone('');
              setCustNotes('');
              setCustomerModalOpened(true);
            }}
          >
            Yeni Müşteri Ekle
          </Button>
        </Group>
      </Group>

      {/* Hızlı Plaka Arama Kartı (P4 Normalizasyon Canlı Denetimi) */}
      <Paper
        p="md"
        radius="lg"
      >
        <Stack gap="xs">
          <Text size="sm" fw={700}>
            Hızlı Plaka Sorgulama
          </Text>
          <Group>
            <TextInput
              placeholder="Plaka yazın (Örn: 34 abc 123 veya 06 ılk 41)..."
              value={plateSearch}
              onChange={(e) => {
                setPlateSearch(e.target.value);
                setPlateSearchResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchPlate();
              }}
              style={{ flex: 1 }}
              size="md"
              leftSection={<IconCar size={18} />}
            />
            <Button size="md" color="brand" onClick={handleSearchPlate}>
              Sorgula
            </Button>
          </Group>

          {/* Canlı P4 Normalizasyon Rozetleri */}
          {plateSearch && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                P4 Normalizasyon Önizlemesi:
              </Text>
              {platePreview.isValid ? (
                <Badge color="green" variant="light" size="sm">
                  {platePreview.normalizedPlate} (Geçerli)
                </Badge>
              ) : (
                <Badge color="red" variant="light" size="sm">
                  {platePreview.error}
                </Badge>
              )}
            </Group>
          )}

          {/* Plaka Arama Sonucu */}
          {plateSearchResult && (
            <div style={{ marginTop: 10 }}>
              {plateSearchResult.exactMatch ? (
                <Card
                  p="sm"
                  radius="md"
                  style={{
                    backgroundColor: 'var(--mantine-color-teal-0)',
                    border: '1px solid var(--mantine-color-teal-2)',
                  }}
                >
                  <Group justify="space-between">
                    <div>
                      <Text fw={800} size="md">
                        {plateSearchResult.exactMatch.vehicle.plaka}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {plateSearchResult.exactMatch.vehicle.marka || ''}{' '}
                        {plateSearchResult.exactMatch.vehicle.model || ''} •{' '}
                        {plateSearchResult.exactMatch.vehicleType?.ad || 'Binek'}
                      </Text>
                      {plateSearchResult.exactMatch.customer && (
                        <Text size="xs" c="teal" mt={4}>
                          Müşteri: {plateSearchResult.exactMatch.customer.ad} (
                          {plateSearchResult.exactMatch.customer.telefon || '-'})
                        </Text>
                      )}
                    </div>
                    <Badge color="green">Kayıtlı Araç</Badge>
                  </Group>
                </Card>
              ) : (
                <Alert color="yellow" variant="light" radius="md" icon={<IconAlertCircle size={16} />}>
                  Bu plaka ile kayıtlı araç bulunamadı. Yeni araç olarak kaydedebilirsiniz.
                </Alert>
              )}
            </div>
          )}
        </Stack>
      </Paper>

      {/* Müşteri Listesi */}
      <Paper
        p="md"
        radius="lg"
      >
        <Group justify="space-between" mb="md">
          <Text fw={700} size="md">
            Kayıtlı Müşteriler ({customers.length})
          </Text>
          <TextInput
            placeholder="İsim veya telefonla ara..."
            leftSection={<IconSearch size={14} />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchCustomers(e.target.value);
            }}
            size="xs"
            style={{ width: 260 }}
          />
        </Group>

        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Müşteri Adı</Table.Th>
              <Table.Th>Telefon</Table.Th>
              <Table.Th>Notlar</Table.Th>
              <Table.Th>Kayıt Tarihi</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>İşlemler</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {customers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5} style={{ textAlign: 'center', color: 'var(--mantine-color-dimmed)' }}>
                  {loading ? 'Yükleniyor...' : 'Henüz müşteri bulunmuyor.'}
                </Table.Td>
              </Table.Tr>
            ) : (
              customers.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td fw={700}>
                    {c.ad}
                  </Table.Td>
                  <Table.Td>{c.telefon || '-'}</Table.Td>
                  <Table.Td c="dimmed">{c.notlar || '-'}</Table.Td>
                  <Table.Td>{c.created_at?.substring(0, 10)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <ActionIcon
                      variant="subtle"
                      color="brand"
                      onClick={() => {
                        setEditingCustomer(c);
                        setCustName(c.ad);
                        setCustPhone(c.telefon || '');
                        setCustNotes(c.notlar || '');
                        setCustomerModalOpened(true);
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Müşteri Ekle/Düzenle Modalı */}
      <Modal
        opened={customerModalOpened}
        onClose={() => setCustomerModalOpened(false)}
        title={editingCustomer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Ekle'}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Müşteri Adı Soyadı"
            placeholder="Örn: Ahmet Yılmaz"
            required
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
          />
          <TextInput
            label="Telefon Numarası"
            placeholder="05xx xxx xx xx"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
          />
          <Textarea
            label="Notlar (Tercihler, araç özellikleri vb.)"
            placeholder="Müşteri hakkında özel notlar..."
            value={custNotes}
            onChange={(e) => setCustNotes(e.target.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setCustomerModalOpened(false)}>
              İptal
            </Button>
            <Button color="brand" onClick={handleSaveCustomer}>
              {editingCustomer ? 'Güncelle' : 'Kaydet'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Araç Kaydet Modalı */}
      <Modal
        opened={vehicleModalOpened}
        onClose={() => setVehicleModalOpened(false)}
        title="Yeni Araç Kaydet"
        centered
      >
        <Stack gap="md">
          {vehError && (
            <Alert color="red" variant="light" radius="md">
              {vehError}
            </Alert>
          )}

          <TextInput
            label="Plaka"
            placeholder="Örn: 34 ABC 123"
            required
            value={vehPlate}
            onChange={(e) => setVehPlate(e.target.value)}
            description="i, ı, İ otomatik olarak Latin I'ya çevrilir. Ç, Ş, Ğ, Ö, Ü kullanılamaz."
          />

          <Select
            label="Araç Tipi"
            data={vehicleTypes}
            value={vehTypeId}
            onChange={(val) => setVehTypeId(val || '1')}
            required
          />

          <SimpleGrid cols={2}>
            <TextInput
              label="Marka"
              placeholder="Örn: Renault"
              value={vehBrand}
              onChange={(e) => setVehBrand(e.target.value)}
            />
            <TextInput
              label="Model"
              placeholder="Örn: Megane"
              value={vehModel}
              onChange={(e) => setVehModel(e.target.value)}
            />
          </SimpleGrid>

          <TextInput
            label="Renk"
            placeholder="Örn: Beyaz"
            value={vehColor}
            onChange={(e) => setVehColor(e.target.value)}
          />

          <Select
            label="Sahip (Müşteri - İsteğe Bağlı)"
            placeholder="Müşteri seçin..."
            data={customers.map((c) => ({ value: String(c.id), label: `${c.ad} (${c.telefon || 'Tel yok'})` }))}
            value={vehCustomerId}
            onChange={setVehCustomerId}
            clearable
            searchable
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setVehicleModalOpened(false)}>
              İptal
            </Button>
            <Button onClick={handleSaveVehicle}>
              Aracı Kaydet
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
