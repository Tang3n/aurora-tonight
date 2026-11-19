/**
 * View model: everything the screens show, computed from model output, as plain data.
 * No HTML, no DOM, no React Native: the web and the app render the same data their own way.
 * Ported 1:1 from the former apps/web/src/ui/render.ts.
 */
import SunCalc from 'suncalc';
import type { SolarWindSample } from '@aurora/data/sources';
import { nightlyOutlook, type KpBlock, type NightOutlook, type Tonight } from '@aurora/model/night';
import { bestWindow, labelFor, type HourScore, type Label, type Window } from '@aurora/model/score';
import { LOCALE, type Lang, type Strings } from './i18n';

/* ---------- formatting in the location's time zone ---------- */

export interface Fmt {
  time(d: Date): string;
  hour(d: Date): string;
  day(d: Date): string;
  weekday(dateKey: string): { name: string; date: string };
  age(d: Date, now: Date): string;
}

export function makeFmt(lang: Lang, tz: string): Fmt {
  const loc = LOCALE[lang];
  const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz });
  const hour = new Intl.DateTimeFormat(loc, { hour: '2-digit', hourCycle: 'h23', timeZone: tz });
  const day = new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
  const weekday = new Intl.DateTimeFormat(loc, { weekday: 'long', timeZone: 'UTC' });
  const short = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return {
    time: (d) => (isNaN(d.getTime()) ? '—' : time.format(d)),
    hour: (d) => hour.format(d).replace(/\D/g, '').padStart(2, '0'),
    day: (d) => day.format(d),
    weekday: (key) => {
      const d = new Date(`${key}T12:00:00Z`);
      return { name: cap(weekday.format(d)), date: short.format(d) };
    },
    // "4 min" / "2 h" reads the same in all three languages.
    age: (d, now) => {
      const min = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60_000));
      return min < 60 ? `${min} min` : `${Math.round(min / 60)} h`;
    },
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const pct = (x: number) => Math.round(x * 100);
const HOUR = 3600_000;

/* ---------- the verdict ---------- */

export interface ViewModel {
  S: Strings;
  fmt: Fmt;
  now: Date;
  lat: number;
  tonight: Tonight;
  /** Best window for the naked eye, and (if the eye has none) for a phone camera. */
  window: Window | null;
  cameraWindow: Window | null;
  headline: number;
  headlineCamera: number;
  goNow: boolean;
  ovationTime: Date | null;
  cloudsUpdated: Date | null;
  kpOk: boolean;
}

export interface ViewInput {
  S: Strings;
  fmt: Fmt;
  now: Date;
  lat: number;
  tonight: Tonight;
  ovationTime: Date | null;
  cloudsUpdated: Date | null;
  kpOk: boolean;
}

export function buildViewModel(input: ViewInput): ViewModel {
  const { tonight, now } = input;
  const win = bestWindow(tonight.hours, (h) => h.eye);
  const camWin = win ? null : bestWindow(tonight.hours, (h) => h.camera, 30);
  const nowHour = tonight.hours.find((h) => now >= h.time && now.getTime() < h.time.getTime() + HOUR);
  const focus = win?.peak ?? camWin?.peak ?? null;
  const headline = focus?.eye ?? Math.max(0, ...tonight.hours.map((h) => h.eye));
  const headlineCamera = focus?.camera ?? Math.max(0, ...tonight.hours.map((h) => h.camera));
  const goNow = !!(win && nowHour && nowHour.time >= win.start && nowHour.time < win.end && nowHour.eye >= 50);
  return { ...input, window: win, cameraWindow: camWin, headline, headlineCamera, goNow };
}

/** The hour whose verdict the hero describes: eye peak, else camera peak, else the darkest hour. */
export function focusHour(vm: Pick<ViewModel, 'window' | 'cameraWindow' | 'tonight'>): HourScore | null {
  return vm.window?.peak ?? vm.cameraWindow?.peak ?? vm.tonight.hours.reduce<HourScore | null>(
    (a, h) => (!a || h.auroraEye > a.auroraEye ? h : a), null);
}

export interface Verdict {
  label: Label;
  /** Headline label text ("Go now" overrides the score label). */
  labelText: string;
  /** May contain <b> from our own translations (never from APIs). */
  sentence: string;
  direction: string;
  elevation: number;
  dim: boolean;
  sources: { name: string; ok: boolean; text: string }[];
}

