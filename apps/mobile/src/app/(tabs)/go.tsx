/**
 * Where to go, as in the mock (design/app-mock, screen 2): a full-width map with the travel-time chips on
 * top and the ranked list in a sheet below. Same ranking as the web (useWhereToGo in packages/core).
 */
import { useForecastData, useNow, useViewModel } from '@aurora/core/hooks';
import { AVG_SPEED_KMH, ROAD_FACTOR, TRAVEL_LIMITS, useWhereToGo, within, worthTheDrive, type RankedSpot, type TravelLimit } from '@aurora/core/spots';
import type { ViewModel } from '@aurora/core/view';
import type { Location } from '@aurora/data/sources';
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, s, ScoreBadge } from '../../components/ui';
import { useAppState } from '../../state';
import { C, F, scoreColors, SPOTS_BASE_URL } from '../../theme';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';
const limitLabel = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);

/** Straight-line radius of the travel limit, drawn dashed for orientation (as on the web). */
function radius(home: Location, minutes: number): GeoJSON.Feature {
  const km = ((minutes / 60) * AVG_SPEED_KMH) / ROAD_FACTOR;
  const coords: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    coords.push([home.lon + (km / (111 * Math.cos((home.lat * Math.PI) / 180))) * Math.sin(a), home.lat + (km / 111) * Math.cos(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
}

export default function GoScreen() {
  const { lang, loc } = useAppState();
  const now = useNow();
  const data = useForecastData(loc);
  const vm = useViewModel(lang, loc, data, now);
  const S = vm.S;
  const go = useWhereToGo(SPOTS_BASE_URL, loc, data, now, lang);
  const params = useLocalSearchParams<{ spot?: string }>();
  const [limit, setLimit] = useState<TravelLimit>(60);
  const [selected, setSelected] = useState<string | null>(params.spot ?? null);
  const camera = useRef<CameraRef>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const mapH = Math.round(height * 0.48);
  const shown = within(go.ranked, limit);
  const homeScore = data.loaded ? vm.headline : null;
  const top = shown[0];

  const bounds = useMemo(() => {
    const pts: [number, number][] = [[loc.lon, loc.lat], ...shown.map((r) => [r.spot.lon, r.spot.lat] as [number, number])];
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as [number, number, number, number];
  }, [loc.lat, loc.lon, shown]);

  // Coming from "Better nearby" on Tonight: select that spot and fly to it.
  useEffect(() => {
    if (!params.spot) return;
    setSelected(params.spot);
    const r = go.ranked.find((x) => x.spot.id === params.spot);
    if (r) camera.current?.easeTo({ center: [r.spot.lon, r.spot.lat], zoom: 10, duration: 600 });
  }, [params.spot, go.ranked]);

  const select = (r: RankedSpot) => {
    setSelected(r.spot.id);
    camera.current?.easeTo({ center: [r.spot.lon, r.spot.lat], zoom: 10, duration: 600 });
  };

  const topWindow = top ? (top.window ?? top.cameraWindow) : null;
  const sheetHead = (
    <View style={{ gap: 4, paddingBottom: 12 }}>
      <View style={st.handle} />
      <Text style={st.h1}>
        {S.go.within(limitLabel(limit))}
        {topWindow ? `, ${vm.fmt.time(topWindow.start)} – ${vm.fmt.time(topWindow.end)}` : ''}
      </Text>
      {go.status === 'loading' ? <Text style={s.muted}>{S.go.loading}</Text> : null}
      {go.status === 'error' ? <Text style={s.muted}>{S.go.failed}</Text> : null}
      {go.noCoverage ? <Text style={s.muted}>{S.go.noSpots}</Text> : null}
      {go.status === 'ready' && !go.noCoverage && homeScore !== null && top && !worthTheDrive(top, homeScore) ? (
        <Text style={s.muted}>{S.go.homeBest}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ height: mapH }}>
        <Map mapStyle={STYLE} style={StyleSheet.absoluteFill} attribution compass={false}>
          <Camera
            ref={camera}
            initialViewState={{ center: [loc.lon, loc.lat], zoom: 8 }}
            bounds={shown.length ? bounds : undefined}
            padding={{ top: insets.top + 70, right: 30, bottom: 50, left: 30 }}
          />
          <GeoJSONSource id="radius" data={radius(loc, limit)}>
            <Layer id="radius-line" type="line" paint={{ 'line-color': '#5cffb0', 'line-opacity': 0.45, 'line-width': 1.2, 'line-dasharray': [2, 3] }} />
          </GeoJSONSource>
          {shown.map((r) => {
            const c = scoreColors(r.score);
            const on = r.spot.id === selected;
            return (
              <Marker key={r.spot.id} id={r.spot.id} lngLat={[r.spot.lon, r.spot.lat]}>
                <Pressable onPress={() => select(r)} style={[st.pin, { backgroundColor: c.bg, borderColor: on ? '#fff' : C.bg, transform: [{ scale: on ? 1.3 : 1 }] }]}>
                  <Text style={{ color: c.fg, fontSize: 11, fontFamily: F.num }}>{r.score}</Text>
                </Pressable>
              </Marker>
            );
          })}
          <Marker id="home" lngLat={[loc.lon, loc.lat]}>
            <View style={{ alignItems: 'center' }}>
              <View style={st.homeDot} />
              {homeScore !== null ? <Text style={st.homeLabel}>{S.go.home(homeScore)}</Text> : null}
            </View>
          </Marker>
        </Map>
        <View style={[st.chips, { top: insets.top + 12 }]}>
          {TRAVEL_LIMITS.map((m) => (
            <Chip key={m} label={`≤ ${limitLabel(m)}`} on={m === limit} onPress={() => setLimit(m)} />
          ))}
        </View>
      </View>

      <FlatList
        style={st.sheet}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        data={shown.slice(0, 20)}
        keyExtractor={(r) => r.spot.id}
        ListHeaderComponent={sheetHead}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => <SpotRow r={item} vm={vm} selected={item.spot.id === selected} onPress={() => select(item)} />}
        ListFooterComponent={
          <View style={{ marginTop: 12, gap: 4 }}>
            <Text style={st.fine}>{S.go.travelNote}</Text>
            {go.attribution ? <Text style={st.fine}>{S.go.attribution}</Text> : null}
          </View>
        }
      />
    </View>
  );
}

function SpotRow({ r, vm, selected, onPress }: { r: RankedSpot; vm: ViewModel; selected: boolean; onPress(): void }) {
  const S = vm.S;
  const meta = [
    !r.window && r.cameraWindow ? S.go.cameraOnly : null,
    r.spot.facesNorth ? S.go.northView : null,
    r.spot.ele !== null ? `${r.spot.ele} m` : null,
  ].filter(Boolean);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Card style={[st.row, selected && { borderColor: 'rgba(92,255,176,0.6)' }]}>
        <ScoreBadge score={r.score} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.name} numberOfLines={1}>
            {r.spot.name}
          </Text>
          {meta.length ? <Text style={st.meta}>{meta.join(' · ')}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={st.drive}>≈ {r.minutes} min</Text>
          <Text style={[st.meta, { color: C.violet }]}>
            {S.tt.camera.toLowerCase()} {r.camera}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const st = StyleSheet.create({
  chips: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 8 },
  sheet: { flex: 1, marginTop: -24, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: C.border },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.slate, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  h1: { color: C.text, fontSize: 18, fontFamily: F.numSemi },
  pin: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  homeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.text, borderWidth: 3, borderColor: C.bg },
  homeLabel: { color: C.text, fontSize: 11, fontFamily: F.bodyMed, marginTop: 2, textShadowColor: '#000', textShadowRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  name: { color: C.text, fontSize: 15, fontFamily: F.numSemi },
  meta: { color: C.muted, fontSize: 12, fontFamily: F.body },
  drive: { color: '#c9d6ea', fontSize: 13, fontFamily: F.bodyMed },
  fine: { color: C.muted, fontSize: 11, fontFamily: F.body },
});
