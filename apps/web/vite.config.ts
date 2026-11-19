import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * GitHub Pages has no SPA fallback: a direct visit to /aurora-tonight/go would 404. Pages serves
 * 404.html for unknown paths, so a copy of index.html there lets the router take over.
 */
function spaFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  // Served from https://<user>.github.io/aurora-tonight/
  base: '/aurora-tonight/',
  plugins: [react(), spaFallback()],
  // MapLibre's worker is an ES module with imports; bundle workers as ES modules too.
  worker: { format: 'es' },
});
