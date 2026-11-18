/**
 * Builds tonight's hour-by-hour timeline by aligning sources with different resolutions:
 *   Kp        — 3-hour blocks
 *   clouds    — hourly (later 6-hourly) points
 *   sun/moon  — computed for any instant
 *   OVATION, solar wind — only meaningful for the current hour (nowcast)
 */
import SunCalc from 'suncalc';
import { geomagneticLatitude, kpNeeded } from './magnetic';
import { scoreHour, type Cloud, type HourScore } from './score';
import { HOUR, floorHour, localParts } from './time';

const DEG = 180 / Math.PI;

export type KpKind = 'observed' | 'estimated' | 'predicted';

export interface KpBlock {
  start: Date;
  kp: number;
  kind: KpKind;
}

export interface CloudPoint {
  time: Date;
  cloud: Cloud;
}

export interface Nowcast {
  ovation: number | null;
  bz: number | null;
}

export interface Place {
  lat: number;
  lon: number;
}

export function sunAltitude(d: Date, p: Place): number {
  return SunCalc.getPosition(d, p.lat, p.lon).altitude * DEG;
}

export function moonAt(d: Date, p: Place): { illumination: number; altitude: number } {
  return {
    illumination: SunCalc.getMoonIllumination(d).fraction,
    altitude: SunCalc.getMoonPosition(d, p.lat, p.lon).altitude * DEG,
  };
}

/** Kp of the 3-hour block containing t. */
export function kpAt(blocks: KpBlock[], t: Date): KpBlock | null {
  const ms = t.getTime();
  return blocks.find((b) => ms >= b.start.getTime() && ms < b.start.getTime() + 3 * HOUR) ?? null;
}

/** Nearest cloud point within 3 hours (forecasts turn 6-hourly after ~2.5 days). */
export function cloudAt(points: CloudPoint[], t: Date): Cloud | null {
  let best: CloudPoint | null = null;
  let bestDist = 3 * HOUR + 1;
  for (const p of points) {
    const dist = Math.abs(p.time.getTime() - t.getTime());
    if (dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best?.cloud ?? null;
}

/**
 * Hour starts that make up "tonight": the next run of hours whose midpoint has the sun
 * below the horizon. If we're at the tail end of a night (fewer than 3 hours left),
 * skip to the following one. Capped at 18 hours for polar night.
 */
export function nightHours(now: Date, p: Place, maxHours = 18): Date[] {
  const start = floorHour(now);
  const isNight = (i: number) => sunAltitude(new Date(start.getTime() + i * HOUR + HOUR / 2), p) < 0;
  const runs: Date[][] = [];
  let run: Date[] = [];
  for (let i = 0; i < 48 && runs.length < 2; i++) {
    if (isNight(i) && run.length < maxHours) {
      run.push(new Date(start.getTime() + i * HOUR));
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  const first = runs[0];
  if (!first) return []; // midnight sun
  if (first.length < 3 && first[0]!.getTime() === start.getTime() && runs[1]) return runs[1];
  return first;
}

export interface TonightData {
  kp: KpBlock[] | null;
  clouds: CloudPoint[] | null;
  nowcast: Nowcast | null;
}

export interface Tonight {
  hours: HourScore[];
  magLat: number;
  kpNeeded: number;
}

export function buildTonight(now: Date, p: Place, data: TonightData): Tonight {
  const magLat = geomagneticLatitude(p.lat, p.lon);
  const needed = kpNeeded(magLat);
  const hours = nightHours(now, p).map((t) => {
    const mid = new Date(t.getTime() + HOUR / 2);
    const isNow = now.getTime() >= t.getTime() && now.getTime() < t.getTime() + HOUR;
    return scoreHour(
      {
        time: t,
        kp: data.kp ? (kpAt(data.kp, mid)?.kp ?? null) : null,
        cloud: data.clouds ? cloudAt(data.clouds, mid) : null,
        sunAltitude: sunAltitude(mid, p),
        moon: moonAt(mid, p),
        ovation: isNow ? (data.nowcast?.ovation ?? null) : undefined,
        bz: isNow ? (data.nowcast?.bz ?? null) : undefined,
      },
      needed,
    );
  });
  return { hours, magLat, kpNeeded: needed };
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
