import { highlightWindow, inWindow, isNowHour, sunTimesLine, tooltipRows, type ViewModel } from '@aurora/core/view';
import type { Location } from '@aurora/data/sources';
import { useRef, useState } from 'react';

function barColor(v: number): string {
  if (v > 60) return 'linear-gradient(180deg,#b9ffdc,#5cffb0)';
  if (v > 35) return 'linear-gradient(180deg,#5cffb0,#39d0ff)';
  return 'linear-gradient(180deg,#39d0ff,#26507a)';
}

interface Tip {
  i: number;
  left: number;
  top: number;
}

export function Timeline({ vm, loc, loaded }: { vm: ViewModel; loc: Location; loaded: boolean }) {
  const card = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  if (!loaded) return <section className="card section" id="timeline" ref={card} />;

  const { S, fmt, tonight, now } = vm;
  const hours = tonight.hours;
  const best = highlightWindow(vm);
  const cols = { gridTemplateColumns: `repeat(${Math.max(1, hours.length)},1fr)` };

  // Hover on desktop, focus/tap on touch and keyboard. The tooltip sits just above the bar.
  const show = (i: number, el: HTMLElement) => {
    const c = card.current?.getBoundingClientRect();
    if (!c) return;
    const r = el.getBoundingClientRect();
    const barTop = el.querySelector('.bar')?.getBoundingClientRect().top ?? r.top;
    setTip({ i, left: Math.min(c.width - 190, Math.max(8, r.left - c.left - 70)), top: barTop - c.top - 8 });
  };
  const tipHour = tip ? hours[tip.i] : undefined;
  const tipData = tipHour ? tooltipRows(tipHour, S) : null;

  return (
    <section className="card section" id="timeline" ref={card} onMouseLeave={() => setTip(null)}>
      <div className="row-head">
        <h2>{S.hourByHour}</h2>
        <span className="hint">{sunTimesLine(vm, loc)}</span>
      </div>
      <div className="timeline" style={cols}>
        {hours.length ? (
          hours.map((h, i) => {
            const isNow = isNowHour(h, now);
            return (
              <div
                key={h.time.getTime()}
                className={`hour${isNow ? ' now' : ''}${inWindow(h, best) ? ' best' : ''}`}
                data-now={isNow ? S.now : undefined}
                tabIndex={0}
                aria-label={`${fmt.time(h.time)}: ${h.eye} / ${h.camera}`}
                onMouseOver={(e) => show(i, e.currentTarget)}
                onFocus={(e) => show(i, e.currentTarget)}
                onBlur={() => setTip(null)}
              >
                <div className="bar cam" style={{ height: `${Math.max(3, h.camera)}%` }} />
                <div
                  className="bar"
                  style={{ height: `${Math.max(3, h.eye)}%`, background: barColor(h.eye), opacity: 0.35 + (h.eye / 100) * 0.65 }}
                />
              </div>
            );
          })
        ) : (
          <div className="empty-tl">{S.sentence.noNight}</div>
        )}
      </div>
      <div className="hours" style={cols}>
        {hours.map((h) => (
          <span key={h.time.getTime()}>{fmt.hour(h.time)}</span>
        ))}
      </div>
      <div className="clouds" style={cols}>
        {hours.map((h) => (
          <i key={h.time.getTime()} style={{ opacity: h.cloud ? 0.08 + (1 - h.clear) * 0.7 : 0 }} />
        ))}
      </div>
      <div className="tl-legend">
        <span>
          <i style={{ background: 'linear-gradient(90deg,var(--aurora-2),var(--aurora))' }} />
          {S.legendEye}
        </span>
        <span>
          <i className="cam-swatch" />
          {S.legendCamera}
        </span>
        <span>
          <i style={{ background: '#c9d6ea' }} />
          {S.legendCloud}
        </span>
      </div>
      <div className={`tooltip${tip ? ' show' : ''}`} role="tooltip" style={tip ? { left: tip.left, top: tip.top } : undefined}>
        {tipHour && tipData ? (
          <>
            <b>
              {fmt.time(tipHour.time)}
              {tipData.live ? ` · ${S.tt.live}` : ''}
            </b>
            <dl>
              {tipData.rows.map((r) => (
                <Row key={r.key} label={S.tt[r.key]} value={r.value} />
              ))}
            </dl>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
