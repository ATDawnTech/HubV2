import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './components/ThemeProvider';
import { ConfigProvider } from 'antd';
import { Theme } from './utils/theme.ts';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ConfigProvider theme={Theme}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ConfigProvider>
    </AuthProvider>
  </React.StrictMode>
);
