import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.tang3n.auroratonight',
  appName: 'Aurora Tonight',
  webDir: 'dist',
  android: {
    backgroundColor: '#04070f',
  },
  ios: {
    backgroundColor: '#04070f',
    // The page pads itself with env(safe-area-inset-*) (viewport-fit=cover), like on Android.
    contentInset: 'never',
  },
  plugins: {
    // Light status-bar icons on the dark page, regardless of the phone's light/dark theme.
    SystemBars: {
      style: 'DARK',
    },
    BackgroundRunner: {
      label: 'io.github.tang3n.auroratonight.check',
      src: 'runners/aurora.js',
      event: 'check',
      repeat: true,
      // Android's WorkManager minimum. Kp and clouds change every 30–60 min, OVATION every 5;
      // 15 min is enough to catch an onset without draining the battery.
      interval: 15,
      autoStart: true,
    },
  },
};

export default config;
