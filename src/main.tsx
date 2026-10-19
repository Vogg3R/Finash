import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import App from './App';
import './index.css';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  headings: {
    fontFamily: 'Outfit, sans-serif',
  },
  defaultRadius: 'md',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
