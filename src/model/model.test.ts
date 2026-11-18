import { describe, expect, it } from 'vitest';
import { geomagneticLatitude, kpNeeded } from './magnetic';
import {
  activityFromKp,
  bestWindow,
  darkFactor,
  labelFor,
  moonFactor,
  scoreHour,
  skyFactor,
  type HourInput,
  type HourScore,
} from './score';
import { buildTonight, cloudAt, kpAt, kpValueAt, nightHours, nightlyOutlook, type KpBlock } from './night';
import { ovationNear, parseOvation } from './ovation';
import { localParts } from './time';

const STAVANGER = { lat: 58.97, lon: 5.73 };
const TROMSO = { lat: 69.65, lon: 18.96 };
const PRAGUE = { lat: 50.08, lon: 14.43 };

describe('geomagnetic latitude', () => {
  it('places Stavanger, Tromsø and Prague at plausible dipole latitudes', () => {
    expect(geomagneticLatitude(STAVANGER.lat, STAVANGER.lon)).toBeCloseTo(59.6, 0);
    expect(geomagneticLatitude(TROMSO.lat, TROMSO.lon)).toBeGreaterThan(66);
    expect(geomagneticLatitude(PRAGUE.lat, PRAGUE.lon)).toBeLessThan(51);
  });

  it('is negative in the southern hemisphere', () => {
    expect(geomagneticLatitude(-42.9, 147.3)).toBeLessThan(-45); // Hobart
  });

  it('needs more Kp the further from the pole', () => {
    const k = (p: { lat: number; lon: number }) => kpNeeded(geomagneticLatitude(p.lat, p.lon));
    expect(k(TROMSO)).toBeLessThan(1.5);
    expect(k(STAVANGER)).toBeGreaterThan(3);
    expect(k(STAVANGER)).toBeLessThan(4.5);
    expect(k(PRAGUE)).toBeGreaterThan(7);
  });

  it('clamps to the Kp scale', () => {
    expect(kpNeeded(80)).toBe(0);
    expect(kpNeeded(10)).toBe(9);
  });
});

describe('factors', () => {
  it('activity is 0.5 exactly at the threshold and monotonic', () => {
    expect(activityFromKp(3.7, 3.7)).toBeCloseTo(0.5);
    expect(activityFromKp(4.7, 3.7)).toBeGreaterThan(0.8);
    expect(activityFromKp(2.7, 3.7)).toBeLessThan(0.2);
  });

  it('low cloud blocks more than high cloud', () => {
    expect(skyFactor({ low: 0, mid: 0, high: 0 })).toBe(1);
    expect(skyFactor({ low: 1, mid: 0, high: 0 })).toBe(0);
    expect(skyFactor({ low: 0, mid: 0, high: 1 })).toBeCloseTo(0.7);
    expect(skyFactor(null)).toBe(0.5);
  });

  it('darkness ramps from civil twilight to −15°', () => {
    expect(darkFactor(5)).toBe(0);
    expect(darkFactor(-6)).toBe(0);
    expect(darkFactor(-10.5)).toBeCloseTo(0.5);
    expect(darkFactor(-15)).toBe(1);
    expect(darkFactor(-40)).toBe(1);
  });

  it('moon only matters when bright and up', () => {
    expect(moonFactor(1, -10)).toBe(1);
    expect(moonFactor(0, 60)).toBe(1);
    expect(moonFactor(1, 60)).toBeCloseTo(0.7);
  });
});

const base: HourInput = {
  time: new Date('2026-11-18T22:00:00Z'),
  kp: 4.7,
  cloud: { low: 0, mid: 0, high: 0 },
  sunAltitude: -40,
  moon: { illumination: 0.1, altitude: -5 },
};

describe('scoreHour', () => {
  it('scores a clear, dark, active night high', () => {
    expect(scoreHour(base, 3.7).score).toBeGreaterThan(80);
  });

  it('any blocker kills the score', () => {
    expect(scoreHour({ ...base, cloud: { low: 1, mid: 0, high: 0 } }, 3.7).score).toBe(0);
    expect(scoreHour({ ...base, sunAltitude: 10 }, 3.7).score).toBe(0);
  });

  it('reports missing inputs and stays cautious', () => {
    const s = scoreHour({ ...base, kp: null, cloud: null }, 3.7);
    expect(s.missing).toEqual(['kp', 'cloud']);
    expect(s.score).toBeLessThan(20);
  });

  it('uses OVATION and Bz for the nowcast hour', () => {
    const quiet = scoreHour({ ...base, ovation: 0, bz: 5 }, 3.7);
    const storm = scoreHour({ ...base, ovation: 40, bz: -10 }, 3.7);
    expect(storm.score).toBeGreaterThan(quiet.score);
    expect(storm.factors.activity).toBeLessThanOrEqual(1);
  });
});

describe('labels and window', () => {
  it('maps scores to labels', () => {
    expect([5, 20, 40, 60, 90].map(labelFor)).toEqual(['no', 'unlikely', 'maybe', 'good', 'great']);
  });

  const mk = (scores: number[]): HourScore[] =>
    scores.map((score, i) => ({
      time: new Date(Date.UTC(2026, 10, 18, 17 + i)),
      score,
      factors: { activity: 1, sky: 1, dark: 1, moon: 1 },
      input: base,
      missing: [],
    }));

  it('finds the contiguous run around the peak', () => {
    const w = bestWindow(mk([5, 20, 60, 78, 72, 40, 70]))!;
    expect(w.peak.score).toBe(78);
    expect(w.start.toISOString()).toBe('2026-11-18T19:00:00.000Z');
    expect(w.end.toISOString()).toBe('2026-11-18T22:00:00.000Z');
  });

  it('returns null on a hopeless night', () => {
    expect(bestWindow(mk([0, 5, 12, 3]))).toBeNull();
    expect(bestWindow([])).toBeNull();
  });
});

