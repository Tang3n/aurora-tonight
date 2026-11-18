import { describe, expect, it } from 'vitest';
import { bestWindow, labelFor, type HourScore } from './score';
import {
  buildTonight,
  cloudAt,
  kpAt,
  kpValueAt,
  nightHours,
  nightlyOutlook,
  nowcastWeight,
  type CloudPoint,
  type KpBlock,
} from './night';
import { ovationAt, parseOvation } from './ovation';
import { localParts } from './time';

const STAVANGER = { lat: 58.97, lon: 5.73 };
const TRONDHEIM = { lat: 63.43, lon: 10.39 };
const TROMSO = { lat: 69.65, lon: 18.96 };

const clearNight = (from: string, hours = 24): CloudPoint[] =>
  Array.from({ length: hours }, (_, i) => ({
    time: new Date(new Date(from).getTime() + i * 3600_000),
    cloud: { total: 0, low: 0, mid: 0, high: 0 },
  }));

const kpFlat = (kp: number, from: string, blocks = 8): KpBlock[] =>
  Array.from({ length: blocks }, (_, i) => ({
    start: new Date(new Date(from).getTime() + i * 3 * 3600_000),
    kp,
    kind: 'estimated' as const,
  }));

describe('labels and window', () => {
  it('maps scores to labels', () => {
    expect([5, 20, 40, 60, 90].map(labelFor)).toEqual(['no', 'unlikely', 'maybe', 'good', 'great']);
  });

  const mk = (scores: number[]) =>
    scores.map((eye, i) => ({ time: new Date(Date.UTC(2026, 10, 18, 17 + i)), eye, camera: eye }) as HourScore);

  it('finds the contiguous run around the peak', () => {
    const w = bestWindow(mk([5, 20, 60, 78, 72, 40, 70]))!;
    expect(w.peak.eye).toBe(78);
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
    expect(kpAt(blocks, new Date('2026-11-19T05:00:00Z'))).toBeNull();
  });

  it('interpolates Kp between block centres', () => {
    expect(kpValueAt(blocks, new Date('2026-11-18T22:30:00Z'))).toBeCloseTo(4.67);
    expect(kpValueAt(blocks, new Date('2026-11-19T00:00:00Z'))).toBeCloseTo((4.67 + 2.33) / 2);
    expect(kpValueAt(blocks, new Date('2026-11-19T02:30:00Z'))).toBeCloseTo(2.33);
  });

  it('averages cloud cover over ±90 min', () => {
    const pts: CloudPoint[] = [
      { time: new Date('2026-11-18T18:00:00Z'), cloud: { total: 0.2, low: 0.2, mid: 0, high: 0 } },
      { time: new Date('2026-11-18T19:00:00Z'), cloud: { total: 0.8, low: 0.8, mid: 0, high: 0 } },
    ];
    expect(cloudAt(pts, new Date('2026-11-18T18:30:00Z'))?.total).toBeCloseTo(0.5);
    expect(cloudAt(pts, new Date('2026-11-19T01:00:00Z'))).toBeNull();
  });

  it('builds a Stavanger November night from dusk to dawn', () => {
    const hours = nightHours(new Date('2026-11-18T12:00:00Z'), STAVANGER);
    const local = hours.map((h) => localParts(h, 'Europe/Oslo').hour);
    expect(local[0]).toBe(16);
    expect(local.at(-1)).toBe(8);
  });

  it('skips to the next night when this one is nearly over', () => {
    const hours = nightHours(new Date('2026-11-19T06:30:00Z'), STAVANGER);
    expect(hours[0]!.getTime()).toBeGreaterThan(new Date('2026-11-19T12:00:00Z').getTime());
  });

  it('returns no night under the midnight sun', () => {
    expect(nightHours(new Date('2026-06-21T12:00:00Z'), TROMSO)).toEqual([]);
  });

  it('groups Kp into nights in local time', () => {
    const more: KpBlock[] = [
      ...blocks,
      { start: new Date('2026-11-19T09:00:00Z'), kp: 8, kind: 'predicted' },
      { start: new Date('2026-11-19T21:00:00Z'), kp: 3.0, kind: 'predicted' },
    ];
    expect(nightlyOutlook(more, new Date('2026-11-18T19:00:00Z'), 'Europe/Oslo')).toEqual([
      { date: '2026-11-18', maxKp: 4.67 },
      { date: '2026-11-19', maxKp: 3.0 },
    ]);
  });
});

describe('buildTonight', () => {
  const NOW = new Date('2026-11-18T15:00:00Z');
  const data = (kp: number) => ({ kp: kpFlat(kp, '2026-11-18T12:00:00Z'), clouds: clearNight('2026-11-18T12:00:00Z'), ovation: null });

  it('ranks Trondheim clearly above Stavanger on the same clear night', () => {
    const peak = (p: typeof STAVANGER) => Math.max(...buildTonight(NOW, p, data(3)).hours.map((h) => h.eye));
    expect(peak(TRONDHEIM) - peak(STAVANGER)).toBeGreaterThan(25);
  });

  it('peaks around magnetic midnight, not in the early evening', () => {
    const t = buildTonight(NOW, STAVANGER, data(4));
    const best = t.hours.reduce((a, b) => (b.eye > a.eye ? b : a));
    const h = localParts(best.time, 'Europe/Oslo').hour;
    expect(h === 23 || h === 0 || h === 1 || h === 22).toBe(true);
  });

  it('clouds zero the score but leave the clear-sky visibility intact', () => {
    const cloudy = { ...data(4), clouds: clearNight('2026-11-18T12:00:00Z').map((p) => ({ ...p, cloud: { total: 1, low: 1, mid: 0, high: 0 } })) };
    const t = buildTonight(NOW, TROMSO, cloudy);
    expect(Math.max(...t.hours.map((h) => h.eye))).toBe(0);
    expect(Math.max(...t.hours.map((h) => h.auroraEye))).toBeGreaterThan(0.5);
  });

  it('degrades gracefully when every source failed', () => {
    const t = buildTonight(NOW, STAVANGER, { kp: null, clouds: null, ovation: null });
    expect(t.hours.length).toBeGreaterThan(0);
    expect(t.hours.every((h) => h.missing.length === 2)).toBe(true);
  });

  it('reports AACGM magnetic latitude and Kp needed', () => {
    const t = buildTonight(NOW, STAVANGER, data(3));
    expect(t.mlat).toBeCloseTo(56.25, 1);
    expect(t.kpNeeded).toBeGreaterThan(4);
  });
});

describe('OVATION nowcast', () => {
  const grid = parseOvation({
    'Observation Time': '2026-11-18T18:12:00Z',
    'Forecast Time': '2026-11-18T19:19:00Z',
    coordinates: [[6, 66, 30]],
  });

  it('parses the grid', () => {
    expect(ovationAt(grid, 66, 6)).toBe(30);
    expect(ovationAt(grid, 66, 7)).toBe(0);
  });

  it('weights the nowcast fully before its forecast time and fades after', () => {
    const now = new Date('2026-11-18T18:20:00Z');
    expect(nowcastWeight(new Date('2026-11-18T18:30:00Z'), now, grid)).toBe(1);
    expect(nowcastWeight(new Date('2026-11-18T20:30:00Z'), now, grid)).toBeLessThan(0.3);
    expect(nowcastWeight(new Date('2026-11-18T18:30:00Z'), new Date('2026-11-18T19:00:00Z'), grid)).toBe(0); // stale
  });
});
