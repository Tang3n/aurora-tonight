/**
 * Can an observer see the aurora? Physics instead of a "Kp minus threshold" curve.
 *
 *   P(see) = P(clear sky) × E_Kp[ V(mlat, MLT, Kp, background) ]
 *
 * V follows the light: oval boundary (Starkov) → distance → elevation above the horizon
 * (aurora's lower edge at 110 km, Earth curvature) → atmospheric extinction (Kasten & Young)
 * → contrast against a sky brightened by twilight and moonlight → detection threshold of the
 * eye (~1 kR, IBC I) or a phone camera (~0.1 kR).
 *
 * Calibration: the arc brightness at Kp 2 (B2) and its growth with hemispheric power (γ) were
 * fitted so the 50 % naked-eye line at magnetic midnight matches NOAA's Kp→latitude table
 * within 0.9°. Parameters marked "estimate" are not validated against observations yet.
 */
import { ovalBoundary } from './oval';

const R_EARTH = 6371;
const AURORA_HEIGHT_KM = 110;
const KM_PER_DEG = 111.2;

export const PARAMS = {
  /** Median zenith brightness of the discrete arc at Kp 2, kR of 557.7 nm (fitted). */
  B2: 3.0,
  /** Brightness ∝ hemispheric power^γ (fitted). */
  gamma: 0.5,
  /** Diffuse aurora relative to the discrete arc (estimate). */
  diffuseRatio: 0.2,
  /** Spread of brightness around the median, dex — substorms vs quiet arcs (estimate). */
  sigmaLogB: 0.5,
  /** Width of the detection curve, dex (estimate). */
  detectWidth: 0.25,
  /** Scatter of the boundary at fixed Kp, degrees (estimate, cf. Boakes 2008). */
  sigmaBoundary: 2.0,
  /** Detection thresholds against a dark sky, kR. */
  thresholdEye: 1.0,
  thresholdCamera: 0.1,
  /** Below ~2° terrain and haze block the view; fully open from 6° (estimate). */
  horizonFrom: 2,
  horizonTo: 6,
  /** Extinction, magnitudes per airmass (0.2–0.3 at sea level). */
  extinction: 0.25,
};

export type Detector = 'eye' | 'camera';

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Elevation (degrees) of a point at aurora height seen from `dKm` away along the ground. */
export function elevationAt(dKm: number, h = AURORA_HEIGHT_KM): number {
  if (dKm <= 0) return 90;
  const θ = dKm / R_EARTH;
  return (Math.atan2((R_EARTH + h) * Math.cos(θ) - R_EARTH, (R_EARTH + h) * Math.sin(θ)) * 180) / Math.PI;
}

/** Kasten & Young (1989) relative airmass. */
export function airmass(elevation: number): number {
  const z = 90 - elevation;
  return 1 / (Math.cos((z * Math.PI) / 180) + 0.50572 * Math.pow(96.07995 - z, -1.6364));
}

/** Hemispheric power in GW from Kp — Zhang & Paxton (2008). */
export function hemisphericPower(kp: number): number {
  return kp <= 5 ? 38.66 * Math.exp(0.1967 * kp) - 33.99 : 4.592 * Math.exp(0.4731 * kp) + 20.47;
}

export function arcBrightness(kp: number): number {
  return PARAMS.B2 * (hemisphericPower(kp) / hemisphericPower(2)) ** PARAMS.gamma;
}

// 5-point Gauss–Hermite-like weights for a lognormal brightness distribution.
const LOG_NODES: [number, number][] = [
  [-2, 0.054],
  [-1, 0.244],
  [0, 0.403],
  [1, 0.244],
  [2, 0.054],
];

/**
 * Probability of detecting a source `dKm` away (≤ 0 = overhead) with median zenith brightness
 * `zenithKr`, against a sky `background` times brighter than natural darkness.
 */
export function detect(dKm: number, zenithKr: number, threshold: number, background: number): number {
  const e = elevationAt(dKm);
  if (e <= 0) return 0;
  let b = zenithKr;
  // Deeper inside the oval the aurora is brighter: up to ×3 at 3° (≈ 330 km) depth (estimate).
  if (dKm < 0) b *= 10 ** (0.5 * Math.min(-dKm / (3 * KM_PER_DEG), 1));
  const transmission = 10 ** (-0.4 * PARAMS.extinction * airmass(e));
  const horizon = smoothstep(PARAMS.horizonFrom, PARAMS.horizonTo, e);
  const logThr = Math.log10(threshold * background);
  let s = 0;
  for (const [z, w] of LOG_NODES) {
    const logB = Math.log10(b * transmission) + z * PARAMS.sigmaLogB;
    s += w / (1 + Math.exp(-(logB - logThr) / PARAMS.detectWidth));
  }
  return horizon * s;
}

/** Visibility for a known Kp: discrete arc and diffuse glow, smeared by boundary uncertainty. */
export function visibility(absMlat: number, mlt: number, kp: number, threshold: number, background: number): number {
  const eq = ovalBoundary(kp, mlt, 'discrete');
  const df = ovalBoundary(kp, mlt, 'diffuse');
  const B = arcBrightness(kp);
  let s = 0;
  let w = 0;
  for (let i = -8; i <= 8; i++) {
    const dl = (i * PARAMS.sigmaBoundary) / 4;
    const wi = Math.exp(-0.5 * (dl / PARAMS.sigmaBoundary) ** 2);
    const arc = detect((eq + dl - absMlat) * KM_PER_DEG, B, threshold, background);
    const glow = detect((df + dl - absMlat) * KM_PER_DEG, PARAMS.diffuseRatio * B, threshold, background);
    s += wi * Math.max(arc, glow);
    w += wi;
  }
  return s / w;
}

