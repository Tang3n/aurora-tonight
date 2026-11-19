/**
 * Android background runner: Capacitor's BackgroundRunner evaluates this file (built to
 * dist/runners/aurora.js) in a bare QuickJS context every ~15 minutes via WorkManager, also
 * while the app is closed. Each event gets a fresh context, so all state lives in CapacitorKV.
 *
 * Events:
 *   check      — periodic (capacitor.config.ts): fetch, score, maybe notify
 *   configure  — from the app: save the alert settings (place, threshold, language, tz table)
 *   status     — from the app: last run result, for the settings panel
 *   test       — from the app: show a sample notification right away
 */
import './shims';
import { fetchClouds, fetchKp, fetchOvation, setRequestHeaders } from '../data/sources';
import { buildTonight } from '../model/night';
import type { OvationGrid } from '../model/ovation';
import { decideAlerts, type Alert, type AlertConfig, type AlertState } from './notify';

/* ---------- runner globals (provided by @capacitor/background-runner) ---------- */

type Resolve = (value?: unknown) => void;
type Reject = (err?: unknown) => void;
interface RunnerNotification {
  id: number;
  title: string;
  body: string;
  smallIcon?: string;
  autoCancel?: boolean;
}
declare const CapacitorKV: {
  set(key: string, value: string): void;
  get(key: string): { value: string } | null | undefined;
  remove(key: string): void;
};
declare const CapacitorNotifications: { schedule(n: RunnerNotification[]): void };
declare function addEventListener(
  event: string,
  handler: (resolve: Resolve, reject: Reject, args: unknown) => void | Promise<void>,
): void;

/* ---------- storage ---------- */

export const KEYS = { config: 'alerts.config', state: 'alerts.state', status: 'alerts.status' } as const;

function read<T>(key: string): T | null {
  try {
    const v = CapacitorKV.get(key)?.value;
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
const write = (key: string, value: unknown) => CapacitorKV.set(key, JSON.stringify(value));

export interface RunStatus {
  /** ISO time of the last periodic check. */
  at: string;
  ok: boolean;
  error?: string;
  /** Peak score of the night for the configured detector, if computed. */
  peak?: number;
  sent?: Alert['kind'][];
}

/* ---------- notifications ---------- */

// Fixed id per kind: a newer alert of the same kind replaces the old one in the shade.
const NOTIFICATION_ID: Record<Alert['kind'], number> = { now: 1, tonight: 2 };

function show(alerts: Alert[]) {
  if (!alerts.length) return;
  // No scheduleAt: the plugin parses it in the phone's zone despite the 'Z'; omitted means "now".
  CapacitorNotifications.schedule(
    alerts.map((a) => ({ id: NOTIFICATION_ID[a.kind], title: a.title, body: a.body, smallIcon: 'ic_stat_aurora', autoCancel: true })),
  );
}

/* ---------- events ---------- */

// MET Norway requires an identifying User-Agent from non-browser clients.
setRequestHeaders({ 'User-Agent': 'AuroraTonight-Android/0.2 github.com/Tang3n/aurora-tonight' });

async function check(): Promise<RunStatus> {
  const cfg = read<AlertConfig>(KEYS.config);
  const at = new Date().toISOString();
  if (!cfg?.enabled) return { at, ok: true };

  const [kp, clouds] = await Promise.all([fetchKp().catch(() => null), fetchClouds(cfg.place.lat, cfg.place.lon)]);
  // OVATION (~1 MB) only matters for the next hour or two; a failure just drops the nowcast.
  let ovation: OvationGrid | null = null;
  try {
    ovation = await fetchOvation();
  } catch {
    /* Kp-only */
  }

  const now = new Date();
  const tonight = buildTonight(now, cfg.place, { kp, clouds: clouds.points, ovation });
  const { alerts, state } = decideAlerts(now, tonight.hours, tonight.mlat, cfg, read<AlertState>(KEYS.state));
  show(alerts);
  if (state) write(KEYS.state, state);
  const peak = Math.max(0, ...tonight.hours.map((h) => h[cfg.detector]));
  return { at, ok: true, peak, sent: alerts.map((a) => a.kind), ...(kp ? {} : { error: 'Kp unavailable' }) };
}

addEventListener('check', async (resolve, reject) => {
  try {
    const status = await check();
    write(KEYS.status, status);
    resolve(status);
  } catch (err) {
    write(KEYS.status, { at: new Date().toISOString(), ok: false, error: String(err) } satisfies RunStatus);
    reject(String(err));
  }
});

addEventListener('configure', (resolve, _reject, args) => {
  const cfg = args as AlertConfig;
  const prev = read<AlertConfig>(KEYS.config);
  write(KEYS.config, cfg);
  // A new place is a new question: forget what was already announced.
  if (!prev || prev.place.lat !== cfg.place.lat || prev.place.lon !== cfg.place.lon) CapacitorKV.remove(KEYS.state);
  resolve();
});

addEventListener('status', (resolve) => {
  resolve(read<RunStatus>(KEYS.status) ?? {});
});

addEventListener('test', (resolve, _reject, args) => {
  const { title, body } = args as { title: string; body: string };
  show([{ kind: 'now', title, body }]);
  resolve();
});
