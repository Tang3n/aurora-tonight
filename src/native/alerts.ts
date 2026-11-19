/**
 * Notification settings — Android app only.
 *
 * The web page never loads this: main.ts imports it dynamically when it runs inside the
 * Capacitor WebView. Settings live in localStorage (the UI's copy) and are pushed to the
 * background runner (src/background/runner.ts) with a "configure" event whenever they, the
 * place or the language change. The runner keeps its own copy in CapacitorKV because it runs
 * while the app — and this WebView — is closed.
 */
import { BackgroundRunner } from '@capacitor/background-runner';
import type { AlertConfig } from '../background/notify';
import { buildOffsetTable } from '../background/tz';
import type { RunStatus } from '../background/runner';
import type { Location } from '../data/sources';
import type { Lang } from '../i18n';
import type { Detector } from '../model/visibility';

const LABEL = 'io.github.tang3n.auroratonight.check';
const KEY = 'aurora.alerts';

interface Prefs {
  enabled: boolean;
  threshold: number;
  detector: Detector;
}
const DEFAULTS: Prefs = { enabled: false, threshold: 50, detector: 'eye' };

const LEVELS = [
  { value: 30, label: { en: 'Maybe', cs: 'Možná', no: 'Kanskje' } },
  { value: 50, label: { en: 'Good', cs: 'Dobré', no: 'Bra' } },
  { value: 70, label: { en: 'Great', cs: 'Výborné', no: 'Svært bra' } },
] as const;

