import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  root: '.',
  resolve: {
    alias: {
      '@admin': path.resolve(__dirname, './blynkV5QR_Administrator/src'),
      '@shop': path.resolve(__dirname, './blynkV5QR_ShopOperator/src'),
      '@customer': path.resolve(__dirname, './blynkV5QR_Customer/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});
