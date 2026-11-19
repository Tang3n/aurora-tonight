import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Served from https://<user>.github.io/aurora-tonight/
  base: '/aurora-tonight/',
  plugins: [react()],
});