const T = {
  en: {
    title: 'Notifications',
    enable: (p: string) => `Notify me about aurora in ${p}`,
    threshold: 'When the chance is at least',
    detector: 'Count',
    eye: 'Naked eye',
    camera: 'Phone camera',
    test: 'Send a test notification',
    testTitle: 'Aurora Tonight',
    testBody: 'Notifications work. You will hear from me when it is worth going out.',
    denied: 'Notifications are blocked. Allow them in Android settings → Apps → Aurora Tonight.',
    never: 'Not checked yet. Android runs the check about every 15 minutes, also when the app is closed.',
    last: (time: string, peak: number | undefined) => `Last check ${time}${peak !== undefined ? ` · tonight up to ${peak} %` : ''}`,
    failed: (time: string) => `Last check ${time} failed (no data). Will try again.`,
    battery: 'If nothing arrives, allow the app to run in the background (battery settings).',
  },
  cs: {
    title: 'Oznámení',
    enable: (p: string) => `Upozorni mě na polární záři v ${p}`,
    threshold: 'Když je šance aspoň',
    detector: 'Počítat pro',
    eye: 'Pouhé oko',
    camera: 'Fotoaparát mobilu',
    test: 'Poslat zkušební oznámení',
    testTitle: 'Aurora Tonight',
    testBody: 'Oznámení fungují. Ozvu se, až bude stát za to jít ven.',
    denied: 'Oznámení jsou zablokovaná. Povol je v Nastavení Androidu → Aplikace → Aurora Tonight.',
    never: 'Zatím nekontrolováno. Android spouští kontrolu zhruba každých 15 minut, i když je appka zavřená.',
    last: (time: string, peak: number | undefined) => `Poslední kontrola ${time}${peak !== undefined ? ` · dnes v noci až ${peak} %` : ''}`,
    failed: (time: string) => `Poslední kontrola ${time} selhala (chybí data). Zkusím to znovu.`,
    battery: 'Když nic nechodí, povol appce běh na pozadí (nastavení baterie).',
  },
  no: {
    title: 'Varsler',
    enable: (p: string) => `Varsle meg om nordlys i ${p}`,
    threshold: 'Når sjansen er minst',
    detector: 'Gjelder for',
    eye: 'Øyet',
    camera: 'Mobilkamera',
    test: 'Send et testvarsel',
    testTitle: 'Aurora Tonight',
    testBody: 'Varsler fungerer. Du hører fra meg når det er verdt å gå ut.',
    denied: 'Varsler er blokkert. Tillat dem i Android-innstillinger → Apper → Aurora Tonight.',
    never: 'Ikke sjekket ennå. Android sjekker omtrent hvert 15. minutt, også når appen er lukket.',
    last: (time: string, peak: number | undefined) => `Sist sjekket ${time}${peak !== undefined ? ` · i kveld opptil ${peak} %` : ''}`,
    failed: (time: string) => `Sjekken ${time} feilet (mangler data). Prøver igjen.`,
    battery: 'Kommer det ingenting, tillat appen å kjøre i bakgrunnen (batteriinnstillinger).',
  },
} satisfies Record<Lang, unknown>;

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>) };
  } catch {
    return { ...DEFAULTS };
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface AlertsHost {
  place(): Location;
  lang(): Lang;
}

export interface Alerts {
  /** Push current settings to the runner (call after a place or language change). */
  sync(): Promise<void>;
  /** Re-render the panel texts. */
  render(): void;
}

export function initAlerts(host: AlertsHost, wrap: HTMLElement, btn: HTMLElement, pop: HTMLElement): Alerts {
  let prefs = loadPrefs();
  let status: RunStatus | null = null;
  let message = '';
  wrap.hidden = false;

  async function sync() {
    const place = host.place();
    const cfg: AlertConfig = {
      ...prefs,
      place: { name: place.name, lat: place.lat, lon: place.lon },
      lang: host.lang(),
      // The runner has no Intl; give it this place's UTC offsets for the next year.
      offsets: buildOffsetTable(place.tz, new Date()),
    };
    try {
      await BackgroundRunner.dispatchEvent({ label: LABEL, event: 'configure', details: cfg as unknown as Record<string, unknown> });
    } catch (err) {
      console.warn('[aurora] configure runner failed', err);
    }
  }

  async function refreshStatus() {
    try {
      status = await BackgroundRunner.dispatchEvent<RunStatus>({ label: LABEL, event: 'status', details: {} });
    } catch {
      status = null;
    }
    render();
  }

  function statusText(): string {
    const S = T[host.lang()];
    if (!status?.at) return S.never;
    const time = new Date(status.at).toLocaleTimeString(host.lang() === 'no' ? 'nb' : host.lang(), { hour: '2-digit', minute: '2-digit' });
    return status.ok ? S.last(time, status.peak) : S.failed(time);
  }

  function render() {
    const lang = host.lang();
    const S = T[lang];
    btn.setAttribute('aria-label', S.title);
    btn.classList.toggle('on', prefs.enabled);
    pop.innerHTML = `
      <div class="alerts-head">${S.title}</div>
      <label class="switch"><input type="checkbox" id="alEnabled" ${prefs.enabled ? 'checked' : ''}><span>${esc(S.enable(host.place().name))}</span></label>
      <fieldset ${prefs.enabled ? '' : 'disabled'}>
        <div class="alerts-label">${S.threshold}</div>
        <div class="seg">${LEVELS.map((l) => `<button type="button" data-th="${l.value}" aria-pressed="${prefs.threshold === l.value}">${l.label[lang]}</button>`).join('')}</div>
        <div class="alerts-label">${S.detector}</div>
        <div class="seg">${(['eye', 'camera'] as const).map((d) => `<button type="button" data-det="${d}" aria-pressed="${prefs.detector === d}">${S[d]}</button>`).join('')}</div>
        <button type="button" class="geo" id="alTest">${S.test}</button>
      </fieldset>
      <p class="alerts-note">${esc(message || statusText())}</p>
      ${prefs.enabled ? `<p class="alerts-note faint">${S.battery}</p>` : ''}`;
  }

  async function update(p: Partial<Prefs>) {
    prefs = { ...prefs, ...p };
    savePrefs(prefs);
    message = '';
    render();
    await sync();
  }

  async function ensurePermission(): Promise<boolean> {
    try {
      const s = await BackgroundRunner.requestPermissions({ apis: ['notifications'] });
      return s.notifications === 'granted';
    } catch {
      return false;
    }
  }

  btn.addEventListener('click', () => {
    pop.hidden = !pop.hidden;
    btn.setAttribute('aria-expanded', String(!pop.hidden));
    if (!pop.hidden) void refreshStatus();
  });
  document.addEventListener('click', (e) => {
    // composedPath(), not target.closest(): a click inside the panel re-renders it, so by the time
    // this runs the clicked button is detached and closest() would wrongly say "outside".
    if (!pop.hidden && !e.composedPath().includes(wrap)) {
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  pop.addEventListener('change', async (e) => {
    const box = e.target as HTMLInputElement;
    if (box.id !== 'alEnabled') return;
    if (box.checked && !(await ensurePermission())) {
      box.checked = false;
      message = T[host.lang()].denied;
      render();
      return;
    }
    await update({ enabled: box.checked });
  });
  pop.addEventListener('click', async (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!el) return;
    if (el.dataset.th) await update({ threshold: Number(el.dataset.th) });
    else if (el.dataset.det) await update({ detector: el.dataset.det as Detector });
    else if (el.id === 'alTest') {
      if (!(await ensurePermission())) {
        message = T[host.lang()].denied;
        return render();
      }
      const S = T[host.lang()];
      await BackgroundRunner.dispatchEvent({ label: LABEL, event: 'test', details: { title: S.testTitle, body: S.testBody } });
    }
  });

  render();
  // Re-register the config on every launch: it refreshes the time-zone table (one year ahead).
  void sync();
  return { sync, render };
}
