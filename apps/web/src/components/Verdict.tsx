import { verdict, type ViewModel } from '@aurora/core/view';
import { useState } from 'react';
import { Trusted } from './Trusted';

export function Verdict({ vm, loaded }: { vm: ViewModel; loaded: boolean }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const { S, fmt, tonight, headline, now } = vm;

  if (!loaded) {
    return (
      <div className="card" aria-live="polite">
        <div className="eyebrow">{S.tonight}</div>
        <div className="verdict">
          <div className="score dim">—</div>
        </div>
        <p className="sentence">{S.loading}</p>
      </div>
    );
  }

  const v = verdict(vm);
  return (
    <div className="card" aria-live="polite">
      <div className="eyebrow">
        {S.tonight} · {fmt.day(now)}
      </div>
      <div className="verdict">
        <div className={`score${v.dim ? ' dim' : ''}`}>{headline}</div>
        <div className={`label c-${v.label}`}>
          {v.labelText}
          <small>{S.eyeChance}</small>
          <small className="cam">{S.camera(vm.headlineCamera)}</small>
        </div>
      </div>
      <Trusted as="p" className="sentence" html={v.sentence} />
      <div className="scale" role="img" aria-label={`${headline} / 100`}>
        <i style={{ left: `${Math.max(1, Math.min(99, headline))}%` }} />
      </div>
      <div className="scale-labels">
        {S.scale.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className="meta">
        {v.sources.map((src) => (
          <span key={src.name}>
            <i className={`dot${src.ok ? '' : ' bad'}`} />
            {src.text}
          </span>
        ))}
        <button className="why" aria-expanded={whyOpen} onClick={() => setWhyOpen((o) => !o)}>
          {S.why}
        </button>
      </div>
      <Trusted as="div" className="whybox" hidden={!whyOpen} html={S.whyText} />
      <div className="look">
        <div>
          <div className="k">{S.look}</div>
          <div className="v">{S.lookValue(v.direction, v.elevation)}</div>
        </div>
        <div>
          <div className="k">{S.kpNeeded}</div>
          <div className="v">{tonight.kpNeeded.toFixed(1)}</div>
        </div>
        <div>
          <div className="k">{S.magLat}</div>
          <div className="v">{Math.abs(tonight.mlat).toFixed(1)}°</div>
        </div>
      </div>
    </div>
  );
}