describe('aligning sources', () => {
  const blocks: KpBlock[] = [
    { start: new Date('2026-11-18T18:00:00Z'), kp: 3.33, kind: 'estimated' },
    { start: new Date('2026-11-18T21:00:00Z'), kp: 4.67, kind: 'estimated' },
    { start: new Date('2026-11-19T00:00:00Z'), kp: 2.33, kind: 'predicted' },
  ];

  it('picks the 3-hour Kp block containing an instant', () => {
    expect(kpAt(blocks, new Date('2026-11-18T23:30:00Z'))?.kp).toBe(4.67);
    expect(kpAt(blocks, new Date('2026-11-19T00:00:00Z'))?.kp).toBe(2.33);
    expect(kpAt(blocks, new Date('2026-11-19T05:00:00Z'))).toBeNull();
  });

  it('interpolates Kp between block centres', () => {
    // centre of the 21:00 block → its own value
    expect(kpValueAt(blocks, new Date('2026-11-18T22:30:00Z'))).toBeCloseTo(4.67);
    // block boundary → halfway between neighbours
    expect(kpValueAt(blocks, new Date('2026-11-19T00:00:00Z'))).toBeCloseTo((4.67 + 2.33) / 2);
    // edge of the data → hold the last value
    expect(kpValueAt(blocks, new Date('2026-11-19T02:30:00Z'))).toBeCloseTo(2.33);
    expect(kpValueAt(blocks, new Date('2026-11-19T05:00:00Z'))).toBeNull();
  });

  it('picks the nearest cloud point within 3 hours', () => {
    const pts = [
      { time: new Date('2026-11-18T18:00:00Z'), cloud: { low: 0.1, mid: 0, high: 0 } },
      { time: new Date('2026-11-18T19:00:00Z'), cloud: { low: 0.9, mid: 0, high: 0 } },
    ];
    expect(cloudAt(pts, new Date('2026-11-18T18:40:00Z'))?.low).toBe(0.9);
    expect(cloudAt(pts, new Date('2026-11-19T01:00:00Z'))).toBeNull();
  });

  it('builds a Stavanger November night from dusk to dawn', () => {
    const hours = nightHours(new Date('2026-11-18T12:00:00Z'), STAVANGER);
    const local = hours.map((h) => localParts(h, 'Europe/Oslo').hour);
    expect(local[0]).toBe(16); // sunset ~16:05
    expect(local.at(-1)).toBe(8); // sunrise ~08:40
    expect(hours.length).toBe(17);
  });

  it('starts from the current hour during the night', () => {
    const hours = nightHours(new Date('2026-11-18T21:20:00Z'), STAVANGER);
    expect(hours[0]!.toISOString()).toBe('2026-11-18T21:00:00.000Z');
  });

  it('skips to the next night when this one is nearly over', () => {
    const hours = nightHours(new Date('2026-11-19T06:30:00Z'), STAVANGER);
    expect(hours[0]!.getTime()).toBeGreaterThan(new Date('2026-11-19T12:00:00Z').getTime());
  });

  it('returns no night under the midnight sun', () => {
    expect(nightHours(new Date('2026-06-21T12:00:00Z'), TROMSO)).toEqual([]);
  });

  it('degrades gracefully when every source failed', () => {
    const t = buildTonight(new Date('2026-11-18T19:10:00Z'), STAVANGER, { kp: null, clouds: null, nowcast: null });
    expect(t.hours.length).toBeGreaterThan(0);
    expect(t.hours.every((h) => h.missing.length === 2)).toBe(true);
  });

  it('groups Kp into nights in local time', () => {
    const more: KpBlock[] = [
      ...blocks,
      { start: new Date('2026-11-19T09:00:00Z'), kp: 8, kind: 'predicted' }, // daytime, ignored
      { start: new Date('2026-11-19T21:00:00Z'), kp: 3.0, kind: 'predicted' },
    ];
    const o = nightlyOutlook(more, new Date('2026-11-18T19:00:00Z'), 'Europe/Oslo');
    expect(o).toEqual([
      { date: '2026-11-18', maxKp: 4.67 },
      { date: '2026-11-19', maxKp: 3.0 },
    ]);
  });
});

describe('OVATION', () => {
  const grid = parseOvation({
    'Observation Time': '2026-11-18T18:12:00Z',
    'Forecast Time': '2026-11-18T19:19:00Z',
    coordinates: [
      [6, 66, 30], // 7° north of Stavanger
      [300, 66, 90], // far away in longitude (Greenland)
    ],
  });

  it('sees aurora poleward of the observer, discounted by distance', () => {
    const v = ovationNear(grid, STAVANGER.lat, STAVANGER.lon);
    expect(v).toBeGreaterThan(10);
    expect(v).toBeLessThan(30);
  });

  it('ignores aurora equatorward or far away', () => {
    expect(ovationNear(grid, 70, 6)).toBe(0);
  });
});