export function verdict(vm: ViewModel): Verdict {
  const { S, fmt, tonight, window: win, headline, now } = vm;
  const label = labelFor(headline);
  const dir = vm.lat >= 0 ? S.north : S.south;
  const focus = focusHour(vm);
  const elevation = focus?.arcElevation ?? 0;

  let sentence: string;
  if (!tonight.hours.length) sentence = S.sentence.noNight;
  else if (win) sentence = `${S.sentence.window(fmt.time(win.start), fmt.time(win.end))} ${S.sentence.look(dir, elevation)}`;
  else if (vm.cameraWindow)
    sentence = `${S.sentence.cameraOnly(fmt.time(vm.cameraWindow.start), fmt.time(vm.cameraWindow.end))} ${S.sentence.look(dir, elevation)}`;
  else {
    const clear = mean(tonight.hours.map((h) => h.clear));
    const aurora = Math.max(...tonight.hours.map((h) => h.auroraEye));
    sentence = clear < 0.35 && aurora > 0.3 ? S.sentence.clouds : S.sentence.quiet(tonight.kpNeeded.toFixed(1));
  }

  const sources = [
    vm.ovationTime
      ? { name: S.aurora, ok: true, text: S.dataAge(S.aurora, fmt.age(vm.ovationTime, now)) }
      : { name: S.aurora, ok: false, text: S.unavailable(S.aurora) },
    vm.cloudsUpdated
      ? { name: S.weather, ok: true, text: S.dataAge(S.weather, fmt.age(vm.cloudsUpdated, now)) }
      : { name: S.weather, ok: false, text: S.unavailable(S.weather) },
  ];

  return {
    label,
    labelText: vm.goNow ? S.goNow : S.labels[label],
    sentence,
    direction: dir,
    elevation,
    dim: headline < 30,
    sources,
  };
}

/* ---------- rich text from our translations ---------- */

export interface TextPart {
  text: string;
  bold: boolean;
}

/**
 * Our translation strings mark emphasis with <b>…</b> (never any other tag). The web renders them
 * as HTML; React Native has no HTML, so it renders these parts as nested <Text> elements.
 */
export function richText(s: string): TextPart[] {
  const parts: TextPart[] = [];
  const re = /<b>(.*?)<\/b>/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) parts.push({ text: s.slice(last, m.index), bold: false });
    parts.push({ text: m[1]!, bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ text: s.slice(last), bold: false });
  return parts;
}

/** The same string without markup, e.g. for a notification. */
export const plainText = (s: string) => richText(s).map((p) => p.text).join('');

/* ---------- timeline ---------- */

export function sunTimesLine(vm: ViewModel, place: { lat: number; lon: number }): string {
  const { S, fmt, tonight } = vm;
  const hours = tonight.hours;
  if (!hours.length) return '';
  const first = hours[0]!.time.getTime();
  const evening = SunCalc.getTimes(new Date(first - 12 * HOUR), place.lat, place.lon);
  const morning = SunCalc.getTimes(hours.at(-1)!.time, place.lat, place.lon);
  const dark = isNaN(evening.night.getTime()) ? evening.nauticalDusk : evening.night;
  return isNaN(evening.sunset.getTime()) ? S.polarNight : S.sunTimes(fmt.time(evening.sunset), fmt.time(dark), fmt.time(morning.sunrise));
}

export function isNowHour(h: HourScore, now: Date): boolean {
  return now >= h.time && now.getTime() < h.time.getTime() + HOUR;
}

/** Window highlighted in the timeline: the eye window, else the camera window. */
export function highlightWindow(vm: ViewModel): Window | null {
  return vm.window ?? vm.cameraWindow;
}

export function inWindow(h: HourScore, w: Window | null): boolean {
  return !!w && h.time >= w.start && h.time < w.end;
}

export interface TooltipRow {
  key: keyof Strings['tt'];
  value: string;
}

