import type { RankedSpot } from '@aurora/core/spots';
import type { ViewModel } from '@aurora/core/view';
import { Link } from 'react-router';
import { scoreTone } from './score';

/** Card in the "best spots" grid (mock WebHome): decorative sky header, score badge, name, travel and window. */
export function SpotCard({ r, vm }: { r: RankedSpot; vm: ViewModel }) {
  const S = vm.S;
  const w = r.window ?? r.cameraWindow;
  const meta = [`≈ ${r.minutes} min`, w ? S.go.window(vm.fmt.time(w.start), vm.fmt.time(w.end)) : null, !r.window && r.cameraWindow ? S.go.cameraOnly : null]
    .filter(Boolean)
    .join(' · ');
  const tone = scoreTone(r.score);
  return (
    <Link to={`/spot/${r.spot.id}`} className="card spot-card">
      <div className={`spot-sky ${tone}`} aria-hidden="true" />
      <div className="spot-card-body">
        <span className={`badge ${tone}`}>{r.score}</span>
        <span className="spot-text">
          <span className="spot-name">{r.spot.name}</span>
          <span className="spot-meta">{meta}</span>
        </span>
      </div>
    </Link>
  );
}
