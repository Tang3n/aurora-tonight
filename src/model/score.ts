/**
 * Scoring model. Pure functions only — no fetching, no DOM — so every rule is unit-testable.
 *
 *   score(hour) = 100 × activity × sky × dark × moon        (each factor 0..1)
 *
 * Multiplication is deliberate: any single blocker (daylight, overcast) kills the score,
 * which matches reality — a Kp 8 storm behind clouds is still a "no".
 */

export interface Cloud {
  /** Fractions 0..1 per layer. */
  low: number;
  mid: number;
  high: number;
}

export interface HourInput {
  time: Date;
  /** Planetary Kp for this hour (from the 3-hour forecast), null if unavailable. */
  kp: number | null;
  cloud: Cloud | null;
  /** Degrees above horizon. */
  sunAltitude: number;
  moon: { illumination: number; altitude: number };
  /** Nowcast only: OVATION visibility near the user (0..100), null/undefined for later hours. */
  ovation?: number | null;
  /** Nowcast only: interplanetary magnetic field Bz in nT (GSM). Negative = southward = good. */
  bz?: number | null;
}

export interface Factors {
  activity: number;
  sky: number;
  dark: number;
  moon: number;
}

export type MissingInput = 'kp' | 'cloud';

export interface HourScore {
  time: Date;
  score: number;
  factors: Factors;
  input: HourInput;
  /** Inputs that were missing and replaced with a cautious default. */
  missing: MissingInput[];
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Hermite smoothstep from edge0 to edge1 (works with edge0 > edge1 too). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/** 0.5 exactly at the threshold, ~0.86 one Kp above, ~0.14 one Kp below. */
export function activityFromKp(kp: number, needed: number): number {
  return logistic((kp - needed) * 1.8);
}

/** OVATION visibility (percent) → 0..1. Below ~2 % nothing is visible, ~25 % is a clear show. */
export function activityFromOvation(percent: number): number {
  return smoothstep(2, 25, percent);
}

/** Southward Bz feeds energy into the magnetosphere within ~30–60 min; boost or damp by ±15 %. */
export function bzModifier(bz: number): number {
  return Math.max(0.85, Math.min(1.15, 1 - bz * 0.03));
}

export function activityFactor(input: HourInput, needed: number): number {
  const fromKp = input.kp === null ? 0.25 : activityFromKp(input.kp, needed);
  if (input.ovation === undefined || input.ovation === null) return fromKp;
  // Nowcast hour: OVATION is a direct model of the oval right now, Kp is a coarse 3-hour index.
  let a = 0.6 * activityFromOvation(input.ovation) + 0.4 * fromKp;
  if (typeof input.bz === 'number') a *= bzModifier(input.bz);
  return clamp01(a);
}

/**
 * Probability of seeing through the cloud layers. Low cloud blocks almost everything,
 * high thin cirrus only dims the aurora.
 */
export function skyFactor(cloud: Cloud | null): number {
  if (!cloud) return 0.5;
  return clamp01((1 - cloud.low) * (1 - 0.7 * cloud.mid) * (1 - 0.3 * cloud.high));
}

/** 0 while the sun is above −6° (civil twilight), 1 from −15° on. */
export function darkFactor(sunAltitude: number): number {
  return smoothstep(-6, -15, sunAltitude);
}

/** A bright, high moon brightens the sky and hides faint aurora; worst case −30 %. */
export function moonFactor(illumination: number, altitude: number): number {
  return 1 - 0.3 * clamp01(illumination) * clamp01(altitude / 30);
}

export function scoreHour(input: HourInput, needed: number): HourScore {
  const factors: Factors = {
    activity: activityFactor(input, needed),
    sky: skyFactor(input.cloud),
    dark: darkFactor(input.sunAltitude),
    moon: moonFactor(input.moon.illumination, input.moon.altitude),
  };
  const missing: MissingInput[] = [];
  if (input.kp === null) missing.push('kp');
  if (input.cloud === null) missing.push('cloud');
  const score = Math.round(100 * factors.activity * factors.sky * factors.dark * factors.moon);
  return { time: input.time, score, factors, input, missing };
}

export type Label = 'no' | 'unlikely' | 'maybe' | 'good' | 'great';

export function labelFor(score: number): Label {
  if (score < 10) return 'no';
  if (score < 30) return 'unlikely';
  if (score < 50) return 'maybe';
  if (score < 70) return 'good';
  return 'great';
}

export interface Window {
  start: Date;
  /** Exclusive: end of the last hour in the window. */
  end: Date;
  peak: HourScore;
}

/**
 * Best viewing window: the contiguous run of hours around the peak that stay
 * within 75 % of the peak score (and above 20). Null when nothing is worth going out for.
 */
export function bestWindow(hours: HourScore[]): Window | null {
  if (hours.length === 0) return null;
  let peakIdx = 0;
  hours.forEach((h, i) => {
    if (h.score > hours[peakIdx]!.score) peakIdx = i;
  });
  const peak = hours[peakIdx]!;
  if (peak.score < 20) return null;
  const cut = Math.max(20, peak.score * 0.75);
  let a = peakIdx;
  let b = peakIdx;
  while (a > 0 && hours[a - 1]!.score >= cut) a--;
  while (b < hours.length - 1 && hours[b + 1]!.score >= cut) b++;
  return {
    start: hours[a]!.time,
    end: new Date(hours[b]!.time.getTime() + 3600_000),
    peak,
  };
}
