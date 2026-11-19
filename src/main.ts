/**
 * App shell: state, fetching schedule, events. Rendering lives in ui/render.ts,
 * all scoring in model/ (pure, unit-tested).
 *
 * Refresh cadence follows how fast each source actually changes:
 *   solar wind 1 min · OVATION 5 min · Kp and clouds 30 min · re-render (ages, "now" marker) 1 min
 */
import './styles.css';
import SunCalc from 'suncalc';
import { LANGS, STRINGS, detectLang, type Lang } from './i18n';
import { buildTonight, nightlyOutlook, type KpBlock, type Tonight } from './model/night';
import type { OvationGrid } from './model/ovation';
import { bestWindow } from './model/score';
import {
  fetchClouds,
  fetchKp,
  fetchOvation,
  fetchSolarWind,
  searchPlaces,
  type CloudForecast,
  type Location,
  type SolarWindSample,
} from './data/sources';
import { createSky } from './ui/sky';
import { drawOval } from './ui/ovalMap';
import {
  esc,
  factorsHtml,
  footerHtml,
  makeFmt,
  nightsHtml,
  spaceHtml,
  timelineHtml,
  tooltipHtml,
  verdictHtml,
  type ViewModel,
} from './ui/render';

const DEFAULT_LOCATION: Location = { name: 'Stavanger', region: 'Rogaland, Norway', lat: 58.97, lon: 5.733, tz: 'Europe/Oslo' };

/* ---------- persisted preferences (best effort; storage may be blocked) ---------- */

const store = {
  get<T>(key: string): T | null {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode etc. — preferences just won't stick */
    }
  },
};

const urlLang = new URLSearchParams(location.search).get('lang') as Lang | null;

const state = {
  lang: (urlLang && LANGS.includes(urlLang) ? urlLang : store.get<Lang>('aurora.lang')) ?? detectLang(),
  loc: store.get<Location>('aurora.loc') ?? DEFAULT_LOCATION,
  kp: null as KpBlock[] | null,
  ovation: null as OvationGrid | null,
  wind: null as SolarWindSample[] | null,
  clouds: null as CloudForecast | null,
  failed: new Set<string>(),
  loaded: false,
  whyOpen: false,
  vm: null as ViewModel | null,
};

/* ---------- DOM ---------- */

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sky = createSky($<HTMLCanvasElement>('sky'));
const ovalCanvas = $<HTMLCanvasElement>('oval');

/* ---------- loading ---------- */

/** Bumped whenever any source delivers new data; part of the physics cache key. */
let dataVersion = 0;

async function load<T>(name: string, fn: () => Promise<T>, apply: (v: T) => void) {
  try {
    apply(await fn());
    dataVersion++;
    state.failed.delete(name);
  } catch (err) {
    console.warn(`[aurora] ${name} failed`, err);
    state.failed.add(name);
  }
}

const loadKp = () => load('Kp', fetchKp, (v) => (state.kp = v));
const loadOvation = () =>
  load('OVATION', fetchOvation, (v) => {
    state.ovation = v;
    redrawOval();
  });
const loadWind = () => load('solar wind', () => fetchSolarWind(120), (v) => (state.wind = v));
const loadClouds = () => load('MET Norway', () => fetchClouds(state.loc.lat, state.loc.lon), (v) => (state.clouds = v));

/* ---------- render ---------- */

function redrawOval() {
  drawOval(ovalCanvas, state.ovation, state.loc, STRINGS[state.lang].you);
}

// The physics runs ~10⁵ small evaluations per night; cache it between renders (language switch,
// tooltip, "why" toggle) and recompute only when data, place or the minute changes.
let tonightCache: { key: string; value: Tonight } | null = null;
function computeTonight(now: Date): Tonight {
  const key = [state.loc.lat, state.loc.lon, dataVersion, Math.floor(now.getTime() / 60_000)].join('|');
  if (tonightCache?.key !== key) {
    tonightCache = {
      key,
      value: buildTonight(now, state.loc, { kp: state.kp, clouds: state.clouds?.points ?? null, ovation: state.ovation }),
    };
  }
  return tonightCache.value;
}

