/**
 * Local time without Intl.
 *
 * The background runner runs in QuickJS, which has no Intl and therefore no time-zone database.
 * The app (WebView, full Intl) precomputes the location's UTC offset changes for the next year
 * and hands them to the runner as a small table; the runner only does a lookup.
 */
import { localParts } from '../model/time';

/** [fromMs, offsetMinutes] pairs, ascending by time. The first entry covers everything before it. */
export type OffsetTable = [number, number][];

const HOUR = 3600_000;

function offsetMinutes(d: Date, tz: string): number {
  const p = localParts(d, tz);
  const [y, m, day] = p.date.split('-').map(Number) as [number, number, number];
  const asUtc = Date.UTC(y, m - 1, day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(d.getTime() / 60_000) * 60_000) / 60_000);
}

/** Needs Intl — call in the app, not in the runner. Scans hourly; DST changes happen on the hour. */
export function buildOffsetTable(tz: string, from: Date, days = 400): OffsetTable {
  const start = Math.floor(from.getTime() / HOUR) * HOUR;
  const table: OffsetTable = [[start, offsetMinutes(new Date(start), tz)]];
  for (let t = start + HOUR; t < start + days * 24 * HOUR; t += HOUR) {
    const off = offsetMinutes(new Date(t), tz);
    if (off !== table[table.length - 1]![1]) table.push([t, off]);
  }
  return table;
}

export function offsetAt(table: OffsetTable, d: Date): number {
  let off = table[0]?.[1] ?? 0;
  for (const [from, o] of table) {
    if (d.getTime() >= from) off = o;
    else break;
  }
  return off;
}

/** Wall-clock time at the location as a Date whose UTC fields hold the local values. */
function shifted(table: OffsetTable, d: Date): Date {
  return new Date(d.getTime() + offsetAt(table, d) * 60_000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "21:00" */
export function hhmm(table: OffsetTable, d: Date): string {
  const s = shifted(table, d);
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
}

/**
 * Key of the night `d` belongs to: the local date of the evening it starts on
 * (times before noon count to the previous evening).
 */
export function nightKey(table: OffsetTable, d: Date): string {
  const s = shifted(table, new Date(d.getTime() - 12 * HOUR));
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`;
}
