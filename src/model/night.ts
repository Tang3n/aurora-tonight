/**
 * Builds tonight's hour-by-hour timeline by aligning sources with different resolutions:
 *   Kp        — 3-hour blocks (interpolated between block centres, with forecast uncertainty)
 *   clouds    — hourly points from MET Norway, averaged over ±1 h (cloud forecasts are noisy)
 *   sun/moon  — computed for the middle of each hour
 *   OVATION   — live nowcast, blended into the first hours and fading out after its forecast time
 */
import SunCalc from 'suncalc';
import { magneticLocalTime, toMagnetic } from './aacgm';
import { moonSkyRatio } from './astro';
import { type OvationGrid, ovationAt } from './ovation';
import type { HourScore, MissingInput } from './score';
import { HOUR, floorHour, localParts } from './time';
import {
  PARAMS,
  arcElevation,
  clearSky,
  expectedVisibility,
  kpNeeded,
  ovationVisibility,
  skyBackground,
  twilightExcess,
  type CloudCover,
} from './visibility';

const DEG = 180 / Math.PI;

export type KpKind = 'observed' | 'estimated' | 'predicted';

export interface KpBlock {
  start: Date;
  kp: number;
  kind: KpKind;
}

export interface CloudPoint {
  time: Date;
  cloud: CloudCover;
}

export interface Place {
  lat: number;
  lon: number;
}

export function sunAltitude(d: Date, p: Place): number {
  return SunCalc.getPosition(d, p.lat, p.lon).altitude * DEG;
}

/** Kp block containing t. */
export function kpAt(blocks: KpBlock[], t: Date): KpBlock | null {
  const ms = t.getTime();
  return blocks.find((b) => ms >= b.start.getTime() && ms < b.start.getTime() + 3 * HOUR) ?? null;
}

/**
 * Kp at an instant, linearly interpolated between the centres of neighbouring 3-hour blocks.
 * Geomagnetic activity changes continuously; a step function would make the timeline jump.
 */
export function kpValueAt(blocks: KpBlock[], t: Date): number | null {
  const own = kpAt(blocks, t);
  if (!own) return null;
  const ms = t.getTime();
  const centre = own.start.getTime() + 1.5 * HOUR;
  const neighbourStart = ms < centre ? own.start.getTime() - 3 * HOUR : own.start.getTime() + 3 * HOUR;
  const neighbour = blocks.find((b) => b.start.getTime() === neighbourStart);
  if (!neighbour) return own.kp;
  const w = Math.abs(ms - centre) / (3 * HOUR);
  return own.kp * (1 - w) + neighbour.kp * w;
}

/** Mean cloud cover of the points within ±90 min of t (null if none within 3 h). */
export function cloudAt(points: CloudPoint[], t: Date): CloudCover | null {
  const near = points.filter((p) => Math.abs(p.time.getTime() - t.getTime()) <= 1.5 * HOUR);
  if (!near.length) {
    let best: CloudPoint | null = null;
    for (const p of points)
      if (Math.abs(p.time.getTime() - t.getTime()) <= 3 * HOUR &&
        (!best || Math.abs(p.time.getTime() - t.getTime()) < Math.abs(best.time.getTime() - t.getTime())))
        best = p;
    return best?.cloud ?? null;
  }
  const avg = (k: keyof CloudCover) => near.reduce((s, p) => s + (p.cloud[k] ?? 0), 0) / near.length;
  const hasFog = near.every((p) => p.cloud.fog !== undefined);
  return { total: avg('total'), low: avg('low'), mid: avg('mid'), high: avg('high'), ...(hasFog ? { fog: avg('fog') } : {}) };
}

/**
 * Hour starts that make up "tonight": the next run of hours whose midpoint has the sun below
 * the horizon. If we're at the tail end of a night (fewer than 3 hours left), skip to the next
 * one. Capped at 18 hours for polar night.
 */
