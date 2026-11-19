/**
 * Hindcast: run the app's own model on past hours and pair it with what the camera saw.
 *
 * Inputs (validation/data, see fetch.py / label.py):
 *   labels.csv        per-hour "structure" from the Kilpisjärvi keograms
 *   kp.txt            GFZ observed Kp (so this tests the physics given the true Kp,
 *                     not the skill of NOAA's Kp forecast)
 *   clouds_KIL.json   ERA5 reanalysis cloud cover (again the truth, not a forecast)
 *
 * Output: validation/data/hindcast.csv — one row per hour with the model's probabilities,
 * plus the old v1 model as a baseline.
 *
 *   npx vite build --ssr validation/hindcast.ts --outDir validation/dist && node validation/dist/hindcast.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import SunCalc from 'suncalc';
import { magneticLocalTime, toMagnetic } from '../packages/model/src/aacgm';
import { moonSkyRatio } from '../packages/model/src/astro';
import { kpValueAt, type KpBlock } from '../packages/model/src/night';
import { PARAMS, arcElevation, clearSky, expectedVisibility, skyBackground } from '../packages/model/src/visibility';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const STATION = { code: 'KIL', lat: 69.05, lon: 20.79 };
const DEG = 180 / Math.PI;

/* ---------- inputs ---------- */

function readKp(): KpBlock[] {
  const blocks: KpBlock[] = [];
  for (const line of readFileSync(join(DATA, 'kp.txt'), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const f = line.trim().split(/\s+/);
    const [y, m, d, h] = [Number(f[0]), Number(f[1]), Number(f[2]), Number(f[3])];
    if (y < 2025) continue;
    const kp = Number(f[7]);
    if (!Number.isFinite(kp) || kp < 0) continue;
    blocks.push({ start: new Date(Date.UTC(y, m - 1, d, Math.floor(h))), kp, kind: 'observed' });
  }
  return blocks;
}

interface Era5 {
  time: string[];
  cloud_cover: number[];
  cloud_cover_low: number[];
  cloud_cover_mid: number[];
  cloud_cover_high: number[];
}
const era5 = JSON.parse(readFileSync(join(DATA, `clouds_${STATION.code}.json`), 'utf8')) as Era5;
const cloudIndex = new Map(era5.time.map((t, i) => [`${t}:00Z`, i]));
function cloudAt(hourStartIso: string) {
  // ERA5 values are instantaneous at the full hour; average the hour's two ends.
  const t0 = new Date(hourStartIso);
  const keys = [t0, new Date(t0.getTime() + 3600_000)].map((d) => d.toISOString().slice(0, 16) + ':00Z');
  const idx = keys.map((k) => cloudIndex.get(k)).filter((i): i is number => i !== undefined);
  if (!idx.length) return null;
  const avg = (a: number[]) => idx.reduce((s, i) => s + (a[i] ?? 0), 0) / idx.length / 100;
  return { total: avg(era5.cloud_cover), low: avg(era5.cloud_cover_low), mid: avg(era5.cloud_cover_mid), high: avg(era5.cloud_cover_high) };
}

/* ---------- v1 model (baseline, as shipped before 2026-11-18 evening) ---------- */

function dipoleLat(lat: number, lon: number) {
  const r = Math.PI / 180;
  const s = Math.sin(lat * r) * Math.sin(80.8 * r) + Math.cos(lat * r) * Math.cos(80.8 * r) * Math.cos((lon + 72.8) * r);
  return Math.asin(s) * DEG;
}
function v1Activity(kp: number) {
  const need = Math.max(0, Math.min(9, 1 + (66.7 - Math.abs(dipoleLat(STATION.lat, STATION.lon))) / 2.6));
  return 1 / (1 + Math.exp(-(kp - need) * 1.8));
}
function v1Dark(sunAlt: number) {
  const t = Math.max(0, Math.min(1, (sunAlt + 6) / -9));
  return t * t * (3 - 2 * t);
}

/* ---------- run ---------- */

const kp = readKp();
const lines = readFileSync(join(DATA, 'labels.csv'), 'utf8').trim().split('\n');
const header = lines[0]!.split(',');
const col = (name: string) => header.indexOf(name);

const out: string[] = [
  'time,structure,kp,mlt,sun_alt,moon_ratio,moon_in_slice,cloud_total,clear,v_cam,v_eye,p_cam,p_eye,v1_p,arc_elev',
];
const { mlat, mlon } = toMagnetic(STATION.lat, STATION.lon, new Date('2026-01-01'));

for (const line of lines.slice(1)) {
  const f = line.split(',');
  if (f[col('station')] !== STATION.code || f[col('structure')] === '') continue;
  const time = f[col('time')]!;
  const start = new Date(time);
  const mid = new Date(start.getTime() + 1800_000);

  const k = kpValueAt(kp, mid);
  const cloud = cloudAt(time);
  if (k === null || !cloud) continue;

  const mlt = magneticLocalTime(mlon, mid);
  const sunAlt = SunCalc.getPosition(mid, STATION.lat, STATION.lon).altitude * DEG;
  const elev = arcElevation(Math.abs(mlat), mlt, k);
  const moon = moonSkyRatio(mid, STATION.lat, STATION.lon, { azimuthFromNorth: 0, elevation: Math.max(10, Math.min(60, elev)) });
  // Is the Moon inside the camera's north–south slice? (it then shows up as a bright blob)
  const mp = SunCalc.getMoonPosition(mid, STATION.lat, STATION.lon);
  const az = ((mp.azimuth * DEG + 180) % 360 + 360) % 360; // from north
  const moonInSlice = mp.altitude > 0 && (Math.min(Math.abs(az - 180), 360 - Math.abs(az - 180)) < 25 || az < 25 || az > 335);

  const bg = skyBackground(sunAlt, moon);
  const vCam = expectedVisibility(Math.abs(mlat), mlt, k, 'observed', PARAMS.thresholdCamera, bg);
  const vEye = expectedVisibility(Math.abs(mlat), mlt, k, 'observed', PARAMS.thresholdEye, bg);
  const clear = clearSky(cloud, 'camera');
  const clearEye = clearSky(cloud, 'eye');
  // v1: activity × sky(layers) × dark × moon(−30 % max), using the same clouds
  const v1Sky = (1 - cloud.low) * (1 - 0.7 * cloud.mid) * (1 - 0.3 * cloud.high);
  const moonIllum = SunCalc.getMoonIllumination(mid).fraction;
  const v1Moon = 1 - 0.3 * moonIllum * Math.max(0, Math.min(1, (mp.altitude * DEG) / 30));
  const v1 = v1Activity(k) * v1Sky * v1Dark(sunAlt) * v1Moon;

  out.push(
    [time, f[col('structure')], k.toFixed(2), mlt.toFixed(2), sunAlt.toFixed(1), moon.toFixed(2), moonInSlice ? 1 : 0,
      cloud.total.toFixed(2), clear.toFixed(3), vCam.toFixed(4), vEye.toFixed(4), (clear * vCam).toFixed(4),
      (clearEye * vEye).toFixed(4), v1.toFixed(4), elev.toFixed(1)].join(','),
  );
}

writeFileSync(join(DATA, 'hindcast.csv'), out.join('\n') + '\n');
console.log(`station ${STATION.code}: AACGM mlat ${mlat.toFixed(2)}, ${out.length - 1} hours → validation/data/hindcast.csv`);
