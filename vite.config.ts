import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Served from https://<user>.github.io/aurora-tonight/
  base: '/aurora-tonight/',
  test: {
    environment: 'node',
  },
});
