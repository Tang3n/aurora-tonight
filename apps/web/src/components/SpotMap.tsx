/**
 * MapLibre GL JS map of ranked spots (ADR 6, ADR 13). OpenFreeMap "dark" vector tiles (OSM data, no
 * key). Spots are one GeoJSON source drawn as circles + score labels; the selection is shared with
 * the list. Imported only by the lazily loaded GoPage, so the Tonight page never loads MapLibre.
 */
import type { RankedSpot } from '@aurora/core/spots';
import { AVG_SPEED_KMH, ROAD_FACTOR } from '@aurora/core/spots';
import type { Location } from '@aurora/data/sources';
import { LngLatBounds, Map as MlMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 ships its worker as a separate ES module; Vite bundles it (with its imports) and gives the URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
import { useEffect, useRef } from 'react';
import { scoreTone, TONE_FILL, TONE_TEXT } from './score';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';

interface Props {
  home: Location;
  homeScore: number | null;
  spots: RankedSpot[];
  limitMinutes: number;
  selected: string | null;
  onSelect(id: string): void;
  label: string;
}

function spotsGeoJson(spots: RankedSpot[], selected: string | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: spots.map((r) => {
      const tone = scoreTone(r.score);
      return {
        type: 'Feature',
        id: r.spot.id,
        geometry: { type: 'Point', coordinates: [r.spot.lon, r.spot.lat] },
        properties: {
          id: r.spot.id,
          score: r.score,
          fill: TONE_FILL[tone],
          text: TONE_TEXT[tone],
          selected: r.spot.id === selected ? 1 : 0,
        },
      };
    }),
  };
}

/** Circle of the travel limit as straight-line radius, for orientation only. */
function radiusGeoJson(home: Location, minutes: number): GeoJSON.Feature {
  const km = ((minutes / 60) * AVG_SPEED_KMH) / ROAD_FACTOR;
  const coords: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    const dLat = (km / 111) * Math.cos(a);
    const dLon = (km / (111 * Math.cos((home.lat * Math.PI) / 180))) * Math.sin(a);
    coords.push([home.lon + dLon, home.lat + dLat]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
}

export function SpotMap({ home, homeScore, spots, limitMinutes, selected, onSelect, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const homeMarker = useRef<Marker | null>(null);
  const ready = useRef(false);
  const latest = useRef({ spots, selected, limitMinutes, home });
  latest.current = { spots, selected, limitMinutes, home };
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const m = new MlMap({
      container: container.current,
      style: STYLE,
      center: [home.lon, home.lat],
      zoom: 8,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      const { spots: s, selected: sel, limitMinutes: lim, home: h } = latest.current;
      m.addSource('radius', { type: 'geojson', data: radiusGeoJson(h, lim) });
      m.addLayer({
        id: 'radius',
        type: 'line',
        source: 'radius',
        paint: { 'line-color': '#5cffb0', 'line-opacity': 0.45, 'line-width': 1.2, 'line-dasharray': [2, 3] },
      });
      m.addSource('spots', { type: 'geojson', data: spotsGeoJson(s, sel) });
      m.addLayer({
        id: 'spots',
        type: 'circle',
        source: 'spots',
        paint: {
          'circle-color': ['get', 'fill'],
          'circle-radius': ['case', ['==', ['get', 'selected'], 1], 15, 12],
          'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#ffffff', '#04070f'],
          'circle-stroke-width': 2,
        },
      });
      m.addLayer({
        id: 'spot-scores',
        type: 'symbol',
        source: 'spots',
        layout: {
          'text-field': ['to-string', ['get', 'score']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': ['get', 'text'] },
      });
      m.on('click', 'spots', (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) onSelectRef.current(id);
      });
      m.on('mouseenter', 'spots', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'spots', () => (m.getCanvas().style.cursor = ''));
      ready.current = true;
      fit(m, h, s);
    });
    return () => {
      ready.current = false;
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; updates below
  }, []);

  // Home marker with its score.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const el = document.createElement('div');
    el.className = 'home-pin';
    el.textContent = homeScore === null ? '·' : String(homeScore);
    homeMarker.current?.remove();
    homeMarker.current = new Marker({ element: el }).setLngLat([home.lon, home.lat]).addTo(m);
  }, [home.lat, home.lon, homeScore]);

  // Data updates.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    (m.getSource('spots') as GeoJSONSource | undefined)?.setData(spotsGeoJson(spots, selected));
  }, [spots, selected]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    (m.getSource('radius') as GeoJSONSource | undefined)?.setData(radiusGeoJson(home, limitMinutes));
    fit(m, home, spots);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit when the limit or place changes, not on selection
  }, [limitMinutes, home.lat, home.lon, spots.length]);

  // Fly to a spot picked in the list.
  useEffect(() => {
    const m = map.current;
    const r = spots.find((s) => s.spot.id === selected);
    if (m && r) m.easeTo({ center: [r.spot.lon, r.spot.lat], zoom: Math.max(m.getZoom(), 10), duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selection changes
  }, [selected]);

  return <div ref={container} className="spot-map" role="region" aria-label={label} />;
}

function fit(m: MlMap, home: Location, spots: RankedSpot[]) {
  const b = new LngLatBounds([home.lon, home.lat], [home.lon, home.lat]);
  for (const r of spots) b.extend([r.spot.lon, r.spot.lat]);
  m.fitBounds(b, { padding: 48, maxZoom: 10, duration: 0 });
}
