import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCloudsMany, setClientIdentity } from './sources';

/** Fake Open-Meteo: one object per requested coordinate, cloud_cover = latitude (to check order). */
function fakeOpenMeteo() {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    calls.push(url.toString());
    const lats = url.searchParams.get('latitude')!.split(',').map(Number);
    const body = lats.map((lat) => ({
      hourly: {
        time: [1_795_046_400, 1_795_050_000, 1_795_053_600],
        cloud_cover: [lat, null, 100],
        cloud_cover_low: [0, null, 50],
        cloud_cover_mid: [0, null, 50],
        cloud_cover_high: [0, null, 50],
      },
    }));
    // A single location comes back as an object, not an array.
    return new Response(JSON.stringify(body.length === 1 ? body[0] : body), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchCloudsMany', () => {
  it('splits into batches of 100 and keeps the input order', async () => {
    const calls = fakeOpenMeteo();
    const points = Array.from({ length: 230 }, (_, i) => ({ lat: i / 10, lon: 5 }));
    const out = await fetchCloudsMany(points);
    expect(calls).toHaveLength(3);
    expect(out).toHaveLength(230);
    expect(out[0]!.points[0]!.cloud.total).toBeCloseTo(0);
    expect(out[150]!.points[0]!.cloud.total).toBeCloseTo(0.15);
    expect(out[229]!.points[0]!.cloud.total).toBeCloseTo(0.229);
  });

  it('skips hours the model has no value for and converts % to fractions', async () => {
    fakeOpenMeteo();
    const [one] = await fetchCloudsMany([{ lat: 58.97, lon: 5.73 }]);
    expect(one!.points.map((p) => p.time.toISOString())).toEqual(['2026-11-19T00:00:00.000Z', '2026-11-19T02:00:00.000Z']);
    expect(one!.points[1]!.cloud).toEqual({ total: 1, low: 0.5, mid: 0.5, high: 0.5 });
  });

  it('sends the client identity once set (native apps), and no extra header before', async () => {
    const seen: (string | null)[] = [];
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get('User-Agent'));
      return new Response(JSON.stringify({ hourly: { time: [], cloud_cover: [], cloud_cover_low: [], cloud_cover_mid: [], cloud_cover_high: [] } }));
    });
    await fetchCloudsMany([{ lat: 1, lon: 1 }]);
    setClientIdentity('aurora-tonight-app/test');
    await fetchCloudsMany([{ lat: 1, lon: 1 }]);
    setClientIdentity('');
    expect(seen[0]).toBeNull();
    expect(seen[1]).toBe('aurora-tonight-app/test');
  });

  it('asks for the metno_seamless model in UTC', async () => {
    const calls = fakeOpenMeteo();
    await fetchCloudsMany([{ lat: 63.43, lon: 10.4 }]);
    const url = new URL(calls[0]!);
    expect(url.searchParams.get('models')).toBe('metno_seamless');
    expect(url.searchParams.get('timezone')).toBe('GMT');
  });
});
