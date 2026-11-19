import { factors, pct, type FactorIcon, type Tone, type ViewModel } from '@aurora/core/view';
import type { Location } from '@aurora/data/sources';
import type { ReactNode } from 'react';

const ICONS: Record<FactorIcon, ReactNode> = {
  activity: (
    <>
      <path d="M3 17c3-8 6-8 9 0s6 8 9 0" />
      <path d="M3 11c3-6 6-6 9 0s6 6 9 0" opacity=".5" />
    </>
  ),
  clouds: <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z" />,
  dark: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M4 20h16" />
      <path d="M12 2v3M4.9 4.9 7 7M19.1 4.9 17 7" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
};

const TONE_COLOR: Record<Tone, string> = { good: '#5cffb0', ok: '#ffc56b', bad: '#ff7a8a' };

export function Factors({ vm, loc, loaded }: { vm: ViewModel; loc: Location; loaded: boolean }) {
  if (!loaded) return <section className="factors section" />;
  const S = vm.S;
  return (
    <section className="factors section">
      {factors(vm, loc, vm.now).map((f) => (
        <div className="card factor" key={f.icon}>
          <div className="top">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke={TONE_COLOR[f.tone]} strokeWidth="2">
                {ICONS[f.icon]}
              </svg>
            </div>
            <span className={`status ${f.tone}`}>{f.status}</span>
          </div>
          <div className="v">
            {f.value}
            <small>{f.sub}</small>
          </div>
          <p>{f.text}</p>
          <div className={`w ${f.tone === 'good' ? '' : f.tone}`}>
            <i style={{ width: `${pct(f.weight)}%` }} />
          </div>
          <div className="wl">
            <span>{S.f.weight}</span>
            <span>{f.weight.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
