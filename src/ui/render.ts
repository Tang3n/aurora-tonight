/**
 * View functions: state in, HTML out. No fetching and no global state here.
 * Every string coming from an API (place names) goes through esc().
 */
import SunCalc from 'suncalc';
import { LOCALE, type Lang, type Strings } from '../i18n';
import type { NightOutlook, Tonight } from '../model/night';
import { labelFor, type HourScore, type Window } from '../model/score';
import type { SolarWindSample } from '../data/sources';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => Math.round(x * 100);

export interface ViewModel {
  S: Strings;
  fmt: Fmt;
  now: Date;
  lat: number;
  tonight: Tonight;
  window: Window | null;
  headline: number;
  goNow: boolean;
  ovationTime: Date | null;
  cloudsUpdated: Date | null;
  kpOk: boolean;
}

/** Hero card with the verdict. */
export function verdictHtml(vm: ViewModel, whyOpen: boolean): string {
  const { S, fmt, tonight, window: win, headline, now } = vm;
  const label = labelFor(headline);
  const dir = vm.lat >= 0 ? S.north : S.south;
  const peakKp = Math.max(0, ...tonight.hours.map((h) => h.input.kp ?? 0));
  const high = peakKp - tonight.kpNeeded > 2;

  let sentence: string;
  if (!tonight.hours.length) sentence = S.sentence.noNight;
  else if (!win) {
    const sky = mean(tonight.hours.map((h) => h.factors.sky));
    sentence = sky < 0.35 ? S.sentence.clouds : S.sentence.quiet(tonight.kpNeeded.toFixed(1));
  } else sentence = `${S.sentence.window(fmt.time(win.start), fmt.time(win.end))} ${S.sentence.look(dir, high)}`;

  const dot = (ok: boolean) => `<i class="dot${ok ? '' : ' bad'}"></i>`;
  const meta = [
    vm.ovationTime
      ? `<span>${dot(true)}${S.dataAge(S.aurora, fmt.age(vm.ovationTime, now))}</span>`
      : `<span>${dot(false)}${S.unavailable(S.aurora)}</span>`,
    vm.cloudsUpdated
      ? `<span>${dot(true)}${S.dataAge(S.weather, fmt.age(vm.cloudsUpdated, now))}</span>`
      : `<span>${dot(false)}${S.unavailable(S.weather)}</span>`,
  ];

  return `
    <div class="eyebrow">${S.tonight} · ${fmt.day(now)}</div>
    <div class="verdict">
      <div class="score${headline < 30 ? ' dim' : ''}">${headline}</div>
      <div class="label c-${label}">${vm.goNow ? S.goNow : S.labels[label]}<small>${S.outOf100}</small></div>
    </div>
    <p class="sentence">${sentence}</p>
    <div class="scale" role="img" aria-label="${headline} / 100"><i style="left:${Math.max(1, Math.min(99, headline))}%"></i></div>
    <div class="scale-labels">${S.scale.map((s) => `<span>${s}</span>`).join('')}</div>
    <div class="meta">${meta.join('')}<button class="why" id="why" aria-expanded="${whyOpen}">${S.why}</button></div>
    <div class="whybox" ${whyOpen ? '' : 'hidden'}>${S.whyText}</div>
    <div class="look">
      <div><div class="k">${S.look}</div><div class="v">${S.lookValue(dir, high)}</div></div>
      <div><div class="k">${S.kpNeeded}</div><div class="v">${tonight.kpNeeded.toFixed(1)}</div></div>
      <div><div class="k">${S.magLat}</div><div class="v">${Math.abs(tonight.magLat).toFixed(1)}°</div></div>
    </div>`;
}

function barColor(v: number): string {
  if (v > 60) return 'linear-gradient(180deg,#b9ffdc,#5cffb0)';
  if (v > 35) return 'linear-gradient(180deg,#5cffb0,#39d0ff)';
  return 'linear-gradient(180deg,#39d0ff,#26507a)';
}