export function nightHours(now: Date, p: Place, maxHours = 18): Date[] {
  const start = floorHour(now);
  const isNight = (i: number) => sunAltitude(new Date(start.getTime() + i * HOUR + HOUR / 2), p) < 0;
  const runs: Date[][] = [];
  let run: Date[] = [];
  for (let i = 0; i < 48 && runs.length < 2; i++) {
    if (isNight(i) && run.length < maxHours) run.push(new Date(start.getTime() + i * HOUR));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  const first = runs[0];
  if (!first) return [];
  if (first.length < 3 && first[0]!.getTime() === start.getTime() && runs[1]) return runs[1];
  return first;
}

export interface TonightData {
  kp: KpBlock[] | null;
  clouds: CloudPoint[] | null;
  ovation: OvationGrid | null;
}

export interface Tonight {
  hours: HourScore[];
  mlat: number;
  kpNeeded: number;
}

/** Nowcast fades with τ = 50 min after OVATION's forecast time; stale grids are ignored. */
const NOWCAST_TAU = 50 * 60_000;
const OVATION_MAX_AGE = 20 * 60_000;

export function nowcastWeight(hourMid: Date, now: Date, grid: OvationGrid | null): number {
  if (!grid || now.getTime() - grid.observed.getTime() > OVATION_MAX_AGE) return 0;
  const after = hourMid.getTime() - grid.forecast.getTime();
  if (after <= 0) return 1;
  const w = Math.exp(-after / NOWCAST_TAU);
  return w < 0.02 ? 0 : w; // skip the grid scan once the nowcast no longer matters
}

/** Without a Kp forecast we assume a quiet-ish night with wide uncertainty. */
const FALLBACK_KP = 2;

export function buildTonight(now: Date, p: Place, data: TonightData): Tonight {
  const { mlat, mlon } = toMagnetic(p.lat, p.lon, now);
  const absMlat = Math.abs(mlat);
  const lookAzimuth = mlat >= 0 ? 0 : 180; // towards the magnetic pole

  const hours = nightHours(now, p).map((t): HourScore => {
    const mid = new Date(t.getTime() + HOUR / 2);
    const missing: MissingInput[] = [];
    const mlt = magneticLocalTime(mlon, mid);

    const block = data.kp ? kpAt(data.kp, mid) : null;
    const kp = data.kp ? kpValueAt(data.kp, mid) : null;
    if (kp === null) missing.push('kp');
    const kpMean = kp ?? FALLBACK_KP;
    const kind: KpKind = kp === null ? 'predicted' : (block?.kind ?? 'predicted');

    const cloud = data.clouds ? cloudAt(data.clouds, mid) : null;
    if (!cloud) missing.push('cloud');
    const clear = cloud ? clearSky(cloud) : 0.5;

    const sunAlt = sunAltitude(mid, p);
    const elevation = arcElevation(absMlat, mlt, kpMean);
    const viewElevation = Math.max(10, Math.min(60, elevation));
    const moon = moonSkyRatio(mid, p.lat, p.lon, { azimuthFromNorth: lookAzimuth, elevation: viewElevation });
    const twilight = Math.min(twilightExcess(sunAlt), 1e4);
    const background = skyBackground(sunAlt, moon);
    const moonPos = SunCalc.getMoonPosition(mid, p.lat, p.lon);

    const fromKp = (thr: number) => expectedVisibility(absMlat, mlt, kpMean, kind, thr, background);
    const w = nowcastWeight(mid, now, data.ovation);
    const blend = (thr: number) => {
      const k = fromKp(thr);
      if (w === 0 || !data.ovation) return k;
      const grid = data.ovation;
      const ov = ovationVisibility((la, lo) => ovationAt(grid, la, lo), p.lat, p.lon, thr, background);
      return w * ov + (1 - w) * k;
    };
    const auroraEye = blend(PARAMS.thresholdEye);
    const auroraCamera = Math.max(auroraEye, blend(PARAMS.thresholdCamera));

    return {
      time: t,
      eye: Math.round(100 * clear * auroraEye),
      camera: Math.round(100 * clear * auroraCamera),
      auroraEye,
      auroraCamera,
      clear,
      background,
      twilight,
      moon,
      sunAltitude: sunAlt,
      moonIllumination: SunCalc.getMoonIllumination(mid).fraction,
      moonAltitude: moonPos.altitude * DEG,
      mlt,
      kp,
      cloud,
      arcElevation: elevation,
      nowcastWeight: w,
      missing,
    };
  });

  return { hours, mlat, kpNeeded: kpNeeded(absMlat) };
}

export interface NightOutlook {
  /** Local date of the evening the night starts on. */
  date: string;
  maxKp: number;
}

/** Max Kp per night (blocks starting 15:00–05:59 local), for the next `count` nights. */
export function nightlyOutlook(blocks: KpBlock[], now: Date, tz: string, count = 3): NightOutlook[] {
  const keyOf = (d: Date) => localParts(new Date(d.getTime() - 12 * HOUR), tz).date;
  const today = keyOf(now);
  const map = new Map<string, number>();
  for (const b of blocks) {
    const h = localParts(b.start, tz).hour;
    if (h < 15 && h >= 6) continue;
    const key = keyOf(b.start);
    if (key < today) continue;
    map.set(key, Math.max(map.get(key) ?? 0, b.kp));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, count)
    .map(([date, maxKp]) => ({ date, maxKp }));
}
