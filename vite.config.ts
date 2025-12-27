import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the existing code structure
      'process.env': env
    },
    server: {
      host: true, // Listen on all addresses, including LAN and public addresses
      port: 3000
    },
    preview: {
      host: true,
      port: 3000
    }
  };
});