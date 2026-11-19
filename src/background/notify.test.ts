import { describe, expect, it } from 'vitest';
import type { HourScore } from '../model/score';
import { decideAlerts, type AlertConfig, type AlertState } from './notify';
import { atobPolyfill } from './shims';
import { buildOffsetTable, hhmm, nightKey, offsetAt } from './tz';

const HOUR = 3600_000;
const T0 = Date.parse('2026-11-19T15:00:00Z'); // 16:00 in Oslo, first dark hour

function hours(eye: number[], missingCloud = false): HourScore[] {
  return eye.map(
    (e, i) =>
      ({
        time: new Date(T0 + i * HOUR),
        eye: e,
        camera: Math.min(100, e + 20),
        missing: missingCloud ? ['cloud'] : [],
      }) as unknown as HourScore,
  );
}

const cfg: AlertConfig = {
  enabled: true,
  place: { name: 'Tromsø', lat: 69.65, lon: 18.96 },
  lang: 'en',
  detector: 'eye',
  threshold: 50,
  offsets: buildOffsetTable('Europe/Oslo', new Date('2026-11-01T00:00:00Z')),
};
const at = (h: number) => new Date(T0 + h * HOUR + 10 * 60_000);

describe('time-zone table (no Intl in the runner)', () => {
  it('captures the DST change and formats local time', () => {
    const t = buildOffsetTable('Europe/Oslo', new Date('2026-11-01T00:00:00Z'));
    expect(offsetAt(t, new Date('2026-12-01T12:00:00Z'))).toBe(60);
    expect(offsetAt(t, new Date('2027-07-01T12:00:00Z'))).toBe(120);
    expect(t.length).toBe(3); // CET → CEST (Mar) → CET (Oct)
    expect(hhmm(t, new Date('2026-11-19T20:00:00Z'))).toBe('21:00');
  });

  it('assigns after-midnight hours to the previous evening', () => {
    expect(nightKey(cfg.offsets, new Date('2026-11-19T21:00:00Z'))).toBe('2026-11-19');
    expect(nightKey(cfg.offsets, new Date('2026-11-20T03:00:00Z'))).toBe('2026-11-19');
  });
});

describe('decideAlerts', () => {
  it('sends a heads-up for a future window, once per night', () => {
    const h = hours([5, 10, 40, 60, 65, 55, 20]);
    const first = decideAlerts(at(0), h, 66, cfg, null);
    expect(first.alerts.map((a) => a.kind)).toEqual(['tonight']);
    expect(first.alerts[0]!.body).toBe('Good chance 19:00–22:00, best around 20:00 (65 %).');
    const again = decideAlerts(at(1), h.slice(1), 66, cfg, first.state);
    expect(again.alerts).toEqual([]);
  });

  it('alerts "now" and again only when it climbs a label', () => {
    const h = hours([55, 60, 80, 85]);
    const a = decideAlerts(at(0), h, 66, cfg, null);
    expect(a.alerts.map((x) => x.kind)).toEqual(['now']);
    expect(a.alerts[0]!.body).toContain('Look north');
    expect(decideAlerts(at(1), h.slice(1), 66, cfg, a.state).alerts).toEqual([]); // still "good"
    const c = decideAlerts(at(2), h.slice(2), 66, cfg, a.state);
    expect(c.alerts.map((x) => x.kind)).toEqual(['now']); // good → great
    expect(c.alerts[0]!.body).toMatch(/^Great chance/);
  });

  it('starts over on the next night', () => {
    const h = hours([60]);
    const prev: AlertState = { night: '2026-11-18', tonightSent: true, nowRank: 4 };
    expect(decideAlerts(at(0), h, 66, cfg, prev).alerts.map((x) => x.kind)).toEqual(['now']);
  });

  it('stays silent below the threshold, without clouds, or when disabled', () => {
    expect(decideAlerts(at(0), hours([10, 30, 45, 20]), 66, cfg, null).alerts).toEqual([]);
    expect(decideAlerts(at(0), hours([70, 80], true), 66, cfg, null).alerts).toEqual([]);
    expect(decideAlerts(at(0), hours([70]), 66, { ...cfg, enabled: false }, null).alerts).toEqual([]);
  });

  it('uses the camera score, language and hemisphere from the config', () => {
    const r = decideAlerts(at(0), hours([40]), -62, { ...cfg, detector: 'camera', lang: 'cs' }, null);
    expect(r.alerts[0]!.title).toBe('Polární záře teď · Tromsø');
    expect(r.alerts[0]!.body).toBe('Dobrá šance vidět ji právě teď fotoaparátem mobilu (60 %). Dívej se na jih.');
  });

  it('does not announce a window that is more than 12 h away', () => {
    const h = hours([...Array(14).fill(0), 70]);
    expect(decideAlerts(at(0), h, 66, cfg, null).alerts).toEqual([]);
  });
});

describe('atob polyfill', () => {
  it('matches the platform atob', () => {
    for (const s of ['', 'QQ==', 'QUI=', 'QUJD', btoa(String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)))])
      expect(atobPolyfill(s)).toBe(atob(s));
  });
});
