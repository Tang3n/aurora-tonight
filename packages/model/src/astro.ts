/**
 * Small astronomy helpers that suncalc does not expose:
 * the subsolar point (needed for magnetic local time) and the Moon's sky brightness.
 */
import SunCalc from 'suncalc';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Geographic point directly under the Sun (NOAA/Meeus low-precision, < 0.1°). */
export function subsolarPoint(d: Date): { lat: number; lon: number } {
  const jd = d.getTime() / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * DEG;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) * DEG;
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  let lon = ra - gmst;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: dec, lon };
}

/** Centred-dipole pole for IGRF-14 (2025); used only for the MLT reference meridian. */
const POLE = { lat: 80.8, lon: -72.7 };

/** Dipole (geomagnetic) longitude in degrees, −180..180. */
export function dipoleLongitude(lat: number, lon: number): number {
  const φ = lat * RAD;
  const λ = (lon - POLE.lon) * RAD;
  const θp = (90 - POLE.lat) * RAD;
  // Rotate the point so the dipole axis becomes the z axis.
  const x = Math.cos(φ) * Math.cos(λ);
  const y = Math.cos(φ) * Math.sin(λ);
  const z = Math.sin(φ);
  const xm = x * Math.cos(θp) - z * Math.sin(θp);
  return Math.atan2(y, xm) * DEG;
}

/* ---------- Moon sky brightness: Krisciunas & Schaefer (1991), PASP 103, 1033 ---------- */

/** Natural dark sky, V ≈ 22.0 mag/arcsec², in nanolamberts. */
const DARK_SKY_NL = 54;

/** K&S optical path length relative to zenith. */
const ksAirmass = (zenithDeg: number) => 1 / Math.sqrt(1 - 0.96 * Math.sin(zenithDeg * RAD) ** 2);

/**
 * How much the Moon brightens the sky in the viewing direction, as a multiple of the natural
 * dark sky (0 = no effect, 22 ≈ full moon 30° high). The viewing direction is towards the
 * magnetic pole at the given elevation, i.e. where the aurora will be.
 */
export function moonSkyRatio(
  d: Date,
  lat: number,
  lon: number,
  view: { azimuthFromNorth: number; elevation: number },
  k = 0.25,
): number {
  const pos = SunCalc.getMoonPosition(d, lat, lon);
  const moonAlt = pos.altitude * DEG;
  if (moonAlt <= 0) return 0;
  const illum = SunCalc.getMoonIllumination(d).fraction;
  const alpha = Math.acos(Math.max(-1, Math.min(1, 2 * illum - 1))) * DEG; // phase angle, 0 = full
  const m = -12.73 + 0.026 * alpha + 4e-9 * alpha ** 4;
  let I = 10 ** (-0.4 * (m + 16.57));
  if (alpha < 7) I *= 1.35; // opposition surge

  // Angle between the Moon and the viewing direction.
  const moonAz = pos.azimuth * DEG + 180; // suncalc measures from south, westwards
  const cosRho =
    Math.sin(moonAlt * RAD) * Math.sin(view.elevation * RAD) +
    Math.cos(moonAlt * RAD) * Math.cos(view.elevation * RAD) * Math.cos((moonAz - view.azimuthFromNorth) * RAD);
  const rho = Math.acos(Math.max(-1, Math.min(1, cosRho))) * DEG;
  const f = 10 ** 5.36 * (1.06 + Math.cos(rho * RAD) ** 2) + 10 ** (6.15 - rho / 40);

  const Zm = 90 - moonAlt;
  const Z = 90 - view.elevation;
  const bMoon = f * I * 10 ** (-0.4 * k * ksAirmass(Zm)) * (1 - 10 ** (-0.4 * k * ksAirmass(Z)));
  return bMoon / DARK_SKY_NL;
}
