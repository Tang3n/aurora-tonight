/**
 * Geomagnetic latitude and the Kp index needed to see aurora from a place.
 *
 * Aurora follows the Earth's magnetic field, not geography: Stavanger (59°N geographic)
 * sits at roughly the same geomagnetic latitude as Edinburgh, while Fairbanks (65°N)
 * is far "more northern" magnetically than Tromsø would suggest.
 */

const DEG = Math.PI / 180;

/** North geomagnetic pole (centred dipole, IGRF-14 epoch 2025). */
export const GEOMAGNETIC_POLE = { lat: 80.8, lon: -72.8 } as const;

/**
 * Geomagnetic latitude in degrees using the centred dipole approximation.
 * Error vs. full models (AACGM) is a few degrees at mid-latitudes — fine for a go/no-go answer.
 * Positive in the northern magnetic hemisphere, negative in the southern one.
 */
export function geomagneticLatitude(lat: number, lon: number): number {
  const φ = lat * DEG;
  const φp = GEOMAGNETIC_POLE.lat * DEG;
  const Δλ = (lon - GEOMAGNETIC_POLE.lon) * DEG;
  const s = Math.sin(φ) * Math.sin(φp) + Math.cos(φ) * Math.cos(φp) * Math.cos(Δλ);
  return Math.asin(Math.max(-1, Math.min(1, s))) / DEG;
}

/**
 * Kp at which aurora becomes visible (low on the poleward horizon) at a geomagnetic latitude.
 *
 * Empirical linear fit through commonly quoted thresholds:
 *   Tromsø   ~66.7° mag → Kp ≈ 1
 *   Stavanger ~59.6° mag → Kp ≈ 3.7
 *   Prague   ~49.9° mag → Kp ≈ 7.5
 * i.e. each Kp step pushes the visible boundary ~2.6° towards the equator.
 */
export function kpNeeded(magLat: number): number {
  const m = Math.abs(magLat);
  const kp = 1 + (66.7 - m) / 2.6;
  return Math.max(0, Math.min(9, kp));
}
