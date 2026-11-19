/**
 * Home, laid out as the web mock (design/app-mock, WebHome): tonight's verdict and the best spot nearby on the
 * left, the map of spots on the right, the best spots as cards below, and the reasons one level down.
 * "Where to go" is part of this page on the web (no separate tab), as the mock says.
 */
import type { ForecastData } from '@aurora/core/hooks';
import type { Lang } from '@aurora/core/i18n';
import { TRAVEL_LIMITS, useWhereToGo, within, worthTheDrive, type TravelLimit } from '@aurora/core/spots';
import { verdict, type ViewModel } from '@aurora/core/view';
import type { Location } from '@aurora/data/sources';
import { Suspense, lazy, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Factors } from '../components/Factors';
import { Timeline } from '../components/Timeline';
import { Nights } from '../components/Nights';
import { OvalCard } from '../components/OvalCard';
import { scoreTone } from '../components/score';
import { SpaceWeather } from '../components/SpaceWeather';
import { SpotCard } from '../components/SpotCard';
import { Trusted } from '../components/Trusted';

// MapLibre is large; the verdict shows first and the map follows.
const SpotMap = lazy(() => import('../components/SpotMap').then((m) => ({ default: m.SpotMap })));

const limitLabel = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);

interface Props {
  vm: ViewModel;
  data: ForecastData;
  loc: Location;
  now: Date;
}

export function HomePage({ vm, data, loc, now, lang }: Props & { lang: Lang }) {
  const S = vm.S;
  const go = useWhereToGo(import.meta.env.BASE_URL, loc, data, now, lang);
  const [limit, setLimit] = useState<TravelLimit>(60);
  const navigate = useNavigate();
  const shown = within(go.ranked, limit);
  const best = shown[0];
  const better = data.loaded && worthTheDrive(best, vm.headline) ? best : undefined;

  return (
    <main className="home">
      <section className="home-top">
        <div className="home-left">
          <VerdictCard vm={vm} loaded={data.loaded} place={loc.name} />
          {better ? (
            <Link to={`/spot/${better.spot.id}`} className="card better">
              <span className={`badge big ${scoreTone(better.score)}`}>{better.score}</span>
              <span className="better-text">
                <span className="eyebrow">{S.go.betterNearby}</span>
                <span className="better-name">{better.spot.name}</span>
                <span className="spot-meta">
                  {S.go.drive(better.minutes, Math.round(better.km))}
                  {better.window ? ` · ${S.go.window(vm.fmt.time(better.window.start), vm.fmt.time(better.window.end))}` : ''}
                </span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ) : null}
          <div className="notice" hidden={data.failed.length === 0}>
            {data.failed.length ? S.failed(data.failed.join(', ')) : ''}
          </div>
        </div>

        <div className="card map-card">
          <Suspense fallback={<div className="spot-map" />}>
            <SpotMap
              home={loc}
              homeScore={data.loaded ? vm.headline : null}
              spots={shown}
              limitMinutes={limit}
              selected={null}
              onSelect={(id) => navigate(`/spot/${id}`)}
              label={S.go.mapLabel}
            />
          </Suspense>
          <div className="chips map-chips" role="group" aria-label={S.go.within('')}>
            {TRAVEL_LIMITS.map((m) => (
              <button key={m} className="chip" aria-pressed={m === limit} onClick={() => setLimit(m)}>
                ≤ {limitLabel(m)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tonight hour by hour: eye (bars), phone camera (dashed), clouds (strip), with a tooltip per hour. */}
      <Timeline vm={vm} loc={loc} loaded={data.loaded} />

      <section className="section">
        <div className="row-head">
          <h2>{S.home.bestSpots(limitLabel(limit))}</h2>
          <span className="hint">
            {go.status === 'loading'
              ? S.go.loading
              : go.status === 'error'
                ? S.go.failed
                : go.noCoverage
                  ? S.go.noSpots
                  : best && !better && data.loaded
                    ? S.go.homeBest
                    : S.go.travelNote}
          </span>
        </div>
        <div className="spot-grid">
          {shown.slice(0, 8).map((r) => (
            <SpotCard key={r.spot.id} r={r} vm={vm} />
          ))}
        </div>
        {go.attribution ? <p className="fine">{S.go.attribution}</p> : null}
      </section>

      {data.loaded ? <Details vm={vm} data={data} loc={loc} now={now} /> : null}
    </main>
  );
}

/** The mock's verdict card: score, label, sentence and tonight's hours in one card. */
function VerdictCard({ vm, loaded, place }: { vm: ViewModel; loaded: boolean; place: string }) {
  const S = vm.S;
  if (!loaded) {
    return (
      <div className="card verdict-card" aria-live="polite">
        <div className="eyebrow">{S.home.tonightAt(place)}</div>
        <div className="vc-score t-lo">—</div>
        <p className="vc-sentence">{S.loading}</p>
      </div>
    );
  }
  const v = verdict(vm);
  const tone = scoreTone(vm.headline);
  return (
    <div className="card verdict-card" aria-live="polite">
      <div className="eyebrow">{S.home.tonightAt(place)}</div>
      <div className="vc-row">
        <div className={`vc-score t-${tone}`}>{vm.headline}</div>
        <div className="vc-label">
          <span className={`t-${tone}`}>{v.labelText}</span>
          <small>
            {S.tt.eye.toLowerCase()} {vm.headline} · {S.tt.camera.toLowerCase()} {vm.headlineCamera}
          </small>
        </div>
      </div>
      <Trusted as="p" className="vc-sentence" html={v.sentence} />
      <div className="look">
        <div>
          <div className="k">{S.look}</div>
          <div className="v">{S.lookValue(v.direction, v.elevation)}</div>
        </div>
        <div>
          <div className="k">{S.kpNeeded}</div>
          <div className="v">{vm.tonight.kpNeeded.toFixed(1)}</div>
        </div>
        <div>
          <div className="k">{S.magLat}</div>
          <div className="v">{Math.abs(vm.tonight.mlat).toFixed(1)}°</div>
        </div>
      </div>
    </div>
  );
}

/** "Why this score?": the reasons, one level below the answer. */
function Details({ vm, data, loc, now }: Props) {
  const S = vm.S;
  const v = verdict(vm);
  return (
    <section className="details">
      <h2 className="details-title">{S.why}</h2>
      <div className="card details-intro">
        <div className="meta">
          {v.sources.map((src) => (
            <span key={src.name}>
              <i className={`dot${src.ok ? '' : ' bad'}`} />
              {src.text}
            </span>
          ))}
        </div>
        <Trusted as="div" className="whybox" html={S.whyText} />
      </div>
      <Factors vm={vm} loc={loc} loaded />
      <section className="split section">
        <OvalCard S={S} grid={data.ovation} loc={loc} now={now} />
        <div className="stack">
          <SpaceWeather S={S} wind={data.wind} loaded />
          <Nights vm={vm} kp={data.kp} tz={loc.tz} loaded />
        </div>
      </section>
    </section>
  );
}
