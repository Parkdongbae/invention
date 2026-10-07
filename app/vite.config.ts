import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' → GitHub Pages 하위 경로 / 정적 호스팅 어디서든 동작
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'ssi-data': ['./src/data/ssiAwards.json'],
          'pdf-libs': ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});
