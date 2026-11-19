/**
 * Builds the Android background runner (src/background/runner.ts) into one classic script.
 * Capacitor's BackgroundRunner evaluates it in a bare QuickJS context — no ES modules, no DOM —
 * so everything (model, suncalc, AACGM grid) is inlined into a single IIFE.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/runners',
    emptyOutDir: false, // runs after the app build into the same dist/
    target: 'es2020',
    minify: true,
    lib: {
      entry: 'src/background/runner.ts',
      formats: ['iife'],
      name: 'AuroraRunner',
      fileName: () => 'aurora.js',
    },
  },
});
