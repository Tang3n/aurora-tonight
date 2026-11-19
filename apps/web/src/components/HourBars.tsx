import { highlightWindow, inWindow, isNowHour, type ViewModel } from '@aurora/core/view';

/**
 * Tonight hour by hour as in the mock: one bar per hour with the camera score (it still shows the shape of a
 * weak night), coloured by the same thresholds as the headline. Used on the home and spot pages.
 */
export function HourBars({ vm, height = 84 }: { vm: ViewModel; height?: number }) {
  const hours = vm.tonight.hours;
  const best = highlightWindow(vm);
  if (!hours.length) return <p className="hint">{vm.S.sentence.noNight}</p>;
  return (
    <div className="hour-bars" style={{ height }}>
      {hours.map((h) => {
        const tone = h.camera >= 50 ? 'hi' : h.camera >= 30 ? 'mid' : inWindow(h, best) ? 'win' : 'lo';
        const now = isNowHour(h, vm.now);
        return (
          <div key={h.time.getTime()} className={`hb${now ? ' now' : ''}`} title={`${vm.fmt.time(h.time)} · ${vm.S.tt.eye} ${h.eye} · ${vm.S.tt.camera} ${h.camera}`}>
            <div className={`hb-bar ${tone}`} style={{ height: `${Math.max(5, h.camera)}%` }} />
            <span>{vm.fmt.hour(h.time)}</span>
          </div>
        );
      })}
    </div>
  );
}