export function timelineHtml(vm: ViewModel, place: { lat: number; lon: number }): string {
  const { S, fmt, tonight, now } = vm;
  const hours = tonight.hours;
  let sub = '';
  if (hours.length) {
    const first = hours[0]!.time.getTime();
    const evening = SunCalc.getTimes(new Date(first - 12 * 3600_000), place.lat, place.lon);
    const morning = SunCalc.getTimes(hours.at(-1)!.time, place.lat, place.lon);
    const dark = isNaN(evening.night.getTime()) ? evening.nauticalDusk : evening.night;
    sub = isNaN(evening.sunset.getTime()) ? S.polarNight : S.sunTimes(fmt.time(evening.sunset), fmt.time(dark), fmt.time(morning.sunrise));
  }
  const cols = `style="grid-template-columns:repeat(${Math.max(1, hours.length)},1fr)"`;
  const best = vm.window;
  const bars = hours
    .map((h, i) => {
      const isNow = now >= h.time && now.getTime() < h.time.getTime() + 3600_000;
      const inBest = best && h.time >= best.start && h.time < best.end;
      return `<div class="hour${isNow ? ' now' : ''}${inBest ? ' best' : ''}"${isNow ? ` data-now="${S.now}"` : ''} data-i="${i}" tabindex="0" aria-label="${fmt.time(h.time)}: ${h.score}">
        <div class="bar" style="height:${Math.max(3, h.score)}%;background:${barColor(h.score)};opacity:${0.35 + (h.score / 100) * 0.65}"></div></div>`;
    })
    .join('');
  return `
    <div class="row-head"><h2>${S.hourByHour}</h2><span class="hint">${sub}</span></div>
    <div class="timeline" ${cols}>${bars || `<div class="empty-tl">${S.sentence.noNight}</div>`}</div>
    <div class="hours" ${cols}>${hours.map((h) => `<span>${fmt.hour(h.time)}</span>`).join('')}</div>
    <div class="clouds" ${cols}>${hours
      .map((h) => `<i style="opacity:${h.input.cloud ? 0.08 + (1 - h.factors.sky) * 0.7 : 0}"></i>`)
      .join('')}</div>
    <div class="tl-legend">
      <span><i style="background:linear-gradient(90deg,var(--aurora-2),var(--aurora))"></i>${S.legendChance}</span>
      <span><i style="background:#c9d6ea"></i>${S.legendCloud}</span>
    </div>
    <div class="tooltip" id="tip" role="tooltip"></div>`;
}

export function tooltipHtml(h: HourScore, S: Strings, fmt: Fmt): string {
  const i = h.input;
  const dark = h.factors.dark >= 0.99 ? S.tt.full : S.tt.twilight;
  const moon = i.moon.altitude > 0 ? `${S.tt.up}, ${pct(i.moon.illumination)} %` : S.tt.down;
  const cloud = i.cloud ? `${pct(1 - h.factors.sky)} %` : '—';
  return `<b>${fmt.time(h.time)} · ${h.score}</b><dl>
    <dt>${S.tt.aurora}</dt><dd>${i.kp?.toFixed(1) ?? '—'}</dd>
    <dt>${S.tt.clouds}</dt><dd>${cloud}</dd>
    <dt>${S.tt.dark}</dt><dd>${dark}</dd>
    <dt>${S.tt.moon}</dt><dd>${moon}</dd></dl>`;
}

const ICONS = {
  activity: '<path d="M3 17c3-8 6-8 9 0s6 8 9 0"/><path d="M3 11c3-6 6-6 9 0s6 6 9 0" opacity=".5"/>',
  clouds: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/>',
  dark: '<circle cx="12" cy="12" r="4"/><path d="M4 20h16"/><path d="M12 2v3M4.9 4.9 7 7M19.1 4.9 17 7"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
};

type Tone = 'good' | 'ok' | 'bad';
const TONE_COLOR: Record<Tone, string> = { good: '#5cffb0', ok: '#ffc56b', bad: '#ff7a8a' };

