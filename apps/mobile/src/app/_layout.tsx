import { STRINGS } from '@aurora/core/i18n';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider, useAppState } from '../state';
import { C } from '../theme';

const queryClient = new QueryClient();

// Show alerts as a banner also when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  // React Native has no "tab hidden" event; tell TanStack Query when the app goes to the background
  // so refresh intervals pause, as on the web.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <StatusBar style="light" />
          <Screens />
        </AppStateProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const { lang } = useAppState();
  const S = STRINGS[lang];
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.text,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="place" options={{ presentation: 'modal', title: S.changeLocation }} />
      <Stack.Screen name="debug" options={{ title: 'Debug' }} />
    </Stack>
  );
}
