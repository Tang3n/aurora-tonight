import { nightRows, type ViewModel } from '@aurora/core/view';
import type { KpBlock } from '@aurora/model/night';

export function Nights({ vm, kp, tz, loaded }: { vm: ViewModel; kp: KpBlock[] | null; tz: string; loaded: boolean }) {
  if (!loaded) return <div className="card" />;
  const { S, fmt, now } = vm;
  const rows = nightRows(S, fmt, kp, now, tz);
  return (
    <div className="card">
      <div className="row-head">
        <h2>{S.nextNights}</h2>
        <span className="hint">{S.maxKp}</span>
      </div>
      {rows ? (
        <div className="nights">
          {rows.map((n) => (
            <div className="night" key={n.date}>
              <div className="d">
                {n.name}
                <small>{n.date}</small>
              </div>
              <div className="kp">
                <i style={{ width: `${n.width}%` }} />
              </div>
              <div className="n">{n.maxKp.toFixed(1)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">{S.failed('Kp')}</p>
      )}
    </div>
  );
}