export function tooltipRows(h: HourScore, S: Strings): { live: boolean; rows: TooltipRow[] } {
  const height = h.arcElevation >= 60 ? S.tt.overhead : `${Math.max(0, Math.round(h.arcElevation))}°`;
  return {
    live: h.nowcastWeight > 0.5,
    rows: [
      { key: 'eye', value: `${h.eye} %` },
      { key: 'camera', value: `${h.camera} %` },
      { key: 'kp', value: h.kp?.toFixed(1) ?? '—' },
      { key: 'height', value: height },
      { key: 'clear', value: h.cloud ? `${pct(h.clear)} %` : '—' },
      { key: 'sky', value: h.background < 100 ? `${h.background.toFixed(1)}×` : '☀' },
    ],
  };
}

/* ---------- factor cards ---------- */

export type Tone = 'good' | 'ok' | 'bad';
export type FactorIcon = 'activity' | 'clouds' | 'dark' | 'moon';

export interface Factor {
  icon: FactorIcon;
  tone: Tone;
  status: string;
  value: string;
  sub: string;
  text: string;
  /** 0..1, how much this factor lets through. */
  weight: number;
}

export function factors(vm: ViewModel, place: { lat: number; lon: number }, now: Date): Factor[] {
  const { S, fmt, tonight } = vm;
  const H = tonight.hours;
  const f = S.f;
  if (!H.length) return [];
  const dir = vm.lat >= 0 ? S.north : S.south;
  const focus = focusHour(vm)!;
  const sunNow = (SunCalc.getPosition(now, place.lat, place.lon).altitude * 180) / Math.PI;
  const moonNow = SunCalc.getMoonIllumination(now).fraction;

  // Aurora: clear-sky visibility at the best hour, explained by where the oval stands.
  const a = focus.auroraEye;
  const activity: Factor =
    focus.kp === null
      ? { icon: 'activity', tone: 'bad', status: f.noData, value: '—', sub: '', text: S.failed('Kp'), weight: a }
      : {
          icon: 'activity',
          tone: a > 0.6 ? 'good' : a > 0.25 ? 'ok' : 'bad',
          status: a > 0.6 ? f.strong : a > 0.25 ? f.moderate : f.weak,
          value: `${pct(a)} %`,
          sub: f.auroraSub,
          text: f.auroraText(focus.kp.toFixed(1), dir, focus.arcElevation),
          weight: a,
        };

  // Clouds
  const hasCloud = H.some((h) => h.cloud);
  const clear = mean(H.map((h) => h.clear));
  const clearHours = H.filter((h) => h.cloud && h.clear > 0.7).length;
  const clouds: Factor = hasCloud
    ? {
        icon: 'clouds',
        tone: clear > 0.75 ? 'good' : clear > 0.4 ? 'ok' : 'bad',
        status: clear > 0.75 ? f.clear : clear > 0.4 ? f.partly : f.overcast,
        value: `${pct(clear)} %`,
        sub: f.cloudSub,
        text: f.cloudText(clearHours, H.length),
        weight: clear,
      }
    : { icon: 'clouds', tone: 'bad', status: f.noData, value: '—', sub: '', text: S.failed(S.weather), weight: clear };

  // Darkness: share of the night without twilight brightening the sky.
  const evening = SunCalc.getTimes(new Date(H[0]!.time.getTime() - 12 * HOUR), place.lat, place.lon);
  const morning = SunCalc.getTimes(H.at(-1)!.time, place.lat, place.lon);
  const darkText = isNaN(evening.night.getTime())
    ? isNaN(evening.sunset.getTime())
      ? f.darkAll
      : f.darkText(fmt.time(evening.nauticalDusk), fmt.time(morning.nauticalDawn))
    : f.darkText(fmt.time(evening.night), fmt.time(morning.nightEnd));
  const dark: Factor = {
    icon: 'dark',
    tone: sunNow < -15 ? 'good' : sunNow < -6 ? 'ok' : 'bad',
    status: sunNow < -15 ? f.darkS : f.twilightS,
    value: `${Math.round(sunNow)}°`.replace('-', '−'),
    sub: f.sunSub,
    text: darkText,
    weight: H.filter((h) => h.twilight < 0.5).length / H.length,
  };

  // Moon: how much it brightens the sky where the aurora will be.
  const maxMoon = Math.max(...H.map((h) => h.moon));
  const moon: Factor = {
    icon: 'moon',
    tone: maxMoon < 1 ? 'good' : maxMoon < 5 ? 'ok' : 'bad',
    status: maxMoon < 1 ? f.faint : f.bright,
    value: `${pct(moonNow)} %`,
    sub: f.moonSub,
    text: maxMoon > 0.05 ? f.moonText((1 + maxMoon).toFixed(maxMoon < 9 ? 1 : 0)) : f.moonDown,
    weight: mean(H.map((h) => 1 / (1 + h.moon))),
  };

  return [activity, clouds, dark, moon];
}

