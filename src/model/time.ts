/** Time helpers that work in the *location's* time zone, not the browser's. */

const fmtCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export interface LocalParts {
  /** YYYY-MM-DD in the given zone. */
  date: string;
  hour: number;
  minute: number;
}

export function localParts(d: Date, tz: string): LocalParts {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFormatter(tz).formatToParts(d)) p[type] = value;
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, minute: Number(p.minute) };
}

export const HOUR = 3600_000;

export function floorHour(d: Date): Date {
  return new Date(Math.floor(d.getTime() / HOUR) * HOUR);
}
