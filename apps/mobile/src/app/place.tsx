/** Place picker (modal): search via Open-Meteo geocoding, or the phone's GPS. */
import { STRINGS } from '@aurora/core/i18n';
import { searchPlaces, type Location } from '@aurora/data/sources';
import * as ExpoLocation from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon, s } from '../components/ui';
import { useAppState } from '../state';
import { C } from '../theme';

export default function PlaceScreen() {
  const { lang, setLoc } = useAppState();
  const S = STRINGS[lang];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[] | null>(null);
  const [locating, setLocating] = useState(false);
  const seq = useRef(0);

  // Debounced search; a newer query wins even if an older one answers later (same as the web).
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults(null);
      return;
    }
    const id = setTimeout(async () => {
      const mine = ++seq.current;
      try {
        const found = await searchPlaces(text, lang === 'no' ? 'nb' : lang);
        if (mine === seq.current) setResults(found);
      } catch {
        if (mine === seq.current) setResults([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query, lang]);

  const choose = (l: Location) => {
    setLoc(l);
    router.back();
  };

  const useGps = async () => {
    setLocating(true);
    try {
      const { granted } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (!granted) return;
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = pos.coords;
      choose({ name: S.myLocation, region: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, gap: 12 }}>
      <TextInput
        autoFocus
        value={query}
        onChangeText={setQuery}
        placeholder={S.searchPlaceholder}
        placeholderTextColor={C.faint}
        style={st.input}
        returnKeyType="search"
        onSubmitEditing={() => results?.[0] && choose(results[0])}
        accessibilityLabel={S.searchPlaceholder}
      />
      <Pressable onPress={useGps} style={[s.card, st.gps]} accessibilityRole="button">
        {locating ? <ActivityIndicator color={C.aurora} /> : <Icon name="pin" color={C.aurora} size={18} />}
        <Text style={{ color: C.aurora, fontWeight: '700' }}>{locating ? S.locating : S.useMyLocation}</Text>
      </Pressable>
      <FlatList
        data={results ?? []}
        keyExtractor={(p, i) => `${p.lat},${p.lon},${i}`}
        ListEmptyComponent={results && !results.length ? <Text style={s.muted}>{S.noResults}</Text> : undefined}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => choose(item)} style={st.row} accessibilityRole="button">
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
            <Text style={s.muted}>{item.region}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(160,220,255,0.2)', backgroundColor: C.card, color: C.text, paddingHorizontal: 14, fontSize: 16 },
  gps: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 10 },
  row: { paddingVertical: 12, minHeight: 48, gap: 2 },
});