/* ---------- solar wind ---------- */

export interface Sparkline {
  /** SVG path in a 120 × 34 box, or '' when there is too little data. */
  path: string;
  /** y of the zero line, when requested. */
  zeroY: number | null;
}

export function sparkline(values: (number | null)[], zero = false): Sparkline {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 2) return { path: '', zeroY: null };
  const min = Math.min(...v, ...(zero ? [0] : []));
  const max = Math.max(...v, ...(zero ? [0] : []));
  const y = (x: number) => 31 - ((x - min) / (max - min || 1)) * 28;
  const step = 120 / (values.length - 1);
  let d = '';
  values.forEach((x, i) => {
    if (x === null) return;
    d += `${d ? 'L' : 'M'}${(i * step).toFixed(1)},${y(x).toFixed(1)}`;
  });
  return { path: d, zeroY: zero ? y(0) : null };
}

const lastValue = (xs: (number | null)[]) => {
  for (let i = xs.length - 1; i >= 0; i--) if (xs[i] !== null && xs[i] !== undefined) return xs[i]!;
  return null;
};

export interface WindStat {
  label: string;
  value: string;
  unit: string;
  color: string;
  spark: Sparkline;
  note: string;
  good: boolean;
}

export function windStats(S: Strings, wind: SolarWindSample[] | null): WindStat[] | null {
  if (!wind || !wind.length) return null;
  // 1-minute data is noisy; sparklines show 5-minute means, the big numbers the latest sample.
  const bucket = (xs: (number | null)[], n = 5) => {
    const out: (number | null)[] = [];
    for (let i = 0; i < xs.length; i += n) {
      const v = xs.slice(i, i + n).filter((x): x is number => x !== null);
      out.push(v.length ? mean(v) : null);
    }
    return out;
  };
  const raw = { bz: wind.map((w) => w.bz), sp: wind.map((w) => w.speed), de: wind.map((w) => w.density) };
  const b = lastValue(raw.bz);
  const s = lastValue(raw.sp);
  const d = lastValue(raw.de);
  const fmt1 = (x: number | null, digits = 1) => (x === null ? '—' : x.toFixed(digits).replace('-', '−'));
  return [
    {
      label: S.bz, value: fmt1(b), unit: 'nT', color: '#5cffb0', spark: sparkline(bucket(raw.bz), true),
      note: b !== null && b < -2 ? S.bzSouth : b !== null && b > 0 ? S.bzNorth : S.normal, good: b !== null && b < -2,
    },
    {
      label: S.speed, value: fmt1(s, 0), unit: 'km/s', color: '#39d0ff', spark: sparkline(bucket(raw.sp)),
      note: s !== null && s > 500 ? S.fast : s !== null && s < 350 ? S.slow : S.normal, good: s !== null && s > 500,
    },
    {
      label: S.density, value: fmt1(d), unit: 'p/cm³', color: '#8a9bb5', spark: sparkline(bucket(raw.de)),
      note: d !== null && d > 10 ? S.dense : S.normal, good: d !== null && d > 10,
    },
  ];
}

/* ---------- next nights ---------- */

export interface NightRow {
  name: string;
  date: string;
  maxKp: number;
  /** 0..100, bar width. */
  width: number;
}

export function nightRows(S: Strings, fmt: Fmt, kp: KpBlock[] | null, now: Date, tz: string): NightRow[] | null {
  if (!kp) return null;
  return nightlyOutlook(kp, now, tz).map((n: NightOutlook, i) => {
    const w = fmt.weekday(n.date);
    return { name: i === 0 ? S.tonightShort : w.name, date: w.date, maxKp: n.maxKp, width: Math.min(100, (n.maxKp / 9) * 100) };
  });
}
