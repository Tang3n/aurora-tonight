/**
 * Seeded spots: OSM viewpoints per region, built by tools/fetch_spots.py and served as static JSON
 * (ADR 7). The web serves them from its own origin; the app will load them from the website.
 */

export interface Spot {
  /** "osm-n123" (node) or "osm-w456" (way). */
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Metres above sea level, if mapped. */
  ele: number | null;
  /** View bearings in degrees from the OSM `direction` tag, if mapped. */
  direction: number[] | null;
  /** Any mapped view direction within 67.5° of north; null when unknown. */
  facesNorth: boolean | null;
}

export interface SpotRegion {
  region: string;
  name: string;
  generated: string;
  license: string;
  attribution: string;
  spots: Spot[];
}

/** Regions with a spots file, with a bounding box to skip regions far from the user. */
export const SPOT_REGIONS: { id: string; south: number; west: number; north: number; east: number }[] = [
  { id: 'rogaland', south: 58.0, west: 4.5, north: 59.9, east: 7.3 },
  { id: 'trondelag', south: 62.2, west: 7.9, north: 65.5, east: 14.4 },
];

/** Fetch every region (for a direct link to a spot, wherever home is). `baseUrl` ends with a slash. */
export async function fetchAllSpotRegions(baseUrl: string): Promise<SpotRegion[]> {
  return Promise.all(
    SPOT_REGIONS.map(async (r) => {
      const res = await fetch(`${baseUrl}spots/${r.id}.json`);
      if (!res.ok) throw new Error(`${res.status} — spots/${r.id}.json`);
      return (await res.json()) as SpotRegion;
    }),
  );
}

/** Fetch every region whose box lies within `marginKm` of the point. `baseUrl` ends with a slash. */
export async function fetchSpotsNear(baseUrl: string, lat: number, lon: number, marginKm = 150): Promise<SpotRegion[]> {
  const dLat = marginKm / 111;
  const dLon = marginKm / (111 * Math.cos((lat * Math.PI) / 180));
  const near = SPOT_REGIONS.filter(
    (r) => lat > r.south - dLat && lat < r.north + dLat && lon > r.west - dLon && lon < r.east + dLon,
  );
  return Promise.all(
    near.map(async (r) => {
      const res = await fetch(`${baseUrl}spots/${r.id}.json`);
      if (!res.ok) throw new Error(`${res.status} — spots/${r.id}.json`);
      return (await res.json()) as SpotRegion;
    }),
  );
}
