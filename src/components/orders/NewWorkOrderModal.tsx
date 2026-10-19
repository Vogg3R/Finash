import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Checkbox,
  Button,
  Group,
  Text,
  Alert,
  ThemeIcon,
  Stack,
  SimpleGrid,
  Paper,
  Badge,
  PasswordInput,
  Divider,
} from '@mantine/core';
import {
  IconPlus,
  IconAlertCircle,
  IconCheck,
  IconCar,
  IconShieldLock,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

interface NewWorkOrderModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewWorkOrderModal({ opened, onClose, onSuccess }: NewWorkOrderModalProps) {
  const { user } = useAuth();

  // Araç ve Plaka
  const [plateInput, setPlateInput] = useState('');
  const [normalizedPlate, setNormalizedPlate] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ id: number; ad: string }>>([]);
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<string>('1');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [matchedVehicle, setMatchedVehicle] = useState<any>(null);

  // Müşteri
  const [customers, setCustomers] = useState<Array<{ id: number; ad: string; telefon?: string }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Hizmetler ve Fiyatlar
  const [allServices, setAllServices] = useState<Array<{ id: number; ad: string; sure_dk: number }>>([]);
  const [priceMatrix, setPriceMatrix] = useState<Array<{ hizmet_id: number; arac_tipi_id: number; fiyat_kurus: number }>>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  // Personel
  const [allStaff, setAllStaff] = useState<Array<{ id: number; ad: string }>>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // İndirim & Yetkilendirme
  const [discountTl, setDiscountTl] = useState<string>('0');
  const [adminPin, setAdminPin] = useState<string>('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verileri yükle
  useEffect(() => {
    if (!opened || !window.electronAPI) return;

    setError(null);
    setPlateInput('');
    setNormalizedPlate('');
    setMatchedVehicle(null);
    setBrand('');
    setModel('');
    setColor('');
    setSelectedCustomerId(null);
    setSelectedServiceIds([]);
    setDiscountTl('0');
    setAdminPin('');

    Promise.all([
      window.electronAPI.invoke('vehicles:getTypes'),
      window.electronAPI.invoke('customers:getAll'),
      window.electronAPI.invoke('services:getAll'),
      window.electronAPI.invoke('services:getPriceMatrix'),
      window.electronAPI.invoke('staff:getActive'),
    ]).then(([vTypes, custs, servs, matrix, staff]) => {
      setVehicleTypes(vTypes || []);
      setCustomers(custs || []);
      setAllServices(servs || []);
      setPriceMatrix(matrix || []);
      setAllStaff(staff || []);
      if (vTypes && vTypes.length > 0) {
        setSelectedVehicleTypeId(vTypes[0].id.toString());
      }
    }).catch((err) => {
      console.error('Veri yükleme hatası:', err);
    });
  }, [opened]);

  // Plaka arama (debounced or on change)
  const handlePlateChange = async (val: string) => {
    setPlateInput(val);
    if (!window.electronAPI || val.trim().length < 2) {
      setMatchedVehicle(null);
      setNormalizedPlate('');
      return;
    }

    try {
      const res = await window.electronAPI.invoke('vehicles:searchPlate', { rawPlate: val });
      if (res.isValid && res.normalizedPlate) {
        setNormalizedPlate(res.normalizedPlate);
        if (res.exactMatch) {
          setMatchedVehicle(res.exactMatch);
          setSelectedVehicleTypeId(res.exactMatch.vehicle.vehicle_type_id.toString());
          setBrand(res.exactMatch.vehicle.marka || '');
          setModel(res.exactMatch.vehicle.model || '');
          setColor(res.exactMatch.vehicle.renk || '');
          if (res.exactMatch.vehicle.customer_id) {
            setSelectedCustomerId(res.exactMatch.vehicle.customer_id.toString());
          }
        } else {
          setMatchedVehicle(null);
        }
      } else {
        setNormalizedPlate('');
        setMatchedVehicle(null);
      }
    } catch {
      // ignore
    }
  };

  // Seçilen araç tipi için bir hizmetin fiyatını bul
  const getServicePrice = (serviceId: number): number => {
    const vtId = parseInt(selectedVehicleTypeId, 10);
    const entry = priceMatrix.find((p) => p.hizmet_id === serviceId && p.arac_tipi_id === vtId);
    return entry ? entry.fiyat_kurus : 0;
  };

  // Toplam Hesaplama
  const grossTotalKurus = selectedServiceIds.reduce((sum, sId) => sum + getServicePrice(sId), 0);
  const discountKurus = Math.max(0, Math.round((parseFloat(discountTl) || 0) * 100));
  const netTotalKurus = Math.max(0, grossTotalKurus - discountKurus);

  // Kasiyer indirim kontrolü (B5: Kasa rolü max %10, üstü Admin PIN)
  const isCashier = user?.rol === 'cashier';
  const discountPercent = grossTotalKurus > 0 ? (discountKurus / grossTotalKurus) * 100 : 0;
  const requiresAdminPin = isCashier && discountPercent > 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!plateInput.trim()) {
      setError('Lütfen bir plaka girin.');
      return;
    }

    if (selectedServiceIds.length === 0) {
      setError('Lütfen en az bir hizmet seçin.');
      return;
    }

    if (discountKurus > grossTotalKurus) {
      setError('İndirim tutarı toplam tutardan büyük olamaz.');
      return;
    }

    if (requiresAdminPin && !adminPin.trim()) {
      setError('%10 üzeri indirim için Yönetici PIN onayı zorunludur.');
      return;
    }

    setLoading(true);

    try {
      if (!window.electronAPI) return;

      // 1. Araç mevcut değilse kaydet veya güncelle
      let vehicleId: number;
      if (matchedVehicle) {
        vehicleId = matchedVehicle.vehicle.id;
      } else {
        const regRes = await window.electronAPI.invoke('vehicles:register', {
          rawPlate: plateInput.trim(),
          marka: brand.trim() || undefined,
          model: model.trim() || undefined,
          renk: color.trim() || undefined,
          vehicle_type_id: parseInt(selectedVehicleTypeId, 10),
          customer_id: selectedCustomerId ? parseInt(selectedCustomerId, 10) : undefined,
        });
        vehicleId = regRes.vehicle.id;
      }

      // 2. İş Emrini Oluştur
      const items = selectedServiceIds.map((hizmetId) => ({
        hizmet_id: hizmetId,
        staff_id: selectedStaffId ? parseInt(selectedStaffId, 10) : undefined,
      }));

      await window.electronAPI.invoke('orders:create', {
        userId: user?.id,
        data: {
          arac_id: vehicleId,
          items,
          indirim_kurus: discountKurus,
          adminPin: requiresAdminPin ? adminPin : undefined,
        },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'İş emri oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group justify="space-between" w="100%">
          <Group gap="xs">
            <ThemeIcon size={30} radius="md" color="blue" variant="gradient" gradient={{ from: 'blue.6', to: 'indigo.6' }}>
              <IconPlus size={18} />
            </ThemeIcon>
            <div>
              <Text fw={800} size="md">Yeni İş Emri Oluştur</Text>
              <Text size="xs" c="dimmed">Kısayol: F2 • Hızlı Araç Kabulü (&lt; 30 sn)</Text>
            </div>
          </Group>
          {normalizedPlate && (
            <Badge color="blue" size="lg" variant="filled">
              {normalizedPlate}
            </Badge>
          )}
        </Group>
      }
      styles={{
        content: { backgroundColor: '#0f172a', border: '1px solid rgba(51, 65, 85, 0.6)' },
        header: { backgroundColor: '#0f172a', borderBottom: '1px solid rgba(51, 65, 85, 0.4)' },
      }}
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          )}

          {/* 1. Araç & Plaka Bilgileri */}
          <Paper p="sm" radius="md" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155' }}>
            <Group justify="space-between" mb="xs">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">1. Araç & Müşteri Tanımı</Text>
              {matchedVehicle ? (
                <Badge color="teal" size="sm" variant="light">Kayıtlı Araç Bulundu</Badge>
              ) : (
                <Badge color="yellow" size="sm" variant="light">Yeni Araç Girişi</Badge>
              )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Araç Plakası"
                placeholder="Örn: 34 ABC 123"
                value={plateInput}
                onChange={(e) => handlePlateChange(e.currentTarget.value)}
                required
                autoFocus
                styles={{
                  input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontWeight: 700, letterSpacing: '0.05em' },
                }}
              />

              <Select
                label="Araç Tipi"
                value={selectedVehicleTypeId}
                onChange={(val) => val && setSelectedVehicleTypeId(val)}
                data={vehicleTypes.map((vt) => ({ value: vt.id.toString(), label: vt.ad }))}
                required
                styles={{
                  input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' },
                }}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="xs">
              <TextInput
                label="Marka"
                placeholder="Örn: Renault"
                value={brand}
                onChange={(e) => setBrand(e.currentTarget.value)}
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
              />
              <TextInput
                label="Model"
                placeholder="Örn: Megane"
                value={model}
                onChange={(e) => setModel(e.currentTarget.value)}
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
              />
              <Select
                label="Müşteri (Opsiyonel)"
                placeholder="Müşteri seçin"
                clearable
                searchable
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                data={customers.map((c) => ({
                  value: c.id.toString(),
                  label: `${c.ad} ${c.telefon ? `(${c.telefon})` : ''}`,
                }))}
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
              />
            </SimpleGrid>
          </Paper>

          {/* 2. Hizmet Seçimi */}
          <Paper p="sm" radius="md" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155' }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">2. Hizmet Seçimi</Text>
            <Stack gap="xs">
              {allServices.map((service) => {
                const price = getServicePrice(service.id);
                const isChecked = selectedServiceIds.includes(service.id);

                return (
                  <Group
                    key={service.id}
                    justify="space-between"
                    p="xs"
                    style={{
                      backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                      borderRadius: 6,
                      border: isChecked ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedServiceIds(selectedServiceIds.filter((id) => id !== service.id));
                      } else {
                        setSelectedServiceIds([...selectedServiceIds, service.id]);
                      }
                    }}
                  >
                    <Checkbox
                      label={service.ad}
                      checked={isChecked}
                      onChange={() => {}} // onClick ile yönetiliyor
                      styles={{ label: { color: '#fff', cursor: 'pointer', fontWeight: 500 } }}
                    />
                    <Text fw={700} c={price > 0 ? 'teal' : 'dimmed'}>
                      {(price / 100).toFixed(2)} ₺
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          </Paper>

          {/* 3. Personel & İndirim */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label="Yıkama Personeli (Atama)"
              placeholder="Personel seçin"
              clearable
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              data={allStaff.map((s) => ({ value: s.id.toString(), label: s.ad }))}
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />

            <TextInput
              label="İndirim Tutarı (TL)"
              placeholder="0"
              value={discountTl}
              onChange={(e) => setDiscountTl(e.currentTarget.value)}
              type="number"
              min="0"
              styles={{ input: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' } }}
            />
          </SimpleGrid>

          {/* B5: %10 Üzeri İndirim için Yönetici PIN Onayı */}
          {requiresAdminPin && (
            <Alert color="yellow" icon={<IconShieldLock size={16} />} title="Yönetici Onayı Gerekli">
              <Text size="xs" mb="xs">
                Kasa rolü için %10 üzeri indirim ({discountPercent.toFixed(1)}%) uygulandığından Yönetici PIN onayı zorunludur.
              </Text>
              <PasswordInput
                placeholder="Yönetici PIN veya Şifresi"
                value={adminPin}
                onChange={(e) => setAdminPin(e.currentTarget.value)}
                required
                styles={{ input: { backgroundColor: '#1e293b', borderColor: '#f59e0b', color: '#fff' } }}
              />
            </Alert>
          )}

          <Divider color="#334155" />

          {/* Fiyat Özeti Kutusu */}
          <Paper p="md" radius="md" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #334155' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed">Brüt Tutar</Text>
                <Text fw={600} size="sm" c="white">{(grossTotalKurus / 100).toFixed(2)} ₺</Text>
              </div>
              {discountKurus > 0 && (
                <div>
                  <Text size="xs" c="red">İndirim ({discountPercent.toFixed(0)}%)</Text>
                  <Text fw={600} size="sm" c="red">-{(discountKurus / 100).toFixed(2)} ₺</Text>
                </div>
              )}
              <div>
                <Text size="xs" c="dimmed">Ödenecek Tutar</Text>
                <Text fw={800} size="xl" c="teal">
                  {(netTotalKurus / 100).toFixed(2)} ₺
                </Text>
              </div>
            </Group>
          </Paper>

          {/* Aksiyon Butonları */}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
              Vazgeç (ESC)
            </Button>
            <Button
              type="submit"
              color="blue"
              size="md"
              loading={loading}
              leftSection={<IconCheck size={18} />}
              disabled={selectedServiceIds.length === 0}
            >
              İş Emrini Başlat
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
