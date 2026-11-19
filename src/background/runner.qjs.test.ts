/**
 * Runs the *built* runner bundle in QuickJS — the engine Capacitor's BackgroundRunner embeds on
 * Android — with stand-ins for the runner globals and a fetch that serves synthetic data.
 * Catches what unit tests under Node can't: globals missing in QuickJS (Intl, atob,
 * AbortController, ...) and bundling mistakes (ES module syntax, top-level await).
 */
import { getQuickJS, type QuickJSContext, type QuickJSHandle } from 'quickjs-emscripten';
import { build, type Rollup } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import runnerConfig from '../../vite.runner.config';

const HOUR = 3600_000;
let bundle = '';

beforeAll(async () => {
  const out = (await build({ ...runnerConfig, logLevel: 'silent', build: { ...runnerConfig.build, write: false } })) as Rollup.RollupOutput[];
  bundle = (out[0]!.output[0] as Rollup.OutputChunk).code;
}, 60_000);

/** Synthetic sources: strong activity (Kp 7) and clear sky around now. */
function fakeResponse(url: string): unknown {
  const start = Math.floor(Date.now() / (3 * HOUR)) * 3 * HOUR - 24 * HOUR;
  if (url.includes('k-index-forecast'))
    return Array.from({ length: 32 }, (_, i) => ({
      time_tag: new Date(start + i * 3 * HOUR).toISOString().slice(0, 19),
      kp: 7,
      observed: 'predicted',
    }));
  if (url.includes('api.met.no'))
    return {
      properties: {
        meta: { updated_at: new Date().toISOString() },
        timeseries: Array.from({ length: 72 }, (_, i) => ({
          time: new Date(start + i * HOUR).toISOString(),
          data: { instant: { details: { cloud_area_fraction: 0, cloud_area_fraction_low: 0, cloud_area_fraction_medium: 0, cloud_area_fraction_high: 0 } } },
        })),
      },
    };
  return null; // OVATION: simulate an outage
}

interface Harness {
  dispatch(event: string, args?: unknown): Promise<{ ok: boolean; value: unknown }>;
  kv: Map<string, string>;
  shown: { id: number; title: string; body: string }[];
  requests: { url: string; headers: unknown }[];
}

