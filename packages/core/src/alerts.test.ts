import { buildTonight, type CloudPoint, type KpBlock } from '@aurora/model/night';
import { describe, expect, it } from 'vitest';
import { decideAlert, nightKey, type AlertPrefs } from './alerts';
import { STRINGS } from './i18n';
import { buildViewModel, makeFmt, plainText, richText } from './view';

const HOUR = 3600_000;
const TZ = 'Europe/Oslo';

/** Tonight at a place with a constant Kp and clear sky; evaluated at 17:00 UTC on 2026-11-19. */
function viewModel(kp: number, place = { lat: 69.65, lon: 18.96 }) {
  const now = new Date('2026-11-19T17:00:00Z');
  const blocks: KpBlock[] = Array.from({ length: 8 }, (_, n) => ({
    start: new Date(Date.UTC(2026, 10, 19, 12) + n * 3 * HOUR),
    kp,
    kind: 'predicted',
  }));
  const clouds: CloudPoint[] = Array.from({ length: 20 }, (_, n) => ({
    time: new Date(Date.UTC(2026, 10, 19, 15) + n * HOUR),
    cloud: { total: 0, low: 0, mid: 0, high: 0 },
  }));
  const tonight = buildTonight(now, place, { kp: blocks, clouds, ovation: null });
  return buildViewModel({
    S: STRINGS.en,
    fmt: makeFmt('en', TZ),
    now,
    lat: place.lat,
    tonight,
    ovationTime: null,
    cloudsUpdated: null,
    kpOk: true,
  });
}

const on: AlertPrefs = { enabled: true, threshold: 50, lastNight: null };

describe('richText', () => {
  it('splits <b> parts and keeps the rest', () => {
    expect(richText('Best window <b>22:00 – 00:30</b>. Look north.')).toEqual([
      { text: 'Best window ', bold: false },
      { text: '22:00 – 00:30', bold: true },
      { text: '. Look north.', bold: false },
    ]);
    expect(richText('plain')).toEqual([{ text: 'plain', bold: false }]);
    expect(plainText('a <b>b</b> c <b>d</b>')).toBe('a b c d');
  });
});

describe('nightKey', () => {
  it('counts the small hours as the evening before', () => {
    expect(nightKey(new Date('2026-11-19T21:00:00Z'), TZ)).toBe('2026-11-19');
    expect(nightKey(new Date('2026-11-20T02:00:00Z'), TZ)).toBe('2026-11-19');
    expect(nightKey(new Date('2026-11-20T13:00:00Z'), TZ)).toBe('2026-11-20');
  });
});

describe('decideAlert', () => {
  const strong = viewModel(6);
  const quiet = viewModel(1, { lat: 58.97, lon: 5.73 });

  it('uses a strong night and a quiet one as fixtures', () => {
    expect(strong.headline).toBeGreaterThanOrEqual(50);
    expect(quiet.headline).toBeLessThan(50);
  });

  it('notifies once for a strong night, with a plain-text body', () => {
    const d = decideAlert(strong, TZ, on);
    expect(d.notify).toBe(true);
    expect(d.night).toBe('2026-11-19');
    expect(d.title).toContain(String(strong.headline));
    expect(d.body).not.toContain('<b>');
    expect(decideAlert(strong, TZ, { ...on, lastNight: d.night }).reason).toBe('already-sent');
  });

  it('stays quiet when disabled or below the threshold', () => {
    expect(decideAlert(strong, TZ, { ...on, enabled: false }).reason).toBe('disabled');
    expect(decideAlert(quiet, TZ, on).reason).toBe('below-threshold');
  });
});
