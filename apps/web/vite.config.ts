import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Em desenvolvimento o Vite repassa API e WebSocket para o back-end (mesma origem = cookies funcionam).
    proxy: {
      '/api': API_URL,
      '/socket.io': { target: API_URL, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