async function harness(): Promise<Harness> {
  const QuickJS = await getQuickJS();
  const vm: QuickJSContext = QuickJS.newContext();
  const kv = new Map<string, string>();
  const shown: Harness['shown'] = [];
  const requests: Harness['requests'] = [];
  const fn = (name: string, f: (...a: QuickJSHandle[]) => QuickJSHandle | void, target = vm.global) => {
    const h = vm.newFunction(name, f);
    vm.setProp(target, name, h);
    h.dispose();
  };
  const obj = (name: string) => {
    const o = vm.newObject();
    vm.setProp(vm.global, name, o);
    return o;
  };
  const json = (h: QuickJSHandle) => {
    const s = vm.getString(vm.unwrapResult(vm.callFunction(vm.getProp(vm.getProp(vm.global, 'JSON'), 'stringify'), vm.undefined, h)));
    return s === undefined ? undefined : JSON.parse(s);
  };
  const fromJson = (v: unknown) => vm.unwrapResult(vm.evalCode(`(${JSON.stringify(v ?? null)})`));

  // console
  const con = obj('console');
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) fn(k, () => {}, con);
  con.dispose();
  // timers: the runner code only uses them for nothing time-critical here
  fn('setTimeout', () => vm.newNumber(0));
  fn('clearTimeout', () => {});

  // CapacitorKV
  const kvObj = obj('CapacitorKV');
  fn('set', (k, v) => void kv.set(vm.getString(k), vm.getString(v)), kvObj);
  fn('get', (k) => {
    const v = kv.get(vm.getString(k));
    return v === undefined ? vm.undefined : fromJson({ value: v });
  }, kvObj);
  fn('remove', (k) => void kv.delete(vm.getString(k)), kvObj);
  kvObj.dispose();

  // CapacitorNotifications
  const nObj = obj('CapacitorNotifications');
  fn('schedule', (list) => void shown.push(...(json(list) as Harness['shown'])), nObj);
  nObj.dispose();

  // fetch → host promise with { ok, status, text() }
  fn('fetch', (urlH, initH) => {
    const url = vm.getString(urlH);
    requests.push({ url, headers: json(initH)?.headers });
    const body = fakeResponse(url);
    const p = vm.newPromise();
    const res = fromJson({ ok: body !== null, status: body !== null ? 200 : 503 });
    const textP = () => {
      const tp = vm.newPromise();
      tp.resolve(vm.newString(JSON.stringify(body)));
      return tp.handle;
    };
    fn('text', textP, res);
    p.resolve(res);
    res.dispose();
    return p.handle;
  });

  // addEventListener + dispatch
  vm.unwrapResult(vm.evalCode('globalThis.__handlers = {}; globalThis.addEventListener = (e, h) => { __handlers[e] = h; };')).dispose();
  vm.unwrapResult(vm.evalCode(bundle, 'aurora.js')).dispose();

  async function dispatch(event: string, args: unknown = {}) {
    vm.unwrapResult(
      vm.evalCode(`globalThis.__done = null;
        __handlers[${JSON.stringify(event)}](
          (v) => { __done = { ok: true, value: v === undefined ? null : v }; },
          (e) => { __done = { ok: false, value: String(e) }; },
          ${JSON.stringify(args)});`),
    ).dispose();
    for (let i = 0; i < 100; i++) {
      vm.runtime.executePendingJobs();
      const done = json(vm.getProp(vm.global, '__done'));
      if (done) return done as { ok: boolean; value: unknown };
      await new Promise((r) => setTimeout(r, 0));
    }
    throw new Error(`runner did not resolve "${event}"`);
  }
  return { dispatch, kv, shown, requests };
}

describe('background runner in QuickJS', () => {
  it('has no Intl / atob / AbortController (sanity check of the test engine)', async () => {
    const QuickJS = await getQuickJS();
    expect(QuickJS.evalCode('[typeof Intl, typeof AbortController].join()')).toBe('undefined,undefined');
  });

  it('does nothing until configured', async () => {
    const h = await harness();
    const r = await h.dispatch('check');
    expect(r.ok).toBe(true);
    expect(h.requests).toEqual([]);
  });

  it('checks, scores and notifies with the shared model', async () => {
    const h = await harness();
    const now = Date.now();
    // Tromsø: dark for most of the day in late autumn, so a clear Kp 7 night is a sure alert.
    await h.dispatch('configure', {
      enabled: true,
      place: { name: 'Tromsø', lat: 69.65, lon: 18.96 },
      lang: 'cs',
      detector: 'eye',
      threshold: 50,
      offsets: [[now - 30 * 24 * HOUR, 60]],
    });
    const r = await h.dispatch('check');
    expect(r).toMatchObject({ ok: true });
    const status = r.value as { ok: boolean; peak: number; sent: string[] };
    expect(status.peak).toBeGreaterThan(50);
    expect(status.sent.length).toBe(1);
    expect(h.shown).toHaveLength(1);
    expect(h.shown[0]!.title).toMatch(/^Polární záře (teď|dnes v noci) · Tromsø$/);
    // MET Norway gets an identifying User-Agent
    expect(h.requests.find((q) => q.url.includes('api.met.no'))!.headers).toMatchObject({ 'User-Agent': expect.stringContaining('AuroraTonight') });
    // the same run again does not repeat the alert
    await h.dispatch('check');
    expect(h.shown).toHaveLength(1);
    expect(JSON.parse(h.kv.get('alerts.status')!)).toMatchObject({ ok: true, sent: [] });
  }, 30_000);
});
