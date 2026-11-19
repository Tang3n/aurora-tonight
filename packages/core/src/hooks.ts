/**
 * React hooks shared by the web and the mobile app. They use React and TanStack Query only:
 * no DOM, no React Native (ADR 13). Platform specifics come in as arguments (storage, locale).
 */
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchClouds,
  fetchKp,
  fetchOvation,
  fetchSolarWind,
  type Location,
} from '@aurora/data/sources';
import { buildTonight, type Tonight } from '@aurora/model/night';
import { STRINGS, type Lang } from './i18n';
import { buildViewModel, makeFmt, type ViewModel } from './view';

export const DEFAULT_LOCATION: Location = {
  name: 'Stavanger',
  region: 'Rogaland, Norway',
  lat: 58.97,
  lon: 5.733,
  tz: 'Europe/Oslo',
};

const MIN = 60_000;

/* ---------- clock ---------- */

/** Current time, updated every `everyMs` (the "now" marker and data ages move with it). */
export function useNow(everyMs = MIN): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/* ---------- persisted preferences ---------- */

/** Synchronous key-value storage; the web passes localStorage, the app its own. */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Best-effort persistence: storage may be blocked (private mode); the value then just won't stick. */
export function usePersistentState<T>(store: KeyValueStore, key: string, initial: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = store.get(key);
      return raw ? (JSON.parse(raw) as T) : initial();
    } catch {
      return initial();
    }
  });
  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        store.set(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [store, key],
  );
  return [value, update] as const;
}

/* ---------- forecast data ---------- */

/**
 * Refresh cadence follows how fast each source actually changes:
 *   solar wind 1 min · OVATION 5 min · Kp and clouds 30 min.
 * TanStack Query pauses intervals while the page/app is in the background and keeps the last good
 * data when a refresh fails, which is what the old hand-written loader did.
 */
export function useForecastData(loc: Location) {
  const common = { retry: 1, refetchIntervalInBackground: false } as const;
  const kp = useQuery({ queryKey: ['kp'], queryFn: fetchKp, refetchInterval: 30 * MIN, staleTime: 30 * MIN, ...common });
  const clouds = useQuery({
    queryKey: ['clouds', loc.lat, loc.lon],
    queryFn: () => fetchClouds(loc.lat, loc.lon),
    refetchInterval: 30 * MIN,
    staleTime: 30 * MIN,
    ...common,
  });
  const ovation = useQuery({ queryKey: ['ovation'], queryFn: fetchOvation, refetchInterval: 5 * MIN, staleTime: 5 * MIN, ...common });
  const wind = useQuery({
    queryKey: ['wind'],
    queryFn: () => fetchSolarWind(120),
    refetchInterval: MIN,
    staleTime: MIN,
    ...common,
  });

  // The verdict needs Kp and clouds; once both have answered (data or error) the page counts as
  // loaded and stays loaded, also while clouds for a new place are on their way.
  const loadedOnce = useRef(false);
  if (kp.status !== 'pending' && clouds.status !== 'pending') loadedOnce.current = true;

  const failed: string[] = [];
  if (kp.isError) failed.push('Kp');
  if (ovation.isError) failed.push('OVATION');
  if (wind.isError) failed.push('solar wind');
  if (clouds.isError) failed.push('MET Norway');

  return {
    kp: kp.data ?? null,
    clouds: clouds.data ?? null,
    ovation: ovation.data ?? null,
    wind: wind.data ?? null,
    loaded: loadedOnce.current,
    failed,
  };
}

export type ForecastData = ReturnType<typeof useForecastData>;

/* ---------- tonight ---------- */

/**
 * The physics runs ~10⁵ small evaluations per night; recompute only when data, place or the
 * minute changes (not on a language switch or a tooltip).
 */
export function useTonight(loc: Location, data: ForecastData, now: Date): Tonight {
  const minute = Math.floor(now.getTime() / MIN);
  return useMemo(
    () => buildTonight(now, loc, {
      kp: data.kp,
      clouds: data.clouds?.points ?? null,
      ovation: data.ovation,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is folded into `minute` on purpose
    [loc.lat, loc.lon, data.kp, data.clouds, data.ovation, minute],
  );
}

export function useViewModel(lang: Lang, loc: Location, data: ForecastData, now: Date): ViewModel {
  const tonight = useTonight(loc, data, now);
  const fmt = useMemo(() => makeFmt(lang, loc.tz), [lang, loc.tz]);
  return buildViewModel({
    S: STRINGS[lang],
    fmt,
    now,
    lat: loc.lat,
    tonight,
    ovationTime: data.ovation?.observed ?? null,
    cloudsUpdated: data.clouds?.updated ?? null,
    kpOk: !!data.kp,
  });
}
