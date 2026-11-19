/**
 * "Where to go" (ADR 6): pick spots within a travel-time limit, score each with the same model and
 * the same verdict logic as home, and rank them. Runs fully in the client.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchCloudsMany, type Location } from '@aurora/data/sources';
import { fetchSpotsNear, type Spot } from '@aurora/data/spots';
import { buildTonight } from '@aurora/model/night';
import type { Window } from '@aurora/model/score';
import { greatCircleKm } from '@aurora/model/visibility';
import type { ForecastData } from './hooks';
import { STRINGS, type Lang } from './i18n';
import { buildViewModel, makeFmt } from './view';

/**
 * Travel time without routing: straight-line distance × a detour factor at an average speed.
 * Fjords make real routes longer than this; routing for the top spots is a later step (ADR 6).
 */
export const ROAD_FACTOR = 1.35;
export const AVG_SPEED_KMH = 65;

export function travelMinutes(km: number): number {
  return Math.round(((km * ROAD_FACTOR) / AVG_SPEED_KMH) * 60);
}

/** Travel-time limits offered in the UI, in minutes. */
export const TRAVEL_LIMITS = [30, 60, 120] as const;
export type TravelLimit = (typeof TRAVEL_LIMITS)[number];

/** Upper bound on spots scored at once (~7 ms each on a laptop, more on a phone). */
const MAX_CANDIDATES = 60;

export interface RankedSpot {
  spot: Spot;
  km: number;
  minutes: number;
  /** Same headline as the home verdict: eye score at the best hour. */
  score: number;
  camera: number;
  window: Window | null;
  cameraWindow: Window | null;
}

export interface WhereToGo {
  status: 'loading' | 'error' | 'ready';
  /** Spots within the largest limit, best first; filter by `minutes` for smaller limits. */
  ranked: RankedSpot[];
  /** True when no spot file covers the area at all. */
  noCoverage: boolean;
  attribution: string | null;
}

/**
 * `baseUrl` is where the spots JSON is served (the web passes its own BASE_URL).
 * Clouds for all candidates come in one Open-Meteo request; Kp and OVATION are shared with home.
 */
export function useWhereToGo(baseUrl: string, home: Location, data: ForecastData, now: Date, lang: Lang): WhereToGo {
  const regions = useQuery({
    queryKey: ['spots', baseUrl, Math.round(home.lat * 10), Math.round(home.lon * 10)],
    queryFn: () => fetchSpotsNear(baseUrl, home.lat, home.lon),
    staleTime: Infinity,
  });

  const candidates = useMemo(() => {
    const maxMinutes = Math.max(...TRAVEL_LIMITS);
    const all = (regions.data ?? []).flatMap((r) => r.spots);
    return all
      .map((spot) => {
        const km = greatCircleKm(home.lat, home.lon, spot.lat, spot.lon);
        return { spot, km, minutes: travelMinutes(km) };
      })
      .filter((c) => c.minutes <= maxMinutes)
      .sort((a, b) => a.km - b.km)
      .slice(0, MAX_CANDIDATES);
  }, [regions.data, home.lat, home.lon]);

  const clouds = useQuery({
    queryKey: ['clouds-many', candidates.map((c) => c.spot.id).join(',')],
    queryFn: () => fetchCloudsMany(candidates.map((c) => c.spot)),
    enabled: candidates.length > 0,
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: 1,
  });

  const minute = Math.floor(now.getTime() / 60_000);
  const ranked = useMemo(() => {
    if (!clouds.data) return [];
    const S = STRINGS[lang];
    return candidates
      .map((c, i): RankedSpot => {
        const place = { ...home, lat: c.spot.lat, lon: c.spot.lon };
        const tonight = buildTonight(now, place, { kp: data.kp, clouds: clouds.data[i]?.points ?? null, ovation: data.ovation });
        const vm = buildViewModel({
          S,
          fmt: makeFmt(lang, home.tz),
          now,
          lat: c.spot.lat,
          tonight,
          ovationTime: null,
          cloudsUpdated: null,
          kpOk: !!data.kp,
        });
        return { ...c, score: vm.headline, camera: vm.headlineCamera, window: vm.window, cameraWindow: vm.cameraWindow };
      })
      .sort((a, b) => b.score - a.score || b.camera - a.camera || a.km - b.km);
    // `now` is folded into `minute`; lang only changes labels, not scores
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clouds.data, candidates, data.kp, data.ovation, minute, home.tz]);

  const noCoverage = regions.isSuccess && regions.data.length === 0;
  const status: WhereToGo['status'] =
    regions.isError || clouds.isError ? 'error' : noCoverage || (clouds.data && regions.isSuccess) ? 'ready' : 'loading';
  return { status, ranked, noCoverage, attribution: regions.data?.[0]?.attribution ?? null };
}

/**
 * Smallest score gain that justifies driving. Scores are percentages with a forecast error of
 * several points, so 14 vs 13 is a tie, not a reason to drive 40 minutes. A judgement call; revisit
 * once reports show how scores and sightings relate (phase 4).
 */
export const MEANINGFUL_GAIN = 5;

export function worthTheDrive(best: RankedSpot | undefined, homeScore: number): boolean {
  return !!best && best.score - homeScore >= MEANINGFUL_GAIN;
}

/** Spots within `limit` minutes, best first. */
export function within(ranked: RankedSpot[], limit: number): RankedSpot[] {
  return ranked.filter((r) => r.minutes <= limit);
}
