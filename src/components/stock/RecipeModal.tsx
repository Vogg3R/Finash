import React, { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  NumberInput,
  Button,
  Group,
  Text,
  Table,
  ActionIcon,
  Stack,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import { IconTrash, IconPlus, IconAlertCircle, IconCheck, IconBottle } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
interface RecipeModalProps {
  opened: boolean;
  service: { id: number; ad: string } | null;
  onClose: () => void;
}
export function RecipeModal({ opened, service, onClose }: RecipeModalProps) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | string>(0.1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRecipes = async () => {
    if (!service || !window.electronAPI) return;
    try {
      const [recList, prodList] = await Promise.all([
        window.electronAPI.invoke('stock:getRecipes', { serviceId: service.id }),
        window.electronAPI.invoke('stock:getAllProducts'),
      ]);
      setRecipes(recList || []);
      setProducts(prodList || []);
    } catch (err: any) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (opened && service) {
      setError(null);
      setSelectedProductId(null);
      setAmount(0.1);
      loadRecipes();
    }
  }, [opened, service]);
  if (!service) return null;
  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Lütfen bir stok ürünü seçin.');
      return;
    }
    const qty = parseFloat(amount.toString());
    if (isNaN(qty) || qty <= 0) {
      setError('Tüketim miktarı sıfırdan büyük olmalıdır.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (window.electronAPI) {
        await window.electronAPI.invoke('stock:setRecipe', {
          userId: user?.id,
          serviceId: service.id,
          productId: parseInt(selectedProductId, 10),
          miktar: qty,
        });
        await loadRecipes();
        setSelectedProductId(null);
        setAmount(0.1);
      }
    } catch (err: any) {
      setError(err?.message || 'Reçete kaydedilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  const handleRemove = async (productId: number) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.invoke('stock:removeRecipe', {
        userId: user?.id,
        serviceId: service.id,
        productId,
      });
      await loadRecipes();
    } catch (err: any) {
      alert(err?.message || 'Silinirken hata oluştu.');
    }
  };
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" color="brand">
            <IconBottle size={16} />
          </ThemeIcon>
          <Text fw={700}>Hizmet Reçetesi (Malzeme Tüketimi) • {service.ad}</Text>
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Bu hizmet her tamamlandığında reçetedeki malzemeler otomatik olarak stoktan düşülecektir.
        </Text>

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {/* Yeni Malzeme Ekleme Formu */}
        <form onSubmit={handleAddRecipe}>
          <Group align="flex-end" gap="sm">
            <Select
              label="Kullanılan Stok Ürünü"
              placeholder="Ürün seçin"
              value={selectedProductId}
              onChange={setSelectedProductId}
              data={products.map((p) => ({
                value: p.id.toString(),
                label: `${p.ad} (${p.birim})`,
              }))}
              style={{ flex: 1 }}
              required
            />

            <NumberInput
              label="Tüketim Miktarı"
              value={amount}
              onChange={(val) => setAmount(val)}
              step={0.01}
              min={0.001}
              decimalScale={3}
              required
              w={140}
            />

            <Button
              type="submit"
              color="brand"
              loading={loading}
              leftSection={<IconPlus size={16} />}
            >
              Ekle
            </Button>
          </Group>
        </form>

        {/* Mevcut Reçete Tablosu */}
        <Table
          verticalSpacing="sm"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Malzeme Adı</Table.Th>
              <Table.Th>Birim Tüketim</Table.Th>
              <Table.Th ta="right">İşlem</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recipes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={3} ta="center" c="dimmed">
                  Bu hizmete henüz reçete tanımlanmamış.
                </Table.Td>
              </Table.Tr>
            ) : (
              recipes.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td fw={600}>{r.productName}</Table.Td>
                  <Table.Td c="teal" fw={700}>
                    {r.miktar} {r.productUnit}
                  </Table.Td>
                  <Table.Td ta="right">
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemove(r.urun_id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Stack>
    </Modal>
  );
}
