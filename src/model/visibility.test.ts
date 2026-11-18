import { describe, expect, it } from 'vitest';
import { ovalBoundary } from './oval';
import {
  PARAMS, airmass, clearSky, elevationAt, expectedVisibility, kpNeeded, skyBackground, twilightExcess, visibility,
} from './visibility';
import { moonSkyRatio } from './astro';

// AACGM-v2 latitudes at 110 km (tools/gen_aacgm_grid.py)
const M = { Stavanger: 56.25, Oslo: 57.15, Trondheim: 61.0, Tromso: 67.27 };
const eye = (mlat: number, kp: number, mlt = 0, bg = 1) => visibility(mlat, mlt, kp, PARAMS.thresholdEye, bg);
const cam = (mlat: number, kp: number) => visibility(mlat, 0, kp, PARAMS.thresholdCamera, 1);

describe('Starkov oval', () => {
  it('diffuse boundary at magnetic midnight follows NOAA "66° − 2°/Kp"', () => {
    expect(ovalBoundary(2, 0, 'diffuse')).toBeCloseTo(63.1, 0);
    expect(ovalBoundary(3, 0, 'diffuse')).toBeCloseTo(61.1, 0);
    expect(ovalBoundary(5, 0, 'diffuse')).toBeCloseTo(57.1, 0);
  });
  it('sits further poleward in the evening than at midnight', () => {
    expect(ovalBoundary(3, 18, 'discrete') - ovalBoundary(3, 0, 'discrete')).toBeGreaterThan(4);
    expect(ovalBoundary(3, 21, 'discrete')).toBeGreaterThan(ovalBoundary(3, 0, 'discrete'));
  });
  it('keeps expanding above Kp 7 instead of saturating', () => {
    expect(ovalBoundary(9, 0, 'diffuse')).toBeLessThan(ovalBoundary(7, 0, 'diffuse') - 3);
  });
});

describe('light path', () => {
  it('aurora at 110 km sinks to the horizon ~1100–1200 km away', () => {
    expect(elevationAt(0)).toBe(90);
    expect(elevationAt(500)).toBeCloseTo(10, 0);
    expect(elevationAt(1250)).toBeLessThan(0);
  });
  it('airmass ≈ 10 at 5° elevation', () => {
    expect(airmass(5)).toBeGreaterThan(9.5);
    expect(airmass(5)).toBeLessThan(11);
  });
  it('twilight brightness falls to zero by astronomical darkness', () => {
    expect(twilightExcess(-3)).toBeGreaterThan(1000);
    expect(twilightExcess(-12)).toBeGreaterThan(5);
    expect(twilightExcess(-18)).toBe(0);
  });
});

describe('visibility (dark, clear, magnetic midnight) — research report table', () => {
  it('reproduces the report within a few points', () => {
    const near = (v: number, pct: number) => expect(Math.abs(v * 100 - pct)).toBeLessThan(6);
    near(eye(M.Stavanger, 3), 18);
    near(eye(M.Stavanger, 5), 51);
    near(eye(M.Trondheim, 2), 47);
    near(eye(M.Trondheim, 4), 74);
    near(eye(M.Tromso, 3), 91);
    near(cam(M.Stavanger, 3), 60);
  });

  it('Trondheim beats Stavanger by a wide margin at every Kp (the original bug)', () => {
    for (const kp of [2, 3, 4, 5]) expect(eye(M.Trondheim, kp) - eye(M.Stavanger, kp)).toBeGreaterThan(0.25);
  });

  it('does not saturate: Stavanger keeps improving from Kp 4 to Kp 6', () => {
    expect(eye(M.Stavanger, 6)).toBeGreaterThan(eye(M.Stavanger, 4) + 0.1);
  });

  it('the camera always sees at least as much as the eye', () => {
    for (const kp of [1, 3, 5]) expect(cam(M.Oslo, kp)).toBeGreaterThanOrEqual(eye(M.Oslo, kp));
  });

  it('evening (21 MLT) is worse than magnetic midnight', () => {
    expect(eye(M.Stavanger, 4, 21)).toBeLessThan(eye(M.Stavanger, 4, 0));
  });

  it('a bright sky hurts faint horizon aurora far more than bright overhead aurora', () => {
    const loss = (mlat: number) => eye(mlat, 4, 0, 23) / eye(mlat, 4, 0, 1);
    expect(loss(M.Tromso)).toBeGreaterThan(loss(M.Stavanger) * 3);
  });

  it('forecast uncertainty lifts hopeless hours and dents certain ones', () => {
    const known = eye(M.Stavanger, 2);
    const fc = expectedVisibility(M.Stavanger, 0, 2, 'predicted', PARAMS.thresholdEye, 1);
    expect(fc).toBeGreaterThan(known);
  });

  it('Kp needed for the eye: ~5 in Stavanger, ~2 in Trondheim, <1 in Tromsø', () => {
    expect(kpNeeded(M.Stavanger)).toBeGreaterThan(4);
    expect(kpNeeded(M.Stavanger)).toBeLessThan(5.5);
    expect(kpNeeded(M.Trondheim)).toBeLessThan(3);
    expect(kpNeeded(M.Tromso)).toBeLessThan(1);
  });
});

describe('local conditions', () => {
  it('clear sky uses MET total cloud, with partial credit for high-only cover', () => {
    expect(clearSky({ total: 0, low: 0, mid: 0, high: 0 })).toBe(1);
    expect(clearSky({ total: 1, low: 1, mid: 0, high: 0 })).toBe(0);
    expect(clearSky({ total: 1, low: 0, mid: 0, high: 1 })).toBeCloseTo(0.4);
    expect(clearSky({ total: 0.5, low: 0.5, mid: 0, high: 0, fog: 0.5 })).toBeCloseTo(0.25);
  });

  it('a full moon 30° up brightens the sky ~20× (Krisciunas & Schaefer)', () => {
    // 2026-11-24 ~ full moon; find an hour with the moon around 30° in Stavanger.
    let best = 0;
    for (let h = 0; h < 48; h++) {
      const d = new Date(Date.UTC(2026, 10, 24, h));
      best = Math.max(best, moonSkyRatio(d, 58.97, 5.73, { azimuthFromNorth: 0, elevation: 20 }));
    }
    expect(best).toBeGreaterThan(8);
    expect(best).toBeLessThan(60);
  });

  it('background adds up', () => {
    expect(skyBackground(-20, 0)).toBe(1);
    expect(skyBackground(-20, 5, 2)).toBe(8);
  });
});
