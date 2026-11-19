/**
 * When to notify. Pure: takes tonight's hours and the previous state, returns the notifications
 * to show and the new state. The runner persists the state between runs (each run is a fresh
 * JS context).
 *
 * Two kinds, deliberately few:
 *   now     — the current hour is at or above the user's threshold. Repeated within the same
 *             night only when it climbs to a higher label (maybe → good → great): aurora comes in
 *             substorm bursts and a second ping for "it got much better" is worth it, the same
 *             level every 15 minutes is not.
 *   tonight — the best window of the night is above the threshold, starts within 12 h and has
 *             not started yet. Once per night, and never after a "now" alert.
 * Nothing is sent without a cloud forecast: clouds dominate the score and the 50 % fallback
 * would produce false alarms.
 */
import type { Lang } from '../i18n';
import { bestWindow, labelFor, type HourScore, type Label } from '../model/score';
import type { Detector } from '../model/visibility';
import { hhmm, nightKey, type OffsetTable } from './tz';

export interface AlertConfig {
  enabled: boolean;
  place: { name: string; lat: number; lon: number };
  lang: Lang;
  detector: Detector;
  /** Minimum score (0..100) worth a notification. */
  threshold: number;
  offsets: OffsetTable;
  /** Native platform; the runner's notification API differs between them. Default android. */
  platform?: 'android' | 'ios';
}

export interface AlertState {
  night: string;
  tonightSent: boolean;
  /** Highest label rank already announced as "now" this night, −1 if none. */
  nowRank: number;
}

export interface Alert {
  kind: 'now' | 'tonight';
  title: string;
  body: string;
}

const HOUR = 3600_000;
const LOOKAHEAD = 12 * HOUR;
const RANK: Record<Label, number> = { no: 0, unlikely: 1, maybe: 2, good: 3, great: 4 };

type Chance = 'maybe' | 'good' | 'great';
const chanceOf = (score: number): Chance => {
  const l = labelFor(score);
  return l === 'great' || l === 'good' ? l : 'maybe';
};

interface Texts {
  nowTitle: (place: string) => string;
  nowBody: (chance: Chance, score: number, detector: Detector, south: boolean) => string;
  tonightTitle: (place: string) => string;
  tonightBody: (chance: Chance, from: string, to: string, peak: string, score: number, detector: Detector) => string;
}

const TEXTS: Record<Lang, Texts> = {
  en: {
    nowTitle: (p) => `Aurora now · ${p}`,
    nowBody: (c, s, d, south) =>
      `${{ maybe: 'Some', good: 'Good', great: 'Great' }[c]} chance to see it ${d === 'eye' ? 'with your eyes' : 'with a phone camera'} right now (${s} %). Look ${south ? 'south' : 'north'}.`,
    tonightTitle: (p) => `Aurora tonight · ${p}`,
    tonightBody: (c, a, b, peak, s, d) =>
      `${{ maybe: 'Some', good: 'Good', great: 'Great' }[c]} chance ${a}–${b}, best around ${peak} (${s} %${d === 'camera' ? ', phone camera' : ''}).`,
  },
  cs: {
    nowTitle: (p) => `Polární záře teď · ${p}`,
    nowBody: (c, s, d, south) =>
      `${{ maybe: 'Určitá', good: 'Dobrá', great: 'Výborná' }[c]} šance vidět ji právě teď ${d === 'eye' ? 'pouhým okem' : 'fotoaparátem mobilu'} (${s} %). Dívej se na ${south ? 'jih' : 'sever'}.`,
    tonightTitle: (p) => `Polární záře dnes v noci · ${p}`,
    tonightBody: (c, a, b, peak, s, d) =>
      `${{ maybe: 'Určitá', good: 'Dobrá', great: 'Výborná' }[c]} šance ${a}–${b}, nejlépe kolem ${peak} (${s} %${d === 'camera' ? ', fotoaparát' : ''}).`,
  },
  no: {
    nowTitle: (p) => `Nordlys nå · ${p}`,
    nowBody: (c, s, d, south) =>
      `${{ maybe: 'Viss', good: 'Bra', great: 'Svært god' }[c]} sjanse til å se det ${d === 'eye' ? 'med øyet' : 'med mobilkamera'} akkurat nå (${s} %). Se mot ${south ? 'sør' : 'nord'}.`,
    tonightTitle: (p) => `Nordlys i kveld · ${p}`,
    tonightBody: (c, a, b, peak, s, d) =>
      `${{ maybe: 'Viss', good: 'Bra', great: 'Svært god' }[c]} sjanse ${a}–${b}, best rundt ${peak} (${s} %${d === 'camera' ? ', mobilkamera' : ''}).`,
  },
};

export function decideAlerts(
  now: Date,
  hours: HourScore[],
  mlat: number,
  cfg: AlertConfig,
  prev: AlertState | null,
): { alerts: Alert[]; state: AlertState | null } {
  if (!cfg.enabled || hours.length === 0) return { alerts: [], state: prev };

  const night = nightKey(cfg.offsets, hours[0]!.time);
  const state: AlertState = prev?.night === night ? { ...prev } : { night, tonightSent: false, nowRank: -1 };
  const T = TEXTS[cfg.lang] ?? TEXTS.en;
  const value = (h: HourScore) => h[cfg.detector];
  const usable = (h: HourScore) => !h.missing.includes('cloud');
  const alerts: Alert[] = [];

  const current = hours.find((h) => now.getTime() >= h.time.getTime() && now.getTime() < h.time.getTime() + HOUR);
  if (current && usable(current) && value(current) >= cfg.threshold) {
    const score = value(current);
    const rank = RANK[labelFor(score)];
    if (rank > state.nowRank) {
      alerts.push({
        kind: 'now',
        title: T.nowTitle(cfg.place.name),
        body: T.nowBody(chanceOf(score), score, cfg.detector, mlat < 0),
      });
      state.nowRank = rank;
      state.tonightSent = true; // the "tonight" heads-up would only repeat it
    }
    return { alerts, state };
  }

  if (!state.tonightSent) {
    const win = bestWindow(hours.filter(usable), value, cfg.threshold);
    const ahead = win ? win.start.getTime() - now.getTime() : -1;
    if (win && ahead > 0 && ahead <= LOOKAHEAD) {
      const score = value(win.peak);
      alerts.push({
        kind: 'tonight',
        title: T.tonightTitle(cfg.place.name),
        body: T.tonightBody(
          chanceOf(score),
          hhmm(cfg.offsets, win.start),
          hhmm(cfg.offsets, win.end),
          hhmm(cfg.offsets, win.peak.time),
          score,
          cfg.detector,
        ),
      });
      state.tonightSent = true;
    }
  }
  return { alerts, state };
}
