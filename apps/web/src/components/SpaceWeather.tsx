import type { Strings } from '@aurora/core/i18n';
import { windStats } from '@aurora/core/view';
import type { SolarWindSample } from '@aurora/data/sources';

export function SpaceWeather({ S, wind, loaded }: { S: Strings; wind: SolarWindSample[] | null; loaded: boolean }) {
  if (!loaded) return <div className="card" />;
  const stats = windStats(S, wind);
  return (
    <div className="card">
      <div className="row-head">
        <h2>{S.space}</h2>
        <span className="live">
          <i className="dot" />
          {S.live}
        </span>
      </div>
      {stats ? (
        <div className="wind">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <div className="k">{s.label}</div>
              <div className="v">
                {s.value}
                <small> {s.unit}</small>
              </div>
              <svg viewBox="0 0 120 34" preserveAspectRatio="none">
                {s.spark.zeroY !== null ? (
                  <line x1="0" x2="120" y1={s.spark.zeroY} y2={s.spark.zeroY} stroke="rgba(255,255,255,.15)" strokeDasharray="2 3" />
                ) : null}
                {s.spark.path ? (
                  <path d={s.spark.path} fill="none" stroke={s.color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                ) : null}
              </svg>
              <div className={`note${s.good ? '' : ' n'}`}>{s.note}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">{S.failed('solar wind')}</p>
      )}
    </div>
  );
}
