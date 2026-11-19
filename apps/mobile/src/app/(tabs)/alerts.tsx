/** Alerts: turn device-side alerts on/off and pick the threshold. The check itself is background/task.ts. */
import { ALERT_THRESHOLDS } from '@aurora/core/alerts';
import { LANGS, STRINGS } from '@aurora/core/i18n';
import { labelFor } from '@aurora/model/score';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notify, setAlertTaskRegistered } from '../../background/task';
import { Card, Chip, s } from '../../components/ui';
import { readAlertPrefs, readLastCheck, type LastCheck } from '../../prefs';
import { useAppState } from '../../state';
import { C, F } from '../../theme';

export default function AlertsScreen() {
  const { lang, setLang, alerts, setAlerts } = useAppState();
  const S = STRINGS[lang];
  const insets = useSafeAreaInsets();
  const [denied, setDenied] = useState(false);
  const [lastNight, setLastNight] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<LastCheck | null>(null);

  // The background task writes these; re-read whenever the tab is shown, and when the app comes back
  // to the foreground while this tab is open (focus does not change then).
  const refresh = useCallback(() => {
    setLastNight(readAlertPrefs().lastNight);
    setLastCheck(readLastCheck());
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const toggle = async (on: boolean) => {
    if (on) {
      const { granted } = await Notifications.requestPermissionsAsync();
      setDenied(!granted);
      if (!granted) return;
    }
    setAlerts({ ...alerts, enabled: on });
    await setAlertTaskRegistered(on);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 14 }}>
      <Text style={st.h1}>{S.alerts.title}</Text>
      <Text style={s.muted}>{S.alerts.lead}</Text>

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: C.text, fontSize: 16, fontFamily: F.numSemi, flex: 1 }}>{S.alerts.enable}</Text>
          <Switch
            value={alerts.enabled}
            onValueChange={toggle}
            trackColor={{ true: C.aurora, false: '#2a3850' }}
            thumbColor={alerts.enabled ? '#04120b' : C.muted}
            accessibilityLabel={S.alerts.enable}
          />
        </View>
        {denied ? <Text style={{ color: C.bad }}>{S.alerts.permissionDenied}</Text> : null}
        <View style={{ gap: 8, opacity: alerts.enabled ? 1 : 0.5 }}>
          <Text style={st.k}>{S.alerts.threshold}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {ALERT_THRESHOLDS.map((t) => (
              <Chip key={t} label={S.alerts.thresholdOption(t, S.labels[labelFor(t)])} on={alerts.threshold === t} onPress={() => setAlerts({ ...alerts, threshold: t })} />
            ))}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={st.k}>{S.alerts.language}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {LANGS.map((l) => (
            <Chip key={l} label={l.toUpperCase()} on={l === lang} onPress={() => setLang(l)} />
          ))}
        </View>
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={{ color: C.text, fontFamily: F.bodyMed }}>{lastNight ? S.alerts.lastSent(lastNight) : S.alerts.never}</Text>
        {lastCheck ? (
          <Text style={s.muted}>
            {new Date(lastCheck.at).toLocaleString()} · {lastCheck.score} · {lastCheck.reason}
          </Text>
        ) : null}
        <Text style={[s.muted, { marginTop: 6 }]}>{S.alerts.howItWorks}</Text>
      </Card>

      <Pressable style={[s.card, { alignItems: 'center' }]} onPress={() => notify(S.alerts.notifTitle(42, S.labels.maybe), S.alerts.test)} accessibilityRole="button">
        <Text style={{ color: C.aurora, fontFamily: F.bodySemi }}>{S.alerts.test}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/debug')} accessibilityRole="button">
        <Text style={{ color: C.faint, fontSize: 12, textAlign: 'center', fontFamily: F.body }}>Debug</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h1: { color: C.text, fontSize: 26, fontFamily: F.num, lineHeight: 30 },
  k: { color: C.faint, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: F.bodyMed },
});
