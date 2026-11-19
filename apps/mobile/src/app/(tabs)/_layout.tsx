import { STRINGS } from '@aurora/core/i18n';
import { Tabs } from 'expo-router';
import { Icon } from '../../components/ui';
import { useAppState } from '../../state';
import { C, F } from '../../theme';

export default function TabsLayout() {
  const { lang } = useAppState();
  const S = STRINGS[lang];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: { backgroundColor: '#060a14', borderTopColor: C.border },
        tabBarActiveTintColor: C.aurora,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.bodyMed, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: S.nav.tonight, tabBarIcon: ({ color }) => <Icon name="moon" color={color} /> }} />
      <Tabs.Screen name="go" options={{ title: S.nav.go, tabBarIcon: ({ color }) => <Icon name="compass" color={color} /> }} />
      <Tabs.Screen name="alerts" options={{ title: S.alerts.tab, tabBarIcon: ({ color }) => <Icon name="bell" color={color} /> }} />
    </Tabs>
  );
}
