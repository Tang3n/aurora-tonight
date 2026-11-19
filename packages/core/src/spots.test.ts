import { describe, expect, it } from 'vitest';
import { travelMinutes, within, worthTheDrive, type RankedSpot } from './spots';

describe('worthTheDrive', () => {
  const at = (score: number) => ({ score }) as RankedSpot;
  it('needs a gain of at least 5 points over home', () => {
    expect(worthTheDrive(at(14), 13)).toBe(false);
    expect(worthTheDrive(at(18), 13)).toBe(true);
    expect(worthTheDrive(undefined, 13)).toBe(false);
  });
});

describe('travelMinutes', () => {
  it('is straight-line km × 1.35 at 65 km/h', () => {
    expect(travelMinutes(0)).toBe(0);
    expect(travelMinutes(48.15)).toBe(60); // 48.15 × 1.35 = 65 km → 1 h
    expect(travelMinutes(28)).toBe(35);
  });
});

describe('within', () => {
  const spot = (minutes: number, score: number) => ({ minutes, score }) as RankedSpot;
  it('keeps order and drops spots beyond the limit', () => {
    const ranked = [spot(50, 70), spot(20, 60), spot(100, 55), spot(30, 10)];
    expect(within(ranked, 30).map((r) => r.score)).toEqual([60, 10]);
    expect(within(ranked, 60).map((r) => r.score)).toEqual([70, 60, 10]);
  });
});
