/**
 * Tonight, laid out as in the mock (design/app-mock, screen 1): the sky behind, the verdict, the best
 * spot nearby, tonight hour by hour; the reasons (factors, solar wind, next nights) one level down.
 * Same view model as the web (packages/core), rendered with native components.
 */
import { useForecastData, useNow, useViewModel, type ForecastData } from '@aurora/core/hooks';
import { useWhereToGo, worthTheDrive, type RankedSpot } from '@aurora/core/spots';
import { factors, highlightWindow, inWindow, isNowHour, nightRows, pct, sunTimesLine, tooltipRows, verdict, windStats, type Tone, type ViewModel } from '@aurora/core/view';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { SkyBackground } from '../../components/SkyBackground';
import { Card, Eyebrow, Icon, RichText, s, ScoreBadge, SectionTitle } from '../../components/ui';
import { useAppState } from '../../state';
import { C, F, scoreTint, SPOTS_BASE_URL } from '../../theme';

const TONE: Record<Tone, string> = { good: C.aurora, ok: C.warn, bad: C.bad };

export default function TonightScreen() {
  const { lang, loc } = useAppState();
  const now = useNow();
  const data = useForecastData(loc);
  const vm = useViewModel(lang, loc, data, now);
  const go = useWhereToGo(SPOTS_BASE_URL, loc, data, now, lang);
  const S = vm.S;
  const insets = useSafeAreaInsets();
  const best = go.ranked[0];
  const better = data.loaded && worthTheDrive(best, vm.headline) ? best : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SkyBackground score={data.loaded ? vm.headline : 0} />
      <ScrollView contentContainerStyle={[st.page, { paddingTop: insets.top + 12 }]}>
        <View style={st.topRow}>
          <Pressable onPress={() => router.push('/place')} style={st.placeBtn} accessibilityRole="button" accessibilityLabel={`${S.changeLocation}: ${loc.name}`}>
            <Icon name="pin" size={16} />
            <Text style={st.placeText} numberOfLines={1}>
              {loc.name}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.navigate('/alerts')} style={st.roundBtn} accessibilityRole="button" accessibilityLabel={S.alerts.tab}>
            <Icon name="bell" size={20} />
          </Pressable>
        </View>

        <View style={{ height: 72 }} />

        {data.loaded ? <Verdict vm={vm} /> : <Loading text={S.loading} />}
        {data.failed.length ? <Text style={st.notice}>{S.failed(data.failed.join(', '))}</Text> : null}

        {data.loaded ? (
          <>
            {better ? <BetterNearby r={better} vm={vm} /> : <GoTeaser label={S.nav.go} text={S.go.lead} />}
            <Hours vm={vm} />

            <Text style={st.levelTitle}>{S.why}</Text>
            <Look vm={vm} />
            <Factors vm={vm} />
            <Wind vm={vm} wind={data.wind} />
            <Nights vm={vm} kp={data.kp} />
            <Text style={st.footer}>
              {S.sources}: NOAA SWPC · MET Norway · Open-Meteo. {S.disclaimer}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
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
  const tint = scoreTint(vm.headline);
  return (
    <Card>
      <Eyebrow>
        {S.tonight} · {vm.fmt.day(vm.now)}
      </Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 10 }}>
        <Text style={[st.score, { color: tint }]}>{vm.headline}</Text>
        <View style={{ paddingBottom: 8, flexShrink: 1 }}>
          <Text style={[st.label, { color: tint }]}>{v.labelText}</Text>
          <Text style={[s.muted, { marginTop: 4 }]}>
            {S.tt.eye.toLowerCase()} {vm.headline} · {S.tt.camera.toLowerCase()} {vm.headlineCamera}
          </Text>
        </View>
      </View>
      <RichText text={v.sentence} style={[s.body, { fontSize: 16, lineHeight: 23, marginTop: 12 }]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {v.sources.map((src) => (
          <View key={src.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[st.dot, { backgroundColor: src.ok ? C.aurora : C.bad }]} />
            <Text style={[s.hint, { color: src.ok ? C.muted : C.bad }]}>{src.text}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** The mock's green card: the best spot within reach, when it clearly beats home. */
function BetterNearby({ r, vm }: { r: RankedSpot; vm: ViewModel }) {
  const S = vm.S;
  const w = r.window ?? r.cameraWindow;
  const meta = [S.go.drive(r.minutes, Math.round(r.km)), w ? S.go.window(vm.fmt.time(w.start), vm.fmt.time(w.end)) : null].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={() => router.navigate({ pathname: '/go', params: { spot: r.spot.id } })} accessibilityRole="link">
      <Card accent style={st.rowCard}>
        <ScoreBadge score={r.score} size={56} />
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow color="#8fe9bf">{S.go.betterNearby}</Eyebrow>
          <Text style={st.spotName} numberOfLines={1}>
            {r.spot.name}
          </Text>
          <Text style={s.muted}>{meta}</Text>
        </View>
        <Icon name="chevron" color={C.aurora} size={20} />
      </Card>
    </Pressable>
  );
}

function GoTeaser({ label, text }: { label: string; text: string }) {
  return (
    <Pressable onPress={() => router.navigate('/go')} accessibilityRole="link">
      <Card style={st.rowCard}>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow color={C.aurora}>{label}</Eyebrow>
          <Text style={s.muted}>{text}</Text>
        </View>
        <Icon name="chevron" color={C.muted} size={18} />
      </Card>
    </Pressable>
  );
}

/** Eye-bar colour, as on the web (apps/web/src/components/Timeline.tsx). */
function eyeColor(v: number): string {
  return v > 60 ? C.aurora : v > 35 ? C.cyan : '#26507a';
}

/**
 * Tonight hour by hour, the same chart as on the web: solid bars for the eye, a dashed outline for the
 * phone camera, a strip for clouds, the best window highlighted. Tap an hour for its details (the web's
 * tooltip; a phone has no hover).
 */
function Hours({ vm }: { vm: ViewModel }) {
  const { loc } = useAppState();
  const S = vm.S;
  const hours = vm.tonight.hours;
  const best = highlightWindow(vm);
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked !== null ? hours[picked] : undefined;
  const rows = sel ? tooltipRows(sel, S) : null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow>{S.hourByHour}</Eyebrow>
      </View>
      <View style={st.bars}>
        {hours.map((h, i) => (
          <Pressable
            key={h.time.getTime()}
            style={st.barCol}
            onPress={() => setPicked(picked === i ? null : i)}
            accessibilityRole="button"
            accessibilityLabel={`${vm.fmt.time(h.time)}: ${S.tt.eye} ${h.eye}, ${S.tt.camera} ${h.camera}`}
          >
            <View style={[st.barCam, { height: `${Math.max(3, h.camera)}%` }, inWindow(h, best) && st.barCamBest]} />
            <View
              style={[
                st.bar,
                { height: `${Math.max(3, h.eye)}%`, backgroundColor: eyeColor(h.eye), opacity: 0.35 + (h.eye / 100) * 0.65 },
              ]}
            />
            {isNowHour(h, vm.now) ? <View style={st.nowLine} /> : null}
            {picked === i ? <View style={st.pickLine} /> : null}
          </Pressable>
        ))}
      </View>
      <View style={st.hourRow}>
        {hours.map((h) => (
          <Text key={h.time.getTime()} style={st.hourLabel}>
            {vm.fmt.hour(h.time)}
          </Text>
        ))}
      </View>
      <View style={st.hourRow}>
        {hours.map((h) => (
          <View key={h.time.getTime()} style={[st.cloud, { opacity: h.cloud ? 0.08 + (1 - h.clear) * 0.7 : 0 }]} />
        ))}
      </View>
      <View style={st.legend}>
        <View style={st.legendItem}>
          <View style={[st.swatch, { backgroundColor: C.cyan }]} />
          <Text style={s.hint}>{S.legendEye}</Text>
        </View>
        <View style={st.legendItem}>
          <View style={[st.swatch, st.swatchCam]} />
          <Text style={s.hint}>{S.legendCamera}</Text>
        </View>
        <View style={st.legendItem}>
          <View style={[st.swatch, { backgroundColor: '#c9d6ea' }]} />
          <Text style={s.hint}>{S.legendCloud}</Text>
        </View>
      </View>
      {sel && rows ? (
        <View style={st.detail}>
          <Text style={st.detailTitle}>
            {vm.fmt.time(sel.time)}
            {rows.live ? ` · ${S.tt.live}` : ''}
          </Text>
          <View style={st.detailGrid}>
            {rows.rows.map((r) => (
              <View key={r.key} style={st.detailCell}>
                <Text style={st.k}>{S.tt[r.key]}</Text>
                <Text style={st.detailValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Text style={[s.hint, { marginTop: 10 }]}>{sunTimesLine(vm, loc)}</Text>
    </Card>
  );
}

function Look({ vm }: { vm: ViewModel }) {
  const v = verdict(vm);
  const S = vm.S;
  return (
    <Card style={{ flexDirection: 'row', gap: 12 }}>
      <Stat k={S.look} v={S.lookValue(v.direction, v.elevation)} />
      <Stat k={S.kpNeeded} v={vm.tonight.kpNeeded.toFixed(1)} />
      <Stat k={S.magLat} v={`${Math.abs(vm.tonight.mlat).toFixed(1)}°`} />
    </Card>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={st.k}>{k}</Text>
      <Text style={st.v}>{v}</Text>
    </View>
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
              {f.value} <Text style={{ fontSize: 13, color: C.muted, fontFamily: F.body }}>{f.sub}</Text>
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
                <Text style={{ fontSize: 11, color: C.muted, fontFamily: F.body }}> {w.unit}</Text>
              </Text>
              <Svg width="100%" height={34} viewBox="0 0 120 34" preserveAspectRatio="none">
                {w.spark.zeroY !== null ? <Line x1={0} x2={120} y1={w.spark.zeroY} y2={w.spark.zeroY} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 3" /> : null}
                {w.spark.path ? <Path d={w.spark.path} fill="none" stroke={w.color} strokeWidth={1.6} /> : null}
              </Svg>
              <Text style={{ fontSize: 11, color: w.good ? C.aurora : C.muted, fontFamily: F.body }}>{w.note}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={s.muted}>{vm.S.failed('solar wind')}</Text>
      )}
    </Card>
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
              <Text style={{ color: C.text, fontFamily: F.bodySemi }}>{n.name}</Text>
              <Text style={{ color: C.muted, fontSize: 11, fontFamily: F.body }}>{n.date}</Text>
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
  page: { padding: 16, paddingBottom: 40, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(14,22,40,0.72)', borderWidth: 1, borderColor: 'rgba(160,220,255,0.14)', flexShrink: 1 },
  placeText: { color: C.text, fontSize: 14, fontFamily: F.bodyMed, flexShrink: 1 },
  roundBtn: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,22,40,0.72)', borderWidth: 1, borderColor: 'rgba(160,220,255,0.14)' },
  score: { fontSize: 88, lineHeight: 84, fontFamily: F.num, letterSpacing: -3 },
  label: { fontSize: 22, fontFamily: F.numSemi },
  dot: { width: 7, height: 7, borderRadius: 4 },
  notice: { color: C.warn, fontSize: 13, fontFamily: F.body },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  spotName: { color: C.text, fontSize: 17, fontFamily: F.numSemi },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 120, marginTop: 14 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barCamBest: { borderColor: 'rgba(92,255,176,0.75)', backgroundColor: 'rgba(92,255,176,0.12)' },
  barCam: { position: 'absolute', left: 0, right: 0, bottom: 0, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(180,140,255,0.5)', borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: 'rgba(180,140,255,0.10)' },
  nowLine: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: C.text, opacity: 0.6 },
  pickLine: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(232,241,255,0.5)' },
  hourRow: { flexDirection: 'row', gap: 3, marginTop: 6 },
  hourLabel: { flex: 1, color: C.muted, fontSize: 9, textAlign: 'center', fontFamily: F.body },
  cloud: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#c9d6ea' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 8, borderRadius: 2 },
  swatchCam: { borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(180,140,255,0.7)', backgroundColor: 'rgba(180,140,255,0.15)' },
  detail: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(4,7,15,0.6)', borderWidth: 1, borderColor: C.border, gap: 8 },
  detailTitle: { color: C.text, fontFamily: F.numSemi, fontSize: 15 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  detailCell: { width: '33.33%', gap: 2 },
  detailValue: { color: C.text, fontFamily: F.numSemi, fontSize: 14 },
  levelTitle: { color: C.text, fontSize: 17, fontFamily: F.numSemi, marginTop: 10 },
  k: { color: C.faint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: F.bodyMed },
  v: { color: C.text, fontSize: 17, fontFamily: F.numSemi },
  status: { fontSize: 11, fontFamily: F.bodySemi, textTransform: 'uppercase', letterSpacing: 1 },
  weight: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  footer: { color: C.faint, fontSize: 11, lineHeight: 16, marginTop: 6, fontFamily: F.body },
});
