import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
// Font uygulamaya gömülü: işletme bilgisayarında internet olmasa da yüklenir (NFR-03)
import '@fontsource-variable/manrope';
import App from './App';
import './index.css';

// Tek vurgu rengi: tüm birincil butonlar, aktif menü ve odak halkaları buradan gelir
const brand: MantineColorsTuple = [
  '#eef3ff',
  '#dbe4fe',
  '#b5c6f8',
  '#8ca6f2',
  '#6a8bed',
  '#547aea',
  '#4870e9',
  '#395fd0',
  '#2f54bb',
  '#2249a6',
];

const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: { brand },
  fontFamily: "'Manrope Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  headings: {
    fontFamily: "'Manrope Variable', system-ui, sans-serif",
    fontWeight: '700',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  shadows: {
    xs: '0 1px 2px rgba(16, 24, 40, 0.04)',
    sm: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
    md: '0 4px 12px rgba(16, 24, 40, 0.08)',
    lg: '0 12px 32px rgba(16, 24, 40, 0.12)',
  },
  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg', shadow: 'xs', padding: 'lg' } },
    Paper: { defaultProps: { radius: 'lg', withBorder: true } },
    Alert: { defaultProps: { radius: 'md', variant: 'light' } },
    Modal: {
      defaultProps: {
        radius: 'lg',
        centered: true,
        overlayProps: { backgroundOpacity: 0.35, blur: 3 },
      },
      styles: { title: { fontWeight: 700, fontSize: 'var(--mantine-font-size-lg)' } },
    },
    Button: { defaultProps: { radius: 'md' } },
    Badge: { defaultProps: { radius: 'sm', variant: 'light' } },
    Table: {
      defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'md', highlightOnHover: true },
      styles: {
        th: {
          fontSize: 'var(--mantine-font-size-xs)',
          fontWeight: 600,
          color: 'var(--mantine-color-dimmed)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        },
      },
    },
    Tabs: { defaultProps: { radius: 'md' } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 300 } },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light" forceColorScheme="light">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
