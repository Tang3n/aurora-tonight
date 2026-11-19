/** Tonight: the same view model as the web (packages/core), rendered with native components. */
import { useForecastData, useNow, useViewModel, type ForecastData } from '@aurora/core/hooks';
import { LANGS } from '@aurora/core/i18n';
import {
  factors,
  highlightWindow,
  inWindow,
  isNowHour,
  nightRows,
  pct,
  sunTimesLine,
  verdict,
  windStats,
  type Tone,
  type ViewModel,
} from '@aurora/core/view';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { Card, Eyebrow, Icon, RichText, s, SectionTitle } from '../../components/ui';
import { useAppState } from '../../state';
import { C } from '../../theme';

const TONE: Record<Tone, string> = { good: C.aurora, ok: C.warn, bad: C.bad };

export default function TonightScreen() {
  const { lang, setLang, loc } = useAppState();
  const now = useNow();
  const data = useForecastData(loc);
  const vm = useViewModel(lang, loc, data, now);
  const S = vm.S;
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[st.page, { paddingTop: insets.top + 12 }]}>
      <View style={st.topRow}>
        <Pressable onPress={() => router.push('/place')} style={st.placeBtn} accessibilityRole="button" accessibilityLabel={`${S.changeLocation}: ${loc.name}`}>
          <Icon name="pin" size={16} />
          <Text style={st.placeText} numberOfLines={1}>
            {loc.name}
          </Text>
        </Pressable>
        <View style={st.langs}>
          {LANGS.map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} style={[st.lang, l === lang && st.langOn]} accessibilityRole="button" accessibilityState={{ selected: l === lang }}>
              <Text style={{ color: l === lang ? C.text : C.muted, fontSize: 12, fontWeight: '600' }}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {data.loaded ? <Verdict vm={vm} /> : <Loading text={S.loading} />}

      {data.failed.length ? <Text style={st.notice}>{S.failed(data.failed.join(', '))}</Text> : null}

      {data.loaded ? (
        <>
          <Pressable style={[s.card, st.teaser]} onPress={() => router.navigate('/go')} accessibilityRole="link">
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow color={C.aurora}>{S.nav.go}</Eyebrow>
              <Text style={s.muted}>{S.go.lead}</Text>
            </View>
            <Icon name="chevron" color={C.aurora} size={18} />
          </Pressable>
          <Timeline vm={vm} />
          <Factors vm={vm} />
          <Wind vm={vm} wind={data.wind} />
          <Nights vm={vm} kp={data.kp} />
          <Text style={st.footer}>
            {S.sources}: NOAA SWPC · MET Norway · Open-Meteo. {S.disclaimer}
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function Wind({ vm, wind }: { vm: ViewModel; wind: ForecastData['wind'] }) {
    const stats = windStats(vm.S, wind);
    return (
      <Card>
        <SectionTitle hint={vm.S.live}>{vm.S.space}</SectionTitle>
        {stats ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {stats.map((w) => (
              <View key={w.label} style={{ flex: 1, gap: 4 }}>
                <Text style={st.k}>{w.label}</Text>
                <Text style={st.v}>
                  {w.value}
                  <Text style={{ fontSize: 11, color: C.muted }}> {w.unit}</Text>
                </Text>
                <Svg width="100%" height={34} viewBox="0 0 120 34" preserveAspectRatio="none">
                  {w.spark.zeroY !== null ? <Line x1={0} x2={120} y1={w.spark.zeroY} y2={w.spark.zeroY} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 3" /> : null}
                  {w.spark.path ? <Path d={w.spark.path} fill="none" stroke={w.color} strokeWidth={1.6} /> : null}
                </Svg>
                <Text style={{ fontSize: 11, color: w.good ? C.aurora : C.muted }}>{w.note}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={s.muted}>{vm.S.failed('solar wind')}</Text>
        )}
      </Card>
    );
}

function Loading({ text }: { text: string }) {
  return (
    <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
      <ActivityIndicator color={C.aurora} />
      <Text style={s.muted}>{text}</Text>
    </Card>
  );
}

function Verdict({ vm }: { vm: ViewModel }) {
  const v = verdict(vm);
  const S = vm.S;
  const color = v.dim ? C.muted : C.aurora;
  return (
    <Card style={{ gap: 10 }}>
      <Eyebrow>
        {S.tonight} · {vm.fmt.day(vm.now)}
      </Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
        <Text style={[st.score, { color }]}>{vm.headline}</Text>
        <View style={{ paddingBottom: 10, flexShrink: 1 }}>
          <Text style={[st.label, { color }]}>{v.labelText}</Text>
          <Text style={s.muted}>{S.eyeChance}</Text>
          <Text style={{ color: C.violet, fontSize: 13 }}>{S.camera(vm.headlineCamera)}</Text>
        </View>
      </View>
      <RichText text={v.sentence} style={[s.body, { fontSize: 17, lineHeight: 24 }]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {v.sources.map((src) => (
          <Text key={src.name} style={{ color: src.ok ? C.muted : C.bad, fontSize: 12 }}>
            ● {src.text}
          </Text>
        ))}
      </View>
      <View style={st.look}>
        <Stat k={S.look} v={S.lookValue(v.direction, v.elevation)} />
        <Stat k={S.kpNeeded} v={vm.tonight.kpNeeded.toFixed(1)} />
        <Stat k={S.magLat} v={`${Math.abs(vm.tonight.mlat).toFixed(1)}°`} />
      </View>
    </Card>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 4 }}>
      <Text style={st.k}>{k}</Text>
      <Text style={st.v}>{v}</Text>
    </View>
  );
}

function Timeline({ vm }: { vm: ViewModel }) {
  const { loc } = useAppState();
  const hours = vm.tonight.hours;
  const best = highlightWindow(vm);
  return (
    <Card>
      <SectionTitle hint={sunTimesLine(vm, loc)}>{vm.S.hourByHour}</SectionTitle>
      <View style={st.bars}>
        {hours.map((h) => {
          const now = isNowHour(h, vm.now);
          const color = h.eye > 60 ? C.aurora : h.eye > 35 ? C.cyan : '#26507a';
          return (
            <View key={h.time.getTime()} style={st.barCol} accessibilityLabel={`${vm.fmt.time(h.time)}: ${h.eye} / ${h.camera}`}>
              <View style={[st.barCam, { height: `${Math.max(3, h.camera)}%` }]} />
              <View style={[st.bar, { height: `${Math.max(3, h.eye)}%`, backgroundColor: color, opacity: inWindow(h, best) ? 1 : 0.55 }]} />
              {now ? <View style={st.nowLine} /> : null}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
        {hours.map((h, i) => (
          <Text key={h.time.getTime()} style={st.hourLabel}>
            {i % 2 === 0 ? vm.fmt.hour(h.time) : ''}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
        {hours.map((h) => (
          <View key={h.time.getTime()} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: '#c9d6ea', opacity: h.cloud ? 0.08 + (1 - h.clear) * 0.7 : 0 }} />
        ))}
      </View>
      <Text style={[s.muted, { marginTop: 10, fontSize: 11 }]}>
        ▮ {vm.S.legendEye}   ▯ {vm.S.legendCamera}   ▬ {vm.S.legendCloud}
      </Text>
    </Card>
  );
}

function Factors({ vm }: { vm: ViewModel }) {
  const { loc } = useAppState();
  return (
    <View style={{ gap: 10 }}>
      {factors(vm, loc, vm.now).map((f) => (
        <Card key={f.icon} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={st.v}>
              {f.value} <Text style={{ fontSize: 13, color: C.muted, fontWeight: '400' }}>{f.sub}</Text>
            </Text>
            <Text style={[st.status, { color: TONE[f.tone] }]}>{f.status}</Text>
          </View>
          <Text style={s.muted}>{f.text}</Text>
          <View style={st.weight}>
            <View style={{ width: `${pct(f.weight)}%`, height: '100%', borderRadius: 2, backgroundColor: TONE[f.tone] }} />
          </View>
        </Card>
      ))}
    </View>
  );
}

function Nights({ vm, kp }: { vm: ViewModel; kp: ForecastData['kp'] }) {
  const { loc } = useAppState();
  const rows = nightRows(vm.S, vm.fmt, kp, vm.now, loc.tz);
  return (
    <Card>
      <SectionTitle hint={vm.S.maxKp}>{vm.S.nextNights}</SectionTitle>
      {rows ? (
        rows.map((n) => (
          <View key={n.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
            <View style={{ width: 90 }}>
              <Text style={{ color: C.text, fontWeight: '600' }}>{n.name}</Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>{n.date}</Text>
            </View>
            <View style={[st.weight, { flex: 1 }]}>
              <View style={{ width: `${n.width}%`, height: '100%', borderRadius: 2, backgroundColor: C.cyan }} />
            </View>
            <Text style={[st.v, { width: 36, textAlign: 'right' }]}>{n.maxKp.toFixed(1)}</Text>
          </View>
        ))
      ) : (
        <Text style={s.muted}>{vm.S.failed('Kp')}</Text>
      )}
    </Card>
  );
}

const st = StyleSheet.create({
  page: { padding: 16, paddingBottom: 40, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  placeText: { color: C.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  langs: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  lang: { minWidth: 40, minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  langOn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  score: { fontSize: 88, fontWeight: '800', lineHeight: 92, letterSpacing: -3 },
  label: { fontSize: 22, fontWeight: '700' },
  look: { flexDirection: 'row', gap: 12, marginTop: 4 },
  k: { color: C.faint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  v: { color: C.text, fontSize: 17, fontWeight: '700' },
  notice: { color: C.warn, fontSize: 13 },
  teaser: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(92,255,176,0.3)' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 110 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barCam: { position: 'absolute', left: 0, right: 0, bottom: 0, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(180,140,255,0.45)', borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: 'rgba(180,140,255,0.08)' },
  nowLine: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: C.text, opacity: 0.6 },
  hourLabel: { flex: 1, color: C.faint, fontSize: 9, textAlign: 'center' },
  status: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  weight: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  footer: { color: C.faint, fontSize: 11, lineHeight: 16, marginTop: 6 },
});