function render() {
  const S = STRINGS[state.lang];
  const now = new Date();
  const loc = state.loc;
  const fmt = makeFmt(state.lang, loc.tz);
  document.documentElement.lang = state.lang === 'no' ? 'nb' : state.lang;

  const tonight = computeTonight(now);
  const win = bestWindow(tonight.hours, (h) => h.eye);
  const camWin = win ? null : bestWindow(tonight.hours, (h) => h.camera, 30);
  const nowHour = tonight.hours.find((h) => now >= h.time && now.getTime() < h.time.getTime() + 3600_000);
  const focus = win?.peak ?? camWin?.peak ?? null;
  const headline = focus?.eye ?? Math.max(0, ...tonight.hours.map((h) => h.eye));
  const headlineCamera = focus?.camera ?? Math.max(0, ...tonight.hours.map((h) => h.camera));
  const goNow = !!(win && nowHour && nowHour.time >= win.start && nowHour.time < win.end && nowHour.eye >= 50);

  const vm: ViewModel = {
    S,
    fmt,
    now,
    lat: loc.lat,
    tonight,
    window: win,
    cameraWindow: camWin,
    headline,
    headlineCamera,
    goNow,
    ovationTime: state.ovation?.observed ?? null,
    cloudsUpdated: state.clouds?.updated ?? null,
    kpOk: !!state.kp,
  };
  state.vm = vm;

  // Header
  $('locBtn').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
    <span>${esc(loc.name)}</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
  $('locBtn').setAttribute('aria-label', `${S.changeLocation}: ${loc.name}`);
  $('lang').innerHTML = LANGS.map((l) => `<button data-lang="${l}" aria-pressed="${l === state.lang}">${l.toUpperCase()}</button>`).join('');
  $<HTMLInputElement>('q').placeholder = S.searchPlaceholder;
  $('geo').innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>${S.useMyLocation}`;

  // Body
  if (state.loaded) {
    $('verdict').innerHTML = verdictHtml(vm, state.whyOpen);
  } else {
    $('verdict').innerHTML = `<div class="eyebrow">${S.tonight}</div><div class="verdict"><div class="score dim">—</div></div><p class="sentence">${S.loading}</p>`;
  }
  const minutes = state.ovation ? Math.max(0, Math.round((state.ovation.forecast.getTime() - now.getTime()) / 60_000)) : 60;
  $('ovalTitle').textContent = S.oval(minutes);
  $('lgLow').textContent = S.low;
  $('lgHigh').textContent = S.high;
  ovalCanvas.setAttribute('aria-label', S.oval(minutes));

  if (state.loaded) {
    $('timeline').innerHTML = timelineHtml(vm, loc);
    const sunNow = (SunCalc.getPosition(now, loc.lat, loc.lon).altitude * 180) / Math.PI;
    $('factors').innerHTML = factorsHtml(vm, loc, sunNow, SunCalc.getMoonIllumination(now).fraction);
    $('space').innerHTML = spaceHtml(S, state.wind);
    $('nights').innerHTML = nightsHtml(S, fmt, state.kp ? nightlyOutlook(state.kp, now, loc.tz) : null);
  }
  $('footer').innerHTML = footerHtml(S);

  const notice = $('notice');
  notice.hidden = state.failed.size === 0;
  notice.textContent = state.failed.size ? S.failed([...state.failed].join(', ')) : '';

  sky.setScore(state.loaded ? headline : 0);
}

/* ---------- events ---------- */

$('lang').addEventListener('click', (e) => {
  const lang = (e.target as HTMLElement).closest<HTMLElement>('[data-lang]')?.dataset.lang as Lang | undefined;
  if (!lang || lang === state.lang) return;
  state.lang = lang;
  store.set('aurora.lang', lang);
  render();
  redrawOval();
  alerts?.render();
  void alerts?.sync();
});

document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('#why')) {
    state.whyOpen = !state.whyOpen;
    render();
  }
});

// Timeline tooltip: hover on desktop, focus/tap on touch and keyboard.
function showTip(el: HTMLElement | null) {
  const tip = document.getElementById('tip');
  const vm = state.vm;
  if (!tip || !vm) return;
  if (!el) return tip.classList.remove('show');
  const h = vm.tonight.hours[Number(el.dataset.i)];
  if (!h) return;
  tip.innerHTML = tooltipHtml(h, vm.S, vm.fmt);
  const card = $('timeline').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  tip.style.left = `${Math.min(card.width - 190, Math.max(8, r.left - card.left - 70))}px`;
  // Sit just above the bar itself (CSS shifts the tooltip up by its own height).
  const barTop = el.querySelector('.bar')?.getBoundingClientRect().top ?? r.top;
  tip.style.top = `${barTop - card.top - 8}px`;
  tip.classList.add('show');
}
const timelineEl = $('timeline');
timelineEl.addEventListener('mouseover', (e) => showTip((e.target as HTMLElement).closest<HTMLElement>('.hour')));
timelineEl.addEventListener('mouseleave', () => showTip(null));
timelineEl.addEventListener('focusin', (e) => showTip((e.target as HTMLElement).closest<HTMLElement>('.hour')));
timelineEl.addEventListener('focusout', () => showTip(null));

/* ---------- location picker ---------- */

const pop = $('pop');
const locBtn = $('locBtn');
const q = $<HTMLInputElement>('q');
const results = $('results');
let lastResults: Location[] = [];

function openPicker(open: boolean) {
  pop.hidden = !open;
  locBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    q.value = '';
    results.innerHTML = '';
    q.focus();
  }
}

async function setLocation(loc: Location) {
  state.loc = loc;
  store.set('aurora.loc', loc);
  alerts?.render();
  void alerts?.sync();
  openPicker(false);
  state.clouds = null;
  render();
  redrawOval();
  await loadClouds();
  render();
}

locBtn.addEventListener('click', () => openPicker(pop.hidden));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !pop.hidden) {
    openPicker(false);
    locBtn.focus();
  }
});
document.addEventListener('click', (e) => {
  if (!pop.hidden && !(e.target as HTMLElement).closest('.loc')) openPicker(false);
});

let searchTimer = 0;
let searchSeq = 0;
q.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const text = q.value.trim();
  if (text.length < 2) {
    results.innerHTML = '';
    return;
  }
  searchTimer = window.setTimeout(async () => {
    const seq = ++searchSeq;
    try {
      const found = await searchPlaces(text, state.lang === 'no' ? 'nb' : state.lang);
      if (seq !== searchSeq) return; // a newer query already answered
      lastResults = found;
      results.innerHTML = found.length
        ? found.map((p, i) => `<li><button type="button" data-r="${i}">${esc(p.name)}<small>${esc(p.region)}</small></button></li>`).join('')
        : `<li class="empty">${STRINGS[state.lang].noResults}</li>`;
    } catch {
      results.innerHTML = `<li class="empty">${STRINGS[state.lang].noResults}</li>`;
    }
  }, 250);
});
q.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && lastResults[0]) void setLocation(lastResults[0]);
});
results.addEventListener('click', (e) => {
  const i = (e.target as HTMLElement).closest<HTMLElement>('[data-r]')?.dataset.r;
  const loc = i !== undefined ? lastResults[Number(i)] : undefined;
  if (loc) void setLocation(loc);
});

$('geo').addEventListener('click', () => {
  const S = STRINGS[state.lang];
  if (!navigator.geolocation) return;
  $('geo').textContent = S.locating;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      void setLocation({
        name: S.myLocation,
        region: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        lat,
        lon,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    },
    () => render(),
    { timeout: 10_000, maximumAge: 10 * 60_000 },
  );
});

/* ---------- notifications (Android app only) ---------- */

// Inside the Capacitor WebView the native bridge defines window.Capacitor. Checking it directly
// keeps @capacitor/* out of the web bundle: the module is only fetched in the app.
const isNativeApp = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
let alerts: import('./native/alerts').Alerts | null = null;
if (isNativeApp) {
  const { initAlerts } = await import('./native/alerts');
  alerts = initAlerts({ place: () => state.loc, lang: () => state.lang }, $('alertsWrap'), $('alertsBtn'), $('alertsPop'));
}

/* ---------- boot ---------- */

render();
redrawOval();
// Progressive: the verdict needs Kp + clouds; the ~1 MB OVATION grid and solar wind fill in when they land.
const ovationAndWind = Promise.all([loadOvation(), loadWind()]);
await Promise.all([loadKp(), loadClouds()]);
state.loaded = true;
document.body.classList.remove('loading');
render();
void ovationAndWind.then(render);

const every = (min: number, fn: () => Promise<void>) =>
  setInterval(() => {
    if (!document.hidden) void fn().then(render);
  }, min * 60_000);
every(1, loadWind);
every(5, loadOvation);
every(30, loadKp);
every(30, loadClouds);
setInterval(render, 60_000);
