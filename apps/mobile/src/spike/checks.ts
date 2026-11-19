/**
 * Portability spike (ADR 13): run the shared model on fixed inputs and return a JSON-able result.
 * The same function runs in Node (scripts/gen-expected.ts → expected.json) and in Hermes on the
 * device; the app compares the two. No network: every input is synthetic.
 */
import { toMagnetic } from '@aurora/model/aacgm';
import { buildTonight, type CloudPoint, type KpBlock } from '@aurora/model/night';
import { localParts } from '@aurora/model/time';

const HOUR = 3600_000;

/** Round numbers so tiny floating-point differences between engines do not count as failures. */
function round(value: unknown): unknown {
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(6)) : String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(round);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, round(v)]));
  }
  return value;
}

export interface CheckResult {
  /** Intl.DateTimeFormat with timeZone + formatToParts, through the model's own helper. */
  timeZones: Record<string, unknown>;
  /** atob is the one non-ES2022 global the model needs (packages/model/src/runtime.d.ts). */
  atob: string;
  /** AACGM grid decode + coordinate transform for Stavanger. */
  magnetic: unknown;
  /** Full tonight model for Stavanger with synthetic Kp and clouds. */
  tonight: unknown;
}

export function runChecks(): CheckResult {
  // Winter, summer (DST) and both sides of the EU DST switch on 2026-03-29 01:00 UTC.
  const instants = ['2026-01-15T12:00:00Z', '2026-07-15T12:00:00Z', '2026-03-29T00:30:00Z', '2026-03-29T01:30:00Z'];
  const zones = ['Europe/Oslo', 'America/Anchorage', 'Asia/Kolkata', 'UTC'];
  const timeZones: Record<string, unknown> = {};
  for (const i of instants) for (const z of zones) timeZones[`${z} @ ${i}`] = localParts(new Date(i), z);

  const now = new Date('2026-11-19T16:00:00Z');
  const place = { lat: 58.97, lon: 5.73 }; // Stavanger

  const kpValues = [2.33, 3, 3.67, 4.33, 3.67, 2.67, 2, 1.67];
  const kp: KpBlock[] = kpValues.map((v, n) => ({
    start: new Date(Date.UTC(2026, 10, 19, 12) + n * 3 * HOUR),
    kp: v,
    kind: 'predicted',
  }));
  const clouds: CloudPoint[] = Array.from({ length: 20 }, (_, n) => {
    const low = n < 6 ? 0.7 : n < 12 ? 0.2 : 0.5;
    return {
      time: new Date(Date.UTC(2026, 10, 19, 15) + n * HOUR),
      cloud: { total: Math.min(1, low + 0.1), low, mid: 0.1, high: 0.05 },
    };
  });

  return round({
    timeZones,
    atob: atob('aGVsbG8sIGF1cm9yYQ=='),
    magnetic: toMagnetic(place.lat, place.lon, now),
    tonight: buildTonight(now, place, { kp, clouds, ovation: null }),
  }) as CheckResult;
}

export interface Comparison {
  ok: boolean;
  lines: string[];
}

/** Compare leaf by leaf and report the first differences in readable form. */
export function compare(actual: unknown, expected: unknown, path = '', out: string[] = []): Comparison {
  if (expected && typeof expected === 'object') {
    const keys = new Set([...Object.keys(expected as object), ...Object.keys((actual ?? {}) as object)]);
    for (const k of keys) {
      compare((actual as Record<string, unknown> | undefined)?.[k], (expected as Record<string, unknown>)[k], `${path}.${k}`, out);
    }
  } else if (actual !== expected) {
    out.push(`${path}: got ${JSON.stringify(actual)}, Node ${JSON.stringify(expected)}`);
  }
  return { ok: out.length === 0, lines: out };
}
