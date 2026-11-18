import { describe, expect, it } from 'vitest';
import { magneticLocalTime, toMagnetic } from './aacgm';

// Reference values: exact aacgmv2 2.7.1 at 110 km, printed by tools/gen_aacgm_grid.py
const WHEN = new Date('2026-11-18T22:00:00Z');
const REF = [
  { name: 'Stavanger', lat: 58.97, lon: 5.733, mlat: 56.248, mlon: 83.905, mlt: 22.727 },
  { name: 'Oslo', lat: 59.91, lon: 10.75, mlat: 57.153, mlon: 88.461, mlt: 23.03 },
  { name: 'Trondheim', lat: 63.43, lon: 10.39, mlat: 61.003, mlon: 89.548, mlt: 23.103 },
  { name: 'Tromso', lat: 69.65, lon: 18.96, mlat: 67.265, mlon: 100.021, mlt: 23.801 },
  { name: 'Prague', lat: 50.08, lon: 14.43, mlat: 46.061, mlon: 89.041, mlt: 23.069 },
  { name: 'Fairbanks', lat: 64.84, lon: -147.72, mlat: 65.183, mlon: -90.707, mlt: 11.086 },
  { name: 'Hobart', lat: -42.88, lon: 147.33, mlat: -53.709, mlon: -132.482, mlt: 8.301 },
];

describe('AACGM grid', () => {
  for (const r of REF) {
    it(`matches aacgmv2 for ${r.name}`, () => {
      const m = toMagnetic(r.lat, r.lon, WHEN);
      expect(Math.abs(m.mlat - r.mlat)).toBeLessThan(0.05);
      const dLon = ((m.mlon - r.mlon + 540) % 360) - 180;
      expect(Math.abs(dLon)).toBeLessThan(0.3);
    });
    it(`gives MLT within 3 min for ${r.name}`, () => {
      const mlt = magneticLocalTime(r.mlon, WHEN);
      const d = ((mlt - r.mlt + 36) % 24) - 12;
      expect(Math.abs(d)).toBeLessThan(0.05); // 3 min
    });
  }

  it('falls back to a dipole near the equator', () => {
    expect(Number.isFinite(toMagnetic(5, 20, WHEN).mlat)).toBe(true);
  });
});
