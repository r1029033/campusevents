import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // In development the browser talks to Vite, which forwards /api to Express.
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  test: {
    environment: 'happy-dom'
  }
});
