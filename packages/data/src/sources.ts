/**
 * All network access lives here. Every fetcher returns typed, parsed data or throws;
 * the caller (main.ts) decides how a failed source degrades the page.
 * All endpoints are public, keyless and send `Access-Control-Allow-Origin: *`.
 */
import type { CloudPoint, KpBlock, KpKind } from '@aurora/model/night';
import { parseOvation, type OvationGrid, type OvationJson } from '@aurora/model/ovation';

const SWPC = 'https://services.swpc.noaa.gov';

async function getJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** SWPC time tags are UTC without a zone suffix. */
const utc = (tag: string) => new Date(tag.endsWith('Z') ? tag : `${tag}Z`);

/* ---------- Kp forecast (3-hour blocks, ~3 days ahead) ---------- */

interface KpRow {
  time_tag: string;
  kp: number;
  observed: KpKind;
}

export async function fetchKp(): Promise<KpBlock[]> {
  const rows = await getJson<KpRow[]>(`${SWPC}/products/noaa-planetary-k-index-forecast.json`);
  return rows.map((r) => ({ start: utc(r.time_tag), kp: Number(r.kp), kind: r.observed }));
}

/* ---------- OVATION nowcast ---------- */

export async function fetchOvation(): Promise<OvationGrid> {
  return parseOvation(await getJson<OvationJson>(`${SWPC}/json/ovation_aurora_latest.json`));
}

/* ---------- Real-time solar wind (1-minute) ---------- */

export interface SolarWindSample {
  time: Date;
  bz: number | null;
  speed: number | null;
  density: number | null;
}

interface MagRow {
  time_tag: string;
  active: boolean;
  bz_gsm: number | null;
}
interface WindRow {
  time_tag: string;
  active: boolean;
  proton_speed: number | null;
  proton_density: number | null;
}

/** Last `minutes` of solar wind, oldest first. Only rows from the spacecraft marked active. */
export async function fetchSolarWind(minutes = 120): Promise<SolarWindSample[]> {
  const [mag, wind] = await Promise.all([
    getJson<MagRow[]>(`${SWPC}/json/rtsw/rtsw_mag_1m.json`),
    getJson<WindRow[]>(`${SWPC}/json/rtsw/rtsw_wind_1m.json`),
  ]);
  const byTime = new Map<string, SolarWindSample>();
  const get = (tag: string) => {
    let s = byTime.get(tag);
    if (!s) byTime.set(tag, (s = { time: utc(tag), bz: null, speed: null, density: null }));
    return s;
  };
  for (const m of mag) if (m.active) get(m.time_tag).bz = m.bz_gsm;
  for (const w of wind)
    if (w.active) {
      const s = get(w.time_tag);
      s.speed = w.proton_speed;
      s.density = w.proton_density;
    }
  const all = [...byTime.values()].sort((a, b) => a.time.getTime() - b.time.getTime());
  const cutoff = Date.now() - minutes * 60_000;
  return all.filter((s) => s.time.getTime() >= cutoff);
}

/* ---------- MET Norway cloud cover ---------- */

interface MetNoJson {
  properties: {
    meta: { updated_at: string };
    timeseries: {
      time: string;
      data: {
        instant: {
          details: {
            cloud_area_fraction?: number;
            fog_area_fraction?: number;
            cloud_area_fraction_low?: number;
            cloud_area_fraction_medium?: number;
            cloud_area_fraction_high?: number;
          };
        };
      };
    }[];
  };
}

export interface CloudForecast {
  updated: Date;
  points: CloudPoint[];
}

export async function fetchClouds(lat: number, lon: number): Promise<CloudForecast> {
  // MET Norway asks for at most 4 decimals (better caching on their side).
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const json = await getJson<MetNoJson>(url);
  const pct = (x: number | undefined) => (x ?? 0) / 100;
  return {
    updated: new Date(json.properties.meta.updated_at),
    points: json.properties.timeseries.map((t) => {
      const d = t.data.instant.details;
      const low = pct(d.cloud_area_fraction_low);
      const mid = pct(d.cloud_area_fraction_medium);
      const high = pct(d.cloud_area_fraction_high);
      // `total` is MET's own overlap-aware value; fall back to random overlap if absent.
      const total = d.cloud_area_fraction !== undefined ? pct(d.cloud_area_fraction) : 1 - (1 - low) * (1 - mid) * (1 - high);
      return {
        time: new Date(t.time),
        cloud: { total, low, mid, high, ...(d.fog_area_fraction !== undefined ? { fog: pct(d.fog_area_fraction) } : {}) },
      };
    }),
  };
}

/* ---------- Place search ---------- */

export interface Location {
  name: string;
  /** "Rogaland, Norway" — for disambiguation in the picker. */
  region: string;
  lat: number;
  lon: number;
  tz: string;
}

interface GeoJson {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    timezone?: string;
    country?: string;
    admin1?: string;
  }[];
}

export async function searchPlaces(query: string, lang: string): Promise<Location[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=${lang}`;
  const json = await getJson<GeoJson>(url, 8000);
  return (json.results ?? []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));
}
