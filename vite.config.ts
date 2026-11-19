import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  // Web: served from https://<user>.github.io/aurora-tonight/
  // Android app (`--mode app`): Capacitor serves dist/ from the WebView root.
  base: mode === 'app' ? '/' : '/aurora-tonight/',
  test: {
    environment: 'node',
  },
}));
