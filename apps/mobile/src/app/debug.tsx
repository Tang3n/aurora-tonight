/**
 * Hidden debug screen (Alerts → Debug): the portability checks from the 2026-11-19 spike (model on
 * Hermes vs Node), and a dry run of the background alert check.
 */
import type { AlertDecision } from '@aurora/core/alerts';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { runAlertCheck } from '../background/task';
import { Card, s } from '../components/ui';
import { compare, runChecks } from '../spike/checks';
import expected from '../spike/expected.json';
import { C } from '../theme';

export default function DebugScreen() {
  const checks = useMemo(() => {
    try {
      const actual = runChecks();
      return (['timeZones', 'atob', 'magnetic', 'tonight'] as const).map((key) => ({
        key,
        ...compare(actual[key], (expected as Record<string, unknown>)[key]),
      }));
    } catch (e) {
      return [{ key: 'crash', ok: false, lines: [String(e)] }];
    }
  }, []);
  const engine = (globalThis as { HermesInternal?: unknown }).HermesInternal ? 'Hermes' : 'not Hermes';
  const [dry, setDry] = useState<AlertDecision | string | null>(null);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card style={{ gap: 6 }}>
        <Text style={{ color: C.text, fontWeight: '700' }}>Model vs Node ({engine})</Text>
        {checks.map((c) => (
          <View key={c.key}>
            <Text style={{ color: c.ok ? C.aurora : C.bad, fontWeight: '700' }}>
              {c.ok ? 'PASS' : 'FAIL'} · {c.key}
            </Text>
            {c.lines.slice(0, 4).map((l) => (
              <Text key={l} style={s.muted}>
                {l}
              </Text>
            ))}
          </View>
        ))}
      </Card>
      <Pressable
        style={[s.card, { alignItems: 'center' }]}
        accessibilityRole="button"
        onPress={async () => {
          setDry('…');
          try {
            setDry(await runAlertCheck(new Date(), { dryRun: true }));
          } catch (e) {
            setDry(String(e));
          }
        }}
      >
        <Text style={{ color: C.aurora, fontWeight: '700' }}>Dry-run alert check</Text>
      </Pressable>
      {dry ? (
        <Card>
          <Text style={{ color: C.text, fontFamily: 'monospace', fontSize: 12 }}>{typeof dry === 'string' ? dry : JSON.stringify(dry, null, 2)}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}
