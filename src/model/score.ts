/**
 * Per-hour result and the summaries the UI needs (label, best window).
 * The physics lives in visibility.ts; this file only defines shapes and decisions on top of them.
 */
import type { CloudCover } from './visibility';

export type MissingInput = 'kp' | 'cloud';

export interface HourScore {
  time: Date;
  /** Chance to see aurora with the naked eye, 0..100. */
  eye: number;
  /** Chance a phone camera (long exposure) catches it, 0..100. */
  camera: number;
  /** Aurora visibility assuming a clear sky, 0..1 (eye / camera). */
  auroraEye: number;
  auroraCamera: number;
  /** Chance of a clear line of sight, 0..1. */
  clear: number;
  /** Sky brightness in multiples of a natural dark sky, and its parts. */
  background: number;
  twilight: number;
  moon: number;
  sunAltitude: number;
  moonIllumination: number;
  moonAltitude: number;
  /** Magnetic local time at the middle of the hour. */
  mlt: number;
  kp: number | null;
  cloud: CloudCover | null;
  /** Elevation of the arc's lower edge at the forecast Kp (90 = overhead). */
  arcElevation: number;
  /** Weight of the live OVATION nowcast in this hour, 0..1. */
  nowcastWeight: number;
  missing: MissingInput[];
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
 * Best viewing window: the contiguous run of hours around the peak that stay within 75 % of the
 * peak value (and above `min`). Null when nothing is worth going out for.
 */
export function bestWindow(hours: HourScore[], value: (h: HourScore) => number = (h) => h.eye, min = 20): Window | null {
  if (hours.length === 0) return null;
  let peakIdx = 0;
  hours.forEach((h, i) => {
    if (value(h) > value(hours[peakIdx]!)) peakIdx = i;
  });
  const peak = hours[peakIdx]!;
  if (value(peak) < min) return null;
  const cut = Math.max(min, value(peak) * 0.75);
  let a = peakIdx;
  let b = peakIdx;
  while (a > 0 && value(hours[a - 1]!) >= cut) a--;
  while (b < hours.length - 1 && value(hours[b + 1]!) >= cut) b++;
  return { start: hours[a]!.time, end: new Date(hours[b]!.time.getTime() + 3600_000), peak };
}
