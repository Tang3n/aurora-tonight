/**
 * NOAA OVATION Prime nowcast: a 1°×1° global grid with the probability (0..100)
 * of visible aurora overhead, valid ~30–90 minutes ahead.
 */

export interface OvationGrid {
  observed: Date;
  forecast: Date;
  /** values[lon * 181 + (lat + 90)], lon 0..359, lat −90..90 */
  values: Uint8Array;
}

export interface OvationJson {
  'Observation Time': string;
  'Forecast Time': string;
  coordinates: [number, number, number][];
}

export function parseOvation(json: OvationJson): OvationGrid {
  const values = new Uint8Array(360 * 181);
  for (const [lon, lat, v] of json.coordinates) {
    values[(((Math.round(lon) % 360) + 360) % 360) * 181 + (Math.round(lat) + 90)] = v;
  }
  return {
    observed: new Date(json['Observation Time']),
    forecast: new Date(json['Forecast Time']),
    values,
  };
}

export function ovationAt(grid: OvationGrid, lat: number, lon: number): number {
  const la = Math.max(-90, Math.min(90, Math.round(lat)));
  const lo = (((Math.round(lon) % 360) + 360) % 360);
  return grid.values[lo * 181 + (la + 90)] ?? 0;
}

/**
 * Visibility near the observer. Aurora overhead somewhere poleward can still be seen
 * on the horizon (it glows at ~110 km altitude), so we scan up to 10° towards the pole
 * and ±15° in longitude, discounting by distance.
 */
export function ovationNear(grid: OvationGrid, lat: number, lon: number): number {
  const toPole = lat >= 0 ? 1 : -1;
  let best = 0;
  for (let dLat = 0; dLat <= 10; dLat++) {
    for (let dLon = -15; dLon <= 15; dLon++) {
      const v = ovationAt(grid, lat + toPole * dLat, lon + dLon);
      const w = (1 - dLat / 12) * (1 - Math.abs(dLon) / 20);
      if (v * w > best) best = v * w;
    }
  }
  return best;
}
