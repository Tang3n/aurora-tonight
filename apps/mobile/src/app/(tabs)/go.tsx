/** Where to go: the same ranking as the web (useWhereToGo), on a native MapLibre map. */
import { useForecastData, useNow, useViewModel } from '@aurora/core/hooks';
import { TRAVEL_LIMITS, useWhereToGo, within, worthTheDrive, type RankedSpot, type TravelLimit } from '@aurora/core/spots';
import type { ViewModel } from '@aurora/core/view';
import { Camera, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, ScoreBadge, s } from '../../components/ui';
import { useAppState } from '../../state';
import { C, scoreColors, SPOTS_BASE_URL } from '../../theme';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';
const limitLabel = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);

export default function GoScreen() {
  const { lang, loc } = useAppState();
  const now = useNow();
  const data = useForecastData(loc);
  const vm = useViewModel(lang, loc, data, now);
  const S = vm.S;
  const go = useWhereToGo(SPOTS_BASE_URL, loc, data, now, lang);
  const [limit, setLimit] = useState<TravelLimit>(60);
  const [selected, setSelected] = useState<string | null>(null);
  const camera = useRef<CameraRef>(null);
  const insets = useSafeAreaInsets();
  const shown = within(go.ranked, limit);
  const homeScore = data.loaded ? vm.headline : null;

  const bounds = useMemo(() => {
    const pts = [[loc.lon, loc.lat], ...shown.map((r) => [r.spot.lon, r.spot.lat])] as [number, number][];
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as [number, number, number, number];
  }, [loc.lat, loc.lon, shown]);

  const select = (r: RankedSpot) => {
    setSelected(r.spot.id);
    camera.current?.easeTo({ center: [r.spot.lon, r.spot.lat], zoom: 10, duration: 600 });
  };

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.h1}>{S.go.title}</Text>
          <Text style={s.muted}>{S.go.lead}</Text>
        </View>
        {homeScore !== null ? <Text style={[st.home, { color: scoreColors(homeScore).bg === C.slate ? C.muted : scoreColors(homeScore).bg }]}>{S.go.home(homeScore)}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {TRAVEL_LIMITS.map((m) => (
          <Chip key={m} label={`≤ ${limitLabel(m)}`} on={m === limit} onPress={() => setLimit(m)} />
        ))}
      </View>
      <View style={st.mapBox}>
        <Map mapStyle={STYLE} style={StyleSheet.absoluteFill} attribution compass={false}>
          <Camera ref={camera} initialViewState={{ center: [loc.lon, loc.lat], zoom: 8 }} bounds={shown.length ? bounds : undefined} padding={{ top: 40, right: 40, bottom: 40, left: 40 }} />
          <Marker id="home" lngLat={[loc.lon, loc.lat]}>
            <View style={st.homePin}>
              <Text style={{ color: C.bg, fontSize: 11, fontWeight: '800' }}>{homeScore ?? '·'}</Text>
            </View>
          </Marker>
          {shown.map((r) => {
            const c = scoreColors(r.score);
            const on = r.spot.id === selected;
            return (
              <Marker key={r.spot.id} id={r.spot.id} lngLat={[r.spot.lon, r.spot.lat]}>
                <Pressable onPress={() => select(r)} style={[st.pin, { backgroundColor: c.bg, borderColor: on ? '#fff' : C.bg, transform: [{ scale: on ? 1.25 : 1 }] }]}>
                  <Text style={{ color: c.fg, fontSize: 10, fontWeight: '800' }}>{r.score}</Text>
                </Pressable>
              </Marker>
            );
          })}
        </Map>
      </View>
      <Text style={st.h2}>{S.go.within(limitLabel(limit))}</Text>
      {go.status === 'loading' ? <Text style={s.muted}>{S.go.loading}</Text> : null}
      {go.status === 'error' ? <Text style={s.muted}>{S.go.failed}</Text> : null}
      {go.noCoverage ? <Text style={s.muted}>{S.go.noSpots}</Text> : null}
      {go.status === 'ready' && !go.noCoverage && homeScore !== null && shown[0] && !worthTheDrive(shown[0], homeScore) ? (
        <Text style={s.muted}>{S.go.homeBest}</Text>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 40 }}
      data={shown.slice(0, 20)}
      keyExtractor={(r) => r.spot.id}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item }) => <SpotRow r={item} vm={vm} selected={item.spot.id === selected} onPress={() => select(item)} />}
      ListFooterComponent={
        <View style={{ marginTop: 12, gap: 4 }}>
          <Text style={st.fine}>{S.go.travelNote}</Text>
          {go.attribution ? <Text style={st.fine}>{S.go.attribution}</Text> : null}
        </View>
      }
    />
  );
}

function SpotRow({ r, vm, selected, onPress }: { r: RankedSpot; vm: ViewModel; selected: boolean; onPress(): void }) {
  const S = vm.S;
  const w = r.window ?? r.cameraWindow;
  const meta = [
    S.go.drive(r.minutes, Math.round(r.km)),
    w ? S.go.window(vm.fmt.time(w.start), vm.fmt.time(w.end)) : null,
    !r.window && r.cameraWindow ? S.go.cameraOnly : null,
    r.spot.facesNorth ? S.go.northView : null,
  ].filter(Boolean);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Card style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }, selected && { borderColor: 'rgba(92,255,176,0.6)' }]}>
        <ScoreBadge score={r.score} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
            {r.spot.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{meta.join(' · ')}</Text>
        </View>
        <Text style={{ color: C.violet, fontWeight: '700' }}>{r.camera}</Text>
      </Card>
    </Pressable>
  );
}

const st = StyleSheet.create({
  h1: { color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 4 },
  h2: { color: C.text, fontSize: 17, fontWeight: '700', marginTop: 4 },
  home: { fontSize: 14, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  mapBox: { height: 340, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.cardStrong },
  pin: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  homePin: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.text, borderWidth: 3, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  fine: { color: C.muted, fontSize: 11 },
});
