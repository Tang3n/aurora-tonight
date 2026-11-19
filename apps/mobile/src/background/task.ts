/**
 * Device-side alerts (phase 2). Android's WorkManager runs this roughly every 15 minutes when battery
 * and network allow; the app does not need to be open. The decision itself is decideAlert in
 * packages/core (unit-tested); this file only fetches, computes and notifies.
 *
 * OVATION (the 1 MB nowcast grid) is skipped here to save mobile data: it matters only for the next
 * hour, and the Kp-based forecast decides whether tonight is worth an alert.
 */
import { decideAlert, type AlertDecision } from '@aurora/core/alerts';
import { STRINGS } from '@aurora/core/i18n';
import { buildViewModel, makeFmt } from '@aurora/core/view';
import { fetchClouds, fetchKp } from '@aurora/data/sources';
import { buildTonight } from '@aurora/model/night';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { readAlertPrefs, readLang, readLocation, writeLastCheck, writeLastNight } from '../prefs';

export const ALERT_TASK = 'aurora-alert-check';
export const CHANNEL_ID = 'aurora-tonight';

TaskManager.defineTask(ALERT_TASK, async () => {
  try {
    await runAlertCheck();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('[aurora] background check failed', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Aurora Tonight',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function notify(title: string, body: string) {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}

/** One check: fetch, score home tonight, decide, notify. Returns the decision for the debug screen. */
export async function runAlertCheck(now = new Date(), opts: { dryRun?: boolean } = {}): Promise<AlertDecision> {
  const prefs = readAlertPrefs();
  const loc = readLocation();
  const lang = readLang();
  const [kp, clouds] = await Promise.all([fetchKp(), fetchClouds(loc.lat, loc.lon)]);
  const tonight = buildTonight(now, loc, { kp, clouds: clouds.points, ovation: null });
  const vm = buildViewModel({
    S: STRINGS[lang],
    fmt: makeFmt(lang, loc.tz),
    now,
    lat: loc.lat,
    tonight,
    ovationTime: null,
    cloudsUpdated: clouds.updated,
    kpOk: true,
  });
  const d = decideAlert(vm, loc.tz, opts.dryRun ? { ...prefs, enabled: true, lastNight: null } : prefs);
  if (!opts.dryRun) {
    if (d.notify) {
      await notify(d.title, d.body);
      writeLastNight(d.night);
    }
    writeLastCheck({ at: now.toISOString(), reason: d.reason, score: vm.headline });
  }
  return d;
}

export async function setAlertTaskRegistered(on: boolean) {
  const registered = await TaskManager.isTaskRegisteredAsync(ALERT_TASK);
  if (on && !registered) await BackgroundTask.registerTaskAsync(ALERT_TASK, { minimumInterval: 15 });
  if (!on && registered) await BackgroundTask.unregisterTaskAsync(ALERT_TASK);
}