function factorCard(icon: keyof typeof ICONS, tone: Tone, status: string, value: string, sub: string, text: string, weight: number, S: Strings) {
  return `<div class="card factor">
    <div class="top"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="${TONE_COLOR[tone]}" stroke-width="2">${ICONS[icon]}</svg></div><span class="status ${tone}">${status}</span></div>
    <div class="v">${value}<small>${sub}</small></div>
    <p>${text}</p>
    <div class="w ${tone === 'good' ? '' : tone}"><i style="width:${pct(weight)}%"></i></div><div class="wl"><span>${S.f.weight}</span><span>${weight.toFixed(2)}</span></div>
  </div>`;
}

export function factorsHtml(vm: ViewModel, place: { lat: number; lon: number }, sunNow: number, moonNow: number): string {
  const { S, fmt, tonight } = vm;
  const H = tonight.hours;
  const f = S.f;
  if (!H.length) return '';

  // Activity
  let peak: HourScore | null = null;
  for (const h of H) if (h.input.kp !== null && (!peak || h.input.kp > (peak.input.kp ?? 0))) peak = h;
  const need = tonight.kpNeeded;
  const actW = Math.max(...H.map((h) => h.factors.activity));
  const activity = peak
    ? factorCard(
        'activity',
        peak.input.kp! >= need + 1 ? 'good' : peak.input.kp! >= need - 0.5 ? 'ok' : 'bad',
        peak.input.kp! >= need + 1 ? f.strong : peak.input.kp! >= need - 0.5 ? f.moderate : f.weak,
        `Kp ${peak.input.kp!.toFixed(1)}`,
        f.peakAt(fmt.time(peak.time)),
        f.kpText(need.toFixed(1), peak.input.kp! >= need),
        actW,
        S,
      )
    : factorCard('activity', 'bad', f.noData, '—', '', S.failed('Kp'), actW, S);

  // Clouds
  const hasCloud = H.some((h) => h.input.cloud);
  const sky = mean(H.map((h) => h.factors.sky));
  const clearHours = H.filter((h) => h.input.cloud && h.factors.sky > 0.7).length;
  const clouds = hasCloud
    ? factorCard(
        'clouds',
        sky > 0.75 ? 'good' : sky > 0.4 ? 'ok' : 'bad',
        sky > 0.75 ? f.clear : sky > 0.4 ? f.partly : f.overcast,
        `${pct(1 - sky)} %`,
        f.cloudSub,
        f.cloudText(clearHours, H.length),
        sky,
        S,
      )
    : factorCard('clouds', 'bad', f.noData, '—', '', S.failed(S.weather), sky, S);

  // Darkness
  const evening = SunCalc.getTimes(new Date(H[0]!.time.getTime() - 12 * 3600_000), place.lat, place.lon);
  const morning = SunCalc.getTimes(H.at(-1)!.time, place.lat, place.lon);
  const darkText = isNaN(evening.night.getTime())
    ? isNaN(evening.sunset.getTime())
      ? f.darkAll
      : f.darkText(fmt.time(evening.nauticalDusk), fmt.time(morning.nauticalDawn))
    : f.darkText(fmt.time(evening.night), fmt.time(morning.nightEnd));
  const darkW = mean(H.map((h) => h.factors.dark));
  const dark = factorCard(
    'dark',
    sunNow < -15 ? 'good' : sunNow < -6 ? 'ok' : 'bad',
    sunNow < -15 ? f.darkS : f.twilightS,
    `${Math.round(sunNow)}°`.replace('-', '−'),
    f.sunSub,
    darkText,
    darkW,
    S,
  );

  // Moon
  const moonW = mean(H.map((h) => h.factors.moon));
  const upShare = H.filter((h) => h.input.moon.altitude > 0).length / H.length;
  const moon = factorCard(
    'moon',
    moonW > 0.9 ? 'good' : 'ok',
    moonW > 0.9 ? f.faint : f.bright,
    `${pct(moonNow)} %`,
    f.moonSub,
    upShare > 0 ? f.moonUp(pct(upShare)) : f.moonDown,
    moonW,
    S,
  );

  return activity + clouds + dark + moon;
}

