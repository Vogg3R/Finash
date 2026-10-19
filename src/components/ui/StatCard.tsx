import React from 'react';
import { Card, Group, Text, ThemeIcon } from '@mantine/core';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  hint?: React.ReactNode;
  /** Yalnızca anlam taşıyan durumlarda (ör. zarar) değeri renklendirmek için */
  valueColor?: string;
}

/** Panel, finans ve rapor ekranlarındaki özet kartları: değer siyah, renk yalnızca ikonda. */
export function StatCard({ label, value, icon, color = 'brand', hint, valueColor }: StatCardProps) {
  return (
    <Card padding="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text size="xs" c="dimmed" fw={600}>
          {label}
        </Text>
        {icon && (
          <ThemeIcon variant="light" color={color} size={30} radius="md">
            {icon}
          </ThemeIcon>
        )}
      </Group>
      <Text fz={26} fw={750} lh={1.1} mt={6} c={valueColor}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed" mt={4}>
          {hint}
        </Text>
      )}
    </Card>
  );
}
