import type { ForecastData } from '@aurora/core/hooks';
import { STRINGS, type Lang } from '@aurora/core/i18n';
import { TRAVEL_LIMITS, useWhereToGo, within, worthTheDrive, type RankedSpot, type TravelLimit } from '@aurora/core/spots';
import type { ViewModel } from '@aurora/core/view';
import type { Location } from '@aurora/data/sources';
import { useState } from 'react';
import { SpotMap } from '../components/SpotMap';
import { scoreTone } from '../components/score';

interface Props {
  lang: Lang;
  vm: ViewModel;
  data: ForecastData;
  loc: Location;
  now: Date;
}

const limitLabel = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);

export default function GoPage({ lang, vm, data, loc, now }: Props) {
  const S = STRINGS[lang];
  const [limit, setLimit] = useState<TravelLimit>(60);
  const [selected, setSelected] = useState<string | null>(null);
  const go = useWhereToGo(import.meta.env.BASE_URL, loc, data, now, lang);
  const shown = within(go.ranked, limit);
  const homeScore = data.loaded ? vm.headline : null;
  const best = shown[0];

  return (
    <main className="go">
      <div className="go-head">
        <div>
          <h1>{S.go.title}</h1>
          <p className="hint">{S.go.lead}</p>
        </div>
        {homeScore !== null ? <span className={`home-chip ${scoreTone(homeScore)}`}>{S.go.home(homeScore)}</span> : null}
      </div>

      <div className="chips" role="group" aria-label={S.go.within('')}>
        {TRAVEL_LIMITS.map((m) => (
          <button key={m} className="chip" aria-pressed={m === limit} onClick={() => setLimit(m)}>
            ≤ {limitLabel(m)}
          </button>
        ))}
      </div>

      <div className="go-body">
        <div className="card go-map">
          <SpotMap
            home={loc}
            homeScore={homeScore}
            spots={shown}
            limitMinutes={limit}
            selected={selected}
            onSelect={setSelected}
            label={S.go.mapLabel}
          />
        </div>

        <section className="go-list" aria-live="polite">
          <div className="row-head">
            <h2>{S.go.within(limitLabel(limit))}</h2>
          </div>
          {go.status === 'loading' ? <p className="hint">{S.go.loading}</p> : null}
          {go.status === 'error' ? <p className="hint">{S.go.failed}</p> : null}
          {go.noCoverage ? <p className="hint">{S.go.noSpots}</p> : null}
          {go.status === 'ready' && !go.noCoverage && homeScore !== null && best && !worthTheDrive(best, homeScore) ? (
            <p className="hint">{S.go.homeBest}</p>
          ) : null}
          <ol className="spot-list">
            {shown.slice(0, 12).map((r) => (
              <SpotRow key={r.spot.id} r={r} S={S} vm={vm} selected={r.spot.id === selected} onSelect={setSelected} />
            ))}
          </ol>
          <p className="fine">{S.go.travelNote}</p>
          {go.attribution ? <p className="fine">{S.go.attribution}</p> : null}
        </section>
      </div>
    </main>
  );
}

function SpotRow({
  r,
  S,
  vm,
  selected,
  onSelect,
}: {
  r: RankedSpot;
  S: (typeof STRINGS)[Lang];
  vm: ViewModel;
  selected: boolean;
  onSelect(id: string): void;
}) {
  const w = r.window ?? r.cameraWindow;
  const meta = [
    S.go.drive(r.minutes, Math.round(r.km)),
    w ? S.go.window(vm.fmt.time(w.start), vm.fmt.time(w.end)) : null,
    !r.window && r.cameraWindow ? S.go.cameraOnly : null,
    r.spot.facesNorth ? S.go.northView : null,
  ].filter(Boolean);
  return (
    <li>
      <button className={`card spot${selected ? ' selected' : ''}`} onClick={() => onSelect(r.spot.id)} aria-pressed={selected}>
        <span className={`badge ${scoreTone(r.score)}`}>{r.score}</span>
        <span className="spot-text">
          <span className="spot-name">{r.spot.name}</span>
          <span className="spot-meta">{meta.join(' · ')}</span>
        </span>
        <span className="spot-cam" title={S.tt.camera}>
          {r.camera}
        </span>
      </button>
    </li>
  );
}
