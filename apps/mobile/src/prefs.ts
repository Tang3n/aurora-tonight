/**
 * Persisted preferences. Read by the UI (through usePersistentState) and by the background task,
 * which runs without React, so the keys and readers live here in one place.
 * expo-sqlite/kv-store has synchronous get/set, which usePersistentState needs.
 */
import { DEFAULT_ALERT_PREFS, type AlertPrefs } from '@aurora/core/alerts';
import { DEFAULT_LOCATION, type KeyValueStore } from '@aurora/core/hooks';
import { langFromLocale, LANGS, type Lang } from '@aurora/core/i18n';
import type { Location } from '@aurora/data/sources';
import Storage from 'expo-sqlite/kv-store';
import { getLocales } from 'expo-localization';

export const KEYS = {
  lang: 'aurora.lang',
  loc: 'aurora.loc',
  /** { enabled, threshold } — set by the user. */
  alerts: 'aurora.alerts',
  /** Night key of the last alert — written by the background task. */
  lastNight: 'aurora.alerts.lastNight',
  /** ISO time and outcome of the last background check, for the Alerts screen. */
  lastCheck: 'aurora.alerts.lastCheck',
} as const;

export const appStore: KeyValueStore = {
  get: (key) => Storage.getItemSync(key),
  set: (key, value) => Storage.setItemSync(key, value),
};

function readJson<T>(key: string): T | null {
  try {
    const raw = appStore.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function systemLang(): Lang {
  return langFromLocale(getLocales()[0]?.languageTag ?? 'en');
}

export function readLang(): Lang {
  const l = readJson<Lang>(KEYS.lang);
  return l && LANGS.includes(l) ? l : systemLang();
}

export const readLocation = (): Location => readJson<Location>(KEYS.loc) ?? DEFAULT_LOCATION;

export type AlertSettings = Pick<AlertPrefs, 'enabled' | 'threshold'>;

export function readAlertPrefs(): AlertPrefs {
  const s = readJson<AlertSettings>(KEYS.alerts);
  return { ...DEFAULT_ALERT_PREFS, ...s, lastNight: readJson<string>(KEYS.lastNight) };
}

export interface LastCheck {
  at: string;
  reason: string;
  score: number;
}

export const readLastCheck = () => readJson<LastCheck>(KEYS.lastCheck);
export const writeLastCheck = (c: LastCheck) => appStore.set(KEYS.lastCheck, JSON.stringify(c));
export const writeLastNight = (night: string) => appStore.set(KEYS.lastNight, JSON.stringify(night));
