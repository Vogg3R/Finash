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
  Textarea,
  Tabs,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconEdit, IconCheck, IconX, IconCoins, IconBottle } from '@tabler/icons-react';
import { PageHeader } from '../ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { RecipeModal } from '../stock/RecipeModal';
export interface ServiceItem {
  id: number;
  ad: string;
  aciklama: string | null;
  sure_dk: number;
  aktif: boolean;
}
export interface VehicleTypeItem {
  id: number;
  ad: string;
  sira: number;
}
export interface PriceMatrixItem {
  id: number;
  hizmet_id: number;
  arac_tipi_id: number;
  fiyat_kurus: number;
  serviceName: string;
  vehicleTypeName: string;
}
export const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>('services');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeItem[]>([]);
  const [priceMatrix, setPriceMatrix] = useState<PriceMatrixItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Hizmet Ekle/Düzenle Modalı
  const [modalOpened, setModalOpened] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDuration, setFormDuration] = useState<number>(30);

  // Fiyat Düzenleme Modalı
  const [priceModalOpened, setPriceModalOpened] = useState(false);
  const [editingPriceTarget, setEditingPriceTarget] = useState<{
    serviceId: number;
    vehicleTypeId: number;
    serviceName: string;
    vehicleTypeName: string;
    currentPriceTL: number;
  } | null>(null);
  const [formPriceTL, setFormPriceTL] = useState<number>(0);
  const [recipeTargetService, setRecipeTargetService] = useState<ServiceItem | null>(null);
  const fetchData = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const [servicesRes, typesRes, matrixRes] = await Promise.all([
          window.electronAPI.invoke('services:getAll', { includeInactive: true }),
          window.electronAPI.invoke('vehicles:getTypes'),
          window.electronAPI.invoke('services:getPriceMatrix'),
        ]);
        if (servicesRes) setServices(servicesRes);
        if (typesRes) setVehicleTypes(typesRes);
        if (matrixRes) setPriceMatrix(matrixRes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleOpenAddService = () => {
    setEditingService(null);
    setFormName('');
    setFormDesc('');
    setFormDuration(30);
    setModalOpened(true);
  };
  const handleOpenEditService = (srv: ServiceItem) => {
    setEditingService(srv);
    setFormName(srv.ad);
    setFormDesc(srv.aciklama || '');
    setFormDuration(srv.sure_dk);
    setModalOpened(true);
  };
  const handleSaveService = async () => {
    if (!formName.trim() || !user) return;
    try {
      if (editingService) {
        await window.electronAPI.invoke('services:update', {
          userId: user.id,
          id: editingService.id,
          data: {
            ad: formName,
            aciklama: formDesc,
            sure_dk: formDuration,
          },
        });
      } else {
        await window.electronAPI.invoke('services:create', {
          userId: user.id,
          data: {
            ad: formName,
            aciklama: formDesc,
            sure_dk: formDuration,
          },
        });
      }
      setModalOpened(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };
  const handleToggleActive = async (srv: ServiceItem) => {
    if (!user) return;
    try {
      await window.electronAPI.invoke('services:update', {
        userId: user.id,
        id: srv.id,
        data: { aktif: !srv.aktif },
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };
  const handleOpenPriceModal = (service: ServiceItem, vType: VehicleTypeItem) => {
    const existing = priceMatrix.find(
      (m) => m.hizmet_id === service.id && m.arac_tipi_id === vType.id
    );
    const currentPriceTL = existing ? existing.fiyat_kurus / 100 : 0;
    setEditingPriceTarget({
      serviceId: service.id,
      vehicleTypeId: vType.id,
      serviceName: service.ad,
      vehicleTypeName: vType.ad,
      currentPriceTL,
    });
    setFormPriceTL(currentPriceTL);
    setPriceModalOpened(true);
  };
  const handleSavePrice = async () => {
    if (!editingPriceTarget || !user) return;
    try {
      const priceKurus = Math.round(formPriceTL * 100);
      await window.electronAPI.invoke('services:updatePrice', {
        userId: user.id,
        serviceId: editingPriceTarget.serviceId,
        vehicleTypeId: editingPriceTarget.vehicleTypeId,
        priceKurus,
      });
      setPriceModalOpened(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };
  const getPriceForCell = (serviceId: number, vehicleTypeId: number) => {
    const item = priceMatrix.find(
      (m) => m.hizmet_id === serviceId && m.arac_tipi_id === vehicleTypeId
    );
    if (!item) return null;
    return (item.fiyat_kurus / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺';
  };
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <PageHeader title="Hizmet ve Fiyat Yönetimi" description="Hizmet kataloğunu yönetin ve araç tipine göre dinamik fiyat listesini belirleyin." />

        <Button
          leftSection={<IconPlus size={16} />}
          color="brand"
          onClick={handleOpenAddService}
        >
          Yeni Hizmet Ekle
        </Button>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" color="brand">
        <Tabs.List mb="md">
          <Tabs.Tab value="services">Hizmet Kataloğu ({services.length})</Tabs.Tab>
          <Tabs.Tab value="matrix">Araç Tipi × Fiyat Matrisi</Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Hizmet Kataloğu */}
        <Tabs.Panel value="services">
          <Paper
            p="md"
            radius="md"
          >
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Hizmet Adı</Table.Th>
                  <Table.Th>Açıklama</Table.Th>
                  <Table.Th>Tahmini Süre</Table.Th>
                  <Table.Th>Durum</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>İşlemler</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {services.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', color: 'var(--mantine-color-dimmed)' }}>
                      Henüz kayıtlı hizmet bulunmuyor. "Yeni Hizmet Ekle" butonuyla ekleyin.
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  services.map((srv) => (
                    <Table.Tr key={srv.id}>
                      <Table.Td fw={700}>
                        {srv.ad}
                      </Table.Td>
                      <Table.Td c="dimmed">{srv.aciklama || '-'}</Table.Td>
                      <Table.Td>{srv.sure_dk} dakika</Table.Td>
                      <Table.Td>
                        <Badge color={srv.aktif ? 'green' : 'gray'} variant="light">
                          {srv.aktif ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group justify="flex-end" gap="xs">
                          <Tooltip label="Reçete Tanımla (Stok Tüketimi)">
                            <ActionIcon
                              variant="subtle"
                              color="teal"
                              onClick={() => setRecipeTargetService(srv)}
                            >
                              <IconBottle size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Düzenle">
                            <ActionIcon
                              variant="subtle"
                              color="brand"
                              onClick={() => handleOpenEditService(srv)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label={srv.aktif ? 'Pasife Al' : 'Aktif Et'}>
                            <ActionIcon
                              variant="subtle"
                              color={srv.aktif ? 'yellow' : 'green'}
                              onClick={() => handleToggleActive(srv)}
                            >
                              {srv.aktif ? <IconX size={16} /> : <IconCheck size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* Tab 2: Fiyat Matrisi */}
        <Tabs.Panel value="matrix">
          <Paper
            p="md"
            radius="md"
            style={{
              overflowX: 'auto',
            }}
          >
            <Table highlightOnHover verticalSpacing="md" withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 200 }}>Hizmet Adı</Table.Th>
                  {vehicleTypes.map((vt) => (
                    <Table.Th key={vt.id} style={{ textAlign: 'center', minWidth: 140 }}>
                      {vt.ad}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {services
                  .filter((s) => s.aktif)
                  .map((srv) => (
                    <Table.Tr key={srv.id}>
                      <Table.Td fw={700}>
                        {srv.ad}
                      </Table.Td>
                      {vehicleTypes.map((vt) => {
                        const priceStr = getPriceForCell(srv.id, vt.id);
                        return (
                          <Table.Td key={vt.id} style={{ textAlign: 'center' }}>
                            <Button
                              variant={priceStr ? 'light' : 'subtle'}
                              color={priceStr ? 'teal' : 'gray'}
                              size="xs"
                              leftSection={<IconCoins size={14} />}
                              onClick={() => handleOpenPriceModal(srv, vt)}
                            >
                              {priceStr || 'Fiyat Belirle'}
                            </Button>
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Hizmet Ekle/Düzenle Modalı */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Hizmet Adı"
            placeholder="Örn: İç + Dış Yıkama"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <Textarea
            label="Açıklama (İsteğe bağlı)"
            placeholder="Hizmet içeriği ve detayları..."
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />

          <NumberInput
            label="Tahmini Süre (Dakika)"
            value={formDuration}
            onChange={(val) => setFormDuration(Number(val) || 30)}
            min={5}
            step={5}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setModalOpened(false)}>
              İptal
            </Button>
            <Button color="brand" onClick={handleSaveService}>
              {editingService ? 'Güncelle' : 'Kaydet'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Fiyat Düzenleme Modalı */}
      <Modal
        opened={priceModalOpened}
        onClose={() => setPriceModalOpened(false)}
        title="Hizmet Fiyatı Belirle"
        centered
      >
        <Stack gap="md">
          {editingPriceTarget && (
            <Paper p="sm" radius="md">
              <Text size="sm" fw={600}>
                Hizmet: {editingPriceTarget.serviceName}
              </Text>
              <Text size="xs" c="dimmed">
                Araç Tipi: {editingPriceTarget.vehicleTypeName}
              </Text>
            </Paper>
          )}

          <NumberInput
            label="Fiyat (TL)"
            placeholder="0.00"
            value={formPriceTL}
            onChange={(val) => setFormPriceTL(Number(val) || 0)}
            min={0}
            step={10}
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            rightSection={<Text size="xs" c="dimmed" mr="xs">TL</Text>}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={() => setPriceModalOpened(false)}>
              İptal
            </Button>
            <Button onClick={handleSavePrice}>
              Fiyatı Kaydet
            </Button>
          </Group>
        </Stack>
      </Modal>

      <RecipeModal
        opened={!!recipeTargetService}
        service={recipeTargetService}
        onClose={() => setRecipeTargetService(null)}
      />
    </Stack>
  );
};
