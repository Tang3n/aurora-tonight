/**
 * Device-side alerts (phase 2): decide whether tonight deserves a notification. Pure functions, so
 * the background task stays a thin shell and this logic is unit-tested. Server-side alerts (ADR 11)
 * will reuse the same decision.
 */
import { localParts } from '@aurora/model/time';
import { plainText, verdict, type ViewModel } from './view';

/** Eye-score thresholds offered in the app; 50 = "Good". */
export const ALERT_THRESHOLDS = [30, 50, 70] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

export interface AlertPrefs {
  enabled: boolean;
  threshold: AlertThreshold;
  /** Night key (see `nightKey`) of the last alert sent, so we send at most one per night. */
  lastNight: string | null;
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = { enabled: false, threshold: 50, lastNight: null };

/** The night a moment belongs to: the local date 12 h earlier (so 02:00 counts as the evening before). */
export function nightKey(now: Date, tz: string): string {
  return localParts(new Date(now.getTime() - 12 * 3600_000), tz).date;
}

export interface AlertDecision {
  notify: boolean;
  /** Why not, for the debug screen and logs. */
  reason: 'disabled' | 'already-sent' | 'below-threshold' | 'window-over' | 'notify';
  night: string;
  title: string;
  body: string;
}

/**
 * Notify when tonight's headline eye score reaches the threshold, the best window has not ended yet,
 * and no alert went out for this night.
 */
export function decideAlert(vm: ViewModel, tz: string, prefs: AlertPrefs): AlertDecision {
  const night = nightKey(vm.now, tz);
  const v = verdict(vm);
  const title = `${vm.S.alerts.notifTitle(vm.headline, v.labelText)}`;
  const body = plainText(v.sentence);
  const base = { night, title, body };
  if (!prefs.enabled) return { ...base, notify: false, reason: 'disabled' };
  if (prefs.lastNight === night) return { ...base, notify: false, reason: 'already-sent' };
  if (vm.headline < prefs.threshold) return { ...base, notify: false, reason: 'below-threshold' };
  if (vm.window && vm.window.end.getTime() <= vm.now.getTime()) return { ...base, notify: false, reason: 'window-over' };
  return { ...base, notify: true, reason: 'notify' };
}
