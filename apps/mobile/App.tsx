import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { compare, runChecks } from './src/spike/checks';
import expected from './src/spike/expected.json';

const STAVANGER: [number, number] = [5.73, 58.97]; // [lon, lat]

export default function App() {
  const result = useMemo(() => {
    try {
      const actual = runChecks();
      const sections = (['timeZones', 'atob', 'magnetic', 'tonight'] as const).map((key) => ({
        key,
        ...compare(actual[key], (expected as Record<string, unknown>)[key]),
      }));
      return { error: null, sections };
    } catch (e) {
      return { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), sections: [] };
    }
  }, []);

  const engine = (globalThis as { HermesInternal?: unknown }).HermesInternal ? 'Hermes' : 'not Hermes';
  const allOk = !result.error && result.sections.every((s) => s.ok);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Aurora spike</Text>
        <Text style={styles.muted}>JS engine: {engine}</Text>
        <Text style={[styles.verdict, { color: allOk ? '#5cffb0' : '#ff7a8a' }]}>
          {allOk ? 'MODEL MATCHES NODE' : 'MISMATCH'}
        </Text>
        {result.error ? <Text style={styles.fail}>Crashed: {result.error}</Text> : null}
        {result.sections.map((s) => (
          <View key={s.key} style={styles.section}>
            <Text style={s.ok ? styles.pass : styles.fail}>
              {s.ok ? 'PASS' : 'FAIL'} · {s.key}
            </Text>
            {s.lines.slice(0, 6).map((l) => (
              <Text key={l} style={styles.line}>
                {l}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.subtitle}>MapLibre Native</Text>
        <View style={styles.map}>
          <Map mapStyle="https://demotiles.maplibre.org/style.json" style={StyleSheet.absoluteFill}>
            <Camera initialViewState={{ center: STAVANGER, zoom: 5 }} />
            <Marker id="stavanger" lngLat={STAVANGER}>
              <View style={styles.pin} />
            </Marker>
          </Map>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#04070f' },
  content: { padding: 16, paddingTop: 56, gap: 8 },
  title: { color: '#e8f1ff', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#e8f1ff', fontSize: 18, fontWeight: '600', marginTop: 12 },
  muted: { color: '#93a3bc' },
  verdict: { fontSize: 20, fontWeight: '700', marginVertical: 8 },
  section: { gap: 2 },
  pass: { color: '#5cffb0', fontWeight: '600' },
  fail: { color: '#ff7a8a', fontWeight: '600' },
  line: { color: '#c9d6ea', fontSize: 12 },
  map: { height: 320, borderRadius: 16, overflow: 'hidden' },
  pin: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#5cffb0', borderWidth: 2, borderColor: '#04070f' },
});