function spark(values: (number | null)[], color: string, zero = false): string {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 2) return '';
  const min = Math.min(...v, ...(zero ? [0] : []));
  const max = Math.max(...v, ...(zero ? [0] : []));
  const y = (x: number) => 31 - ((x - min) / (max - min || 1)) * 28;
  const step = 120 / (values.length - 1);
  let d = '';
  values.forEach((x, i) => {
    if (x === null) return;
    d += `${d ? 'L' : 'M'}${(i * step).toFixed(1)},${y(x).toFixed(1)}`;
  });
  const zl = zero ? `<line x1="0" x2="120" y1="${y(0)}" y2="${y(0)}" stroke="rgba(255,255,255,.15)" stroke-dasharray="2 3"/>` : '';
  return `${zl}<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
}

const lastValue = (xs: (number | null)[]) => {
  for (let i = xs.length - 1; i >= 0; i--) if (xs[i] !== null && xs[i] !== undefined) return xs[i]!;
  return null;
};

export function spaceHtml(S: Strings, wind: SolarWindSample[] | null): string {
  const head = `<div class="row-head"><h2>${S.space}</h2><span class="live"><i class="dot"></i>${S.live}</span></div>`;
  if (!wind || !wind.length) return `${head}<p class="hint">${S.failed('solar wind')}</p>`;
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
  const bz = bucket(raw.bz);
  const sp = bucket(raw.sp);
  const de = bucket(raw.de);
  const b = lastValue(raw.bz);
  const s = lastValue(raw.sp);
  const d = lastValue(raw.de);
  const fmt1 = (x: number | null, digits = 1) => (x === null ? '—' : x.toFixed(digits).replace('-', '−'));
  const stat = (k: string, v: string, unit: string, svg: string, note: string, good: boolean) =>
    `<div class="stat"><div class="k">${k}</div><div class="v">${v}<small> ${unit}</small></div><svg viewBox="0 0 120 34" preserveAspectRatio="none">${svg}</svg><div class="note${good ? '' : ' n'}">${note}</div></div>`;
  return `${head}<div class="wind">
    ${stat(S.bz, fmt1(b), 'nT', spark(bz, '#5cffb0', true), b !== null && b < -2 ? S.bzSouth : b !== null && b > 0 ? S.bzNorth : S.normal, b !== null && b < -2)}
    ${stat(S.speed, fmt1(s, 0), 'km/s', spark(sp, '#39d0ff'), s !== null && s > 500 ? S.fast : s !== null && s < 350 ? S.slow : S.normal, s !== null && s > 500)}
    ${stat(S.density, fmt1(d), 'p/cm³', spark(de, '#8a9bb5'), d !== null && d > 10 ? S.dense : S.normal, d !== null && d > 10)}
  </div>`;
}

export function nightsHtml(S: Strings, fmt: Fmt, nights: NightOutlook[] | null): string {
  const head = `<div class="row-head"><h2>${S.nextNights}</h2><span class="hint">${S.maxKp}</span></div>`;
  if (!nights) return `${head}<p class="hint">${S.failed('Kp')}</p>`;
  return `${head}<div class="nights">${nights
    .map(
      (n, i) => {
        const w = fmt.weekday(n.date);
        return `<div class="night"><div class="d">${i === 0 ? S.tonightShort : w.name}<small>${w.date}</small></div>
      <div class="kp"><i style="width:${Math.min(100, (n.maxKp / 9) * 100)}%"></i></div><div class="n">${n.maxKp.toFixed(1)}</div></div>`;
      },
    )
    .join('')}</div>`;
}

export function footerHtml(S: Strings): string {
  return `<span>${S.sources}: <a href="https://www.swpc.noaa.gov/">NOAA SWPC</a> · <a href="https://api.met.no/">MET Norway</a> · <a href="https://open-meteo.com/">Open-Meteo</a></span><span>${S.disclaimer}</span>`;
}
