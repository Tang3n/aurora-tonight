/**
 * Refit the brightness parameters on the camera data without breaking the mid-latitude calibration.
 *
 * Free:   B2 (arc brightness at Kp 2, kR), γ (brightness ∝ hemispheric power^γ),
 *         T_label (sensitivity, in kR, that the keogram "structured aurora" label corresponds to —
 *         unknown, somewhere between a phone camera and the eye).
 * Data:   Kilpisjärvi hours with ERA5 cloud < 50 % (clear enough that the label mostly reflects aurora).
 * Hard constraint: the 50 % naked-eye line at magnetic midnight must stay within 1° of NOAA's
 *         Kp→latitude table (64 / 62 / 60.4 / 58.3 / 56.2° for Kp 1–5).
 * Overfitting check: fit on Nov–Jan, report on Feb–Mar.
 *
 *   npx vite build --ssr validation/fit.ts --outDir validation/dist && node validation/dist/fit.js
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARAMS, expectedVisibility, skyBackground, visibility } from '../packages/model/src/visibility';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const MLAT = 66.56;
const NOAA: [number, number][] = [[1, 64], [2, 62], [3, 60.4], [4, 58.3], [5, 56.2]];

interface Hour { month: string; y: number; kp: number; mlt: number; bg: number }
const lines = readFileSync(join(DATA, 'hindcast.csv'), 'utf8').trim().split('\n');
const h = lines[0]!.split(',');
const c = (n: string) => h.indexOf(n);
const hours: Hour[] = [];
for (const l of lines.slice(1)) {
  const f = l.split(',');
  const s = Number(f[c('structure')]);
  if (f[c('moon_in_slice')] === '1' || (s >= 15 && s < 30) || Number(f[c('cloud_total')]) >= 0.5) continue;
  hours.push({
    month: f[c('time')]!.slice(0, 7),
    y: s >= 30 ? 1 : 0,
    kp: Number(f[c('kp')]),
    mlt: Number(f[c('mlt')]),
    bg: skyBackground(Number(f[c('sun_alt')]), Number(f[c('moon_ratio')])),
  });
}
const train = hours.filter((x) => x.month <= '2026-01');
const test = hours.filter((x) => x.month >= '2026-02');

function eyeLine(kp: number): number {
  // latitude where the naked-eye chance at magnetic midnight, dark clear sky, crosses 50 %
  let lo = 40, hi = 75;
  for (let i = 0; i < 25; i++) {
    const m = (lo + hi) / 2;
    if (visibility(m, 0, kp, PARAMS.thresholdEye, 1) >= 0.5) hi = m; else lo = m;
  }
  return (lo + hi) / 2;
}
const brier = (set: Hour[], thr: number) =>
  set.reduce((s, x) => s + (expectedVisibility(MLAT, x.mlt, x.kp, 'observed', thr, x.bg) - x.y) ** 2, 0) / set.length;

const base = { B2: PARAMS.B2, gamma: PARAMS.gamma, sigmaLogB: PARAMS.sigmaLogB, sigmaBoundary: PARAMS.sigmaBoundary };
const results: { B2: number; gamma: number; sLogB: number; sB: number; T: number; noaa: number; train: number; test: number }[] = [];
for (const B2 of [2, 2.5, 3, 4]) {
  for (const gamma of [0.4, 0.5, 0.75, 1]) {
    for (const sLogB of [0.2, 0.3, 0.4, 0.5]) {
      for (const sB of [1, 1.5, 2]) {
        PARAMS.B2 = B2;
        PARAMS.gamma = gamma;
        PARAMS.sigmaLogB = sLogB;
        PARAMS.sigmaBoundary = sB;
        const noaa = Math.max(...NOAA.map(([kp, lat]) => Math.abs(eyeLine(kp) - lat)));
        if (noaa > 1.0) continue;
        for (const T of [0.1, 0.2, 0.3, 0.5, 0.7, 1.0]) {
          results.push({ B2, gamma, sLogB, sB, T, noaa, train: brier(train, T), test: brier(test, T) });
        }
      }
    }
  }
}
results.sort((a, b) => a.train - b.train);
Object.assign(PARAMS, base);
const current = [0.1, 0.2, 0.3, 0.5, 0.7, 1.0, 1.5]
  .map((T) => ({ T, train: brier(train, T), test: brier(test, T) }))
  .sort((a, b) => a.train - b.train)[0]!;
const clim = (set: Hour[], ref: Hour[]) => {
  const p = ref.reduce((s, x) => s + x.y, 0) / ref.length;
  return set.reduce((s, x) => s + (p - x.y) ** 2, 0) / set.length;
};

console.log(`hours: train ${train.length} (Nov–Jan), test ${test.length} (Feb–Mar)`);
console.log(`climatology Brier: train ${clim(train, train).toFixed(3)}, test ${clim(test, train).toFixed(3)}`);
console.log(`current  B2=${base.B2} γ=${base.gamma}  best T=${current.T}: train ${current.train.toFixed(3)}  test ${current.test.toFixed(3)}`);
console.log('best fits (NOAA constraint ≤ 1°):');
console.log(`combinations passing the NOAA constraint: ${results.length / 6}`);
for (const r of results.slice(0, 10))
  console.log(`  B2=${r.B2} γ=${r.gamma} σlogB=${r.sLogB} σbound=${r.sB} T=${r.T}  NOAA max dev ${r.noaa.toFixed(2)}°  train ${r.train.toFixed(3)}  test ${r.test.toFixed(3)}`);
