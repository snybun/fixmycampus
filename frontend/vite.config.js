import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/dist/' : '/',
  build: {
    outDir: '../public/dist',
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/health.php': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
}));