/** Elevation of the arc's lower edge for a known Kp (90 = overhead). For the UI. */
export function arcElevation(absMlat: number, mlt: number, kp: number): number {
  return elevationAt((ovalBoundary(kp, mlt, 'discrete') - absMlat) * KM_PER_DEG);
}

export type KpKindLike = 'observed' | 'estimated' | 'predicted';

/**
 * Forecast Kp is uncertain: SWPC's daily-max verification gives RMSE ≈ 1.3 and forecasts of
 * Kp ≥ 3 run high. We spread forecast values N(Kp − 0.3, 1.2); observed/estimated N(Kp, 0.33).
 */
export function kpDistribution(kp: number, kind: KpKindLike): { kp: number; w: number }[] {
  const predicted = kind === 'predicted';
  const sigma = predicted ? 1.2 : 0.33;
  const mu = predicted && kp >= 3 ? kp - 0.3 : kp;
  const nodes = Array.from({ length: 28 }, (_, j) => j / 3);
  const ws = nodes.map((k) => Math.exp(-0.5 * ((k - mu) / sigma) ** 2));
  const sum = ws.reduce((a, b) => a + b, 0);
  return nodes.map((k, j) => ({ kp: k, w: ws[j]! / sum }));
}

export function expectedVisibility(
  absMlat: number,
  mlt: number,
  kp: number,
  kind: KpKindLike,
  threshold: number,
  background: number,
): number {
  let v = 0;
  for (const n of kpDistribution(kp, kind)) {
    if (n.w < 1e-4) continue;
    v += n.w * visibility(absMlat, mlt, n.kp, threshold, background);
  }
  return v;
}

/* ---------- sky background, in multiples of the natural dark sky ---------- */

/** Zenith sky brightness during twilight, mag/arcsec² (SQM: Schmude 2024, hnsky.org). */
const TWILIGHT: [number, number][] = [
  [-6, 13.5],
  [-9, 16.3],
  [-12, 19.5],
  [-15, 21.3],
  [-18, 22.0],
];

/** Extra sky brightness from twilight relative to the dark sky (0 = fully dark). */
export function twilightExcess(sunAltitude: number): number {
  if (sunAltitude >= -6) return 1e4; // daylight / civil twilight: nothing faint survives
  const alt = Math.max(-18, sunAltitude);
  let mag = 22;
  for (let i = 0; i < TWILIGHT.length - 1; i++) {
    const [a0, m0] = TWILIGHT[i]!;
    const [a1, m1] = TWILIGHT[i + 1]!;
    if (alt <= a0 && alt >= a1) mag = m0 + ((a0 - alt) / (a0 - a1)) * (m1 - m0);
  }
  return Math.max(0, 10 ** (-0.4 * (mag - 22)) - 1);
}

export function skyBackground(sunAltitude: number, moonRatio: number, lightPollution = 0): number {
  return 1 + twilightExcess(sunAltitude) + moonRatio + lightPollution;
}

/* ---------- clouds ---------- */

export interface CloudCover {
  /** Fractions 0..1. `total` is MET's own overlap-aware total. */
  total: number;
  low: number;
  mid: number;
  high: number;
  fog?: number;
}

/** Fraction of sky covered only by high cloud that still lets bright aurora through (estimate). */
const HIGH_ONLY_CREDIT = 0.4;

/**
 * Chance of a clear line of sight. MET's total cloud already handles layer overlap; layers only
 * give partial credit back when the sky is covered exclusively by high (thin, icy) cloud.
 */
export function clearSky(c: CloudCover): number {
  const lowMid = Math.min(c.total, 1 - (1 - c.low) * (1 - c.mid));
  const highOnly = Math.max(0, c.total - lowMid);
  let p = 1 - c.total + HIGH_ONLY_CREDIT * highOnly;
  if (c.fog !== undefined) p *= 1 - c.fog;
  return Math.max(0, Math.min(1, p));
}

/* ---------- nowcast: OVATION grid through the same light path ---------- */

/** OVATION's P ≥ 18 % boundary ≈ 1 erg cm⁻² s⁻¹ ≈ naked-eye threshold (Case et al. 2016). */
const OVATION_KR_PER_18 = 2.0; // estimate, c_ov in the research report

export function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Visibility from the OVATION grid: every cell up to ~12° poleward (and ±20° in longitude) is a
 * potential source at its real distance; the best one counts.
 */
export function ovationVisibility(
  valueAt: (lat: number, lon: number) => number,
  lat: number,
  lon: number,
  threshold: number,
  background: number,
): number {
  const toPole = lat >= 0 ? 1 : -1;
  let best = 0;
  for (let dLat = -2; dLat <= 12; dLat++) {
    const la = Math.round(lat) + toPole * dLat;
    if (Math.abs(la) > 90) continue;
    for (let dLon = -20; dLon <= 20; dLon++) {
      const lo = Math.round(lon) + dLon;
      const p = valueAt(la, lo);
      if (p < 3) continue;
      const d = greatCircleKm(lat, lon, la, lo);
      // within ~50 km we are under it: treat as overhead
      const v = detect(d < 50 ? 0 : d, (OVATION_KR_PER_18 * p) / 18, threshold, background);
      if (v > best) best = v;
    }
  }
  return best;
}

/**
 * Lowest Kp (step 0.1) at which a dark, clear sky at magnetic midnight gives ≥ 50 % for the eye.
 * Shown as "Kp needed here".
 */
export function kpNeeded(absMlat: number, detector: Detector = 'eye'): number {
  const thr = detector === 'eye' ? PARAMS.thresholdEye : PARAMS.thresholdCamera;
  for (let kp = 0; kp <= 9; kp += 0.1) if (visibility(absMlat, 0, kp, thr, 1) >= 0.5) return Math.round(kp * 10) / 10;
  return 9;
}
