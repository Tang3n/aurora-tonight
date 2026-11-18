/**
 * AACGM-v2 magnetic coordinates and magnetic local time (MLT) in the browser.
 *
 * Aurora is organised by the magnetic field, and the simple centred dipole is off by
 * 3–4° over southern Norway (Stavanger: dipole 59.6°, AACGM 56.2°). There is no JS port of
 * AACGM-v2, so tools/gen_aacgm_grid.py precomputes a 2° grid at 110 km for two epochs; here we
 * interpolate bilinearly (longitude via sin/cos) and linearly in time. Error < 0.02° at 40–80°.
 */
import { AACGM_EPOCHS, AACGM_LATS, AACGM_LON_STEP, AACGM_MISSING } from './aacgmGrid.generated';
import { dipoleLongitude, subsolarPoint } from './astro';

const RAD = Math.PI / 180;
const NLON = 360 / AACGM_LON_STEP;

function decode(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

interface Epoch {
  year: number;
  mlat: Int16Array;
  mlon: Int16Array;
}
let epochs: Epoch[] | null = null;
const getEpochs = () =>
  (epochs ??= AACGM_EPOCHS.map((e) => ({ year: e.year, mlat: decode(e.mlat), mlon: decode(e.mlon) })));

export interface Magnetic {
  /** AACGM-v2 latitude at 110 km, degrees (negative in the south). */
  mlat: number;
  /** AACGM-v2 longitude, degrees −180..180. */
  mlon: number;
}

/** Row index i such that LATS[i] ≤ lat ≤ LATS[i+1] within one hemisphere, or null near the equator. */
function rowFor(lat: number): { i: number; t: number } | null {
  const L = AACGM_LATS;
  const clamped = Math.max(L[0]!, Math.min(L[L.length - 1]!, lat));
  for (let i = 0; i < L.length - 1; i++) {
    const a = L[i]!;
    const b = L[i + 1]!;
    if (b - a !== AACGM_LON_STEP) continue; // the gap between −30° and +30°
    if (clamped >= a && clamped <= b) return { i, t: (clamped - a) / (b - a) };
  }
  return null;
}

function sample(e: Epoch, lat: number, lon: number): Magnetic | null {
  const row = rowFor(lat);
  if (!row) return null;
  const x = ((((lon % 360) + 360) % 360) / AACGM_LON_STEP);
  const j0 = Math.floor(x) % NLON;
  const j1 = (j0 + 1) % NLON;
  const u = x - Math.floor(x);
  let mlat = 0;
  let s = 0;
  let c = 0;
  const corners: [number, number, number][] = [
    [row.i, j0, (1 - row.t) * (1 - u)],
    [row.i, j1, (1 - row.t) * u],
    [row.i + 1, j0, row.t * (1 - u)],
    [row.i + 1, j1, row.t * u],
  ];
  for (const [ri, cj, w] of corners) {
    const idx = ri * NLON + cj;
    const la = e.mlat[idx]!;
    const lo = e.mlon[idx]!;
    if (la === AACGM_MISSING || lo === AACGM_MISSING) return null;
    mlat += w * (la / 100);
    s += w * Math.sin((lo / 100) * RAD);
    c += w * Math.cos((lo / 100) * RAD);
  }
  return { mlat, mlon: Math.atan2(s, c) / RAD };
}

/** Centred-dipole fallback for latitudes the grid does not cover (|lat| < 30°). */
function dipole(lat: number, lon: number): Magnetic {
  const φ = lat * RAD;
  const φp = 80.8 * RAD;
  const Δλ = (lon + 72.7) * RAD;
  const sm = Math.sin(φ) * Math.sin(φp) + Math.cos(φ) * Math.cos(φp) * Math.cos(Δλ);
  return { mlat: Math.asin(Math.max(-1, Math.min(1, sm))) / RAD, mlon: dipoleLongitude(lat, lon) };
}

export function toMagnetic(lat: number, lon: number, when: Date = new Date()): Magnetic {
  const [a, b] = getEpochs() as [Epoch, Epoch];
  const year = when.getUTCFullYear() + when.getUTCMonth() / 12;
  const t = Math.max(0, Math.min(1, (year - a.year) / (b.year - a.year)));
  const ma = sample(a, lat, lon);
  const mb = sample(b, lat, lon);
  if (!ma || !mb) return dipole(lat, lon);
  const s = (1 - t) * Math.sin(ma.mlon * RAD) + t * Math.sin(mb.mlon * RAD);
  const c = (1 - t) * Math.cos(ma.mlon * RAD) + t * Math.cos(mb.mlon * RAD);
  return { mlat: (1 - t) * ma.mlat + t * mb.mlat, mlon: Math.atan2(s, c) / RAD };
}

/**
 * Magnetic local time in hours (0 = magnetic midnight, when the oval reaches furthest equatorward).
 * AACGM defines MLT = 12 + (mlon − mlon_ref)/15 with mlon_ref the AACGM longitude of the subsolar
 * point; we approximate mlon_ref by the dipole longitude of the subsolar point. Checked against
 * aacgmv2.convert_mlt in the unit tests (error < 3 min after the fitted offset).
 */
export const MLT_REF_OFFSET = 0.95; // fitted: removes a constant +3.2 min bias vs aacgmv2

export function magneticLocalTime(mlon: number, when: Date): number {
  const ss = subsolarPoint(when);
  const ref = dipoleLongitude(ss.lat, ss.lon) + MLT_REF_OFFSET;
  const mlt = 12 + (mlon - ref) / 15;
  return ((mlt % 24) + 24) % 24;
}
