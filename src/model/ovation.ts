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
