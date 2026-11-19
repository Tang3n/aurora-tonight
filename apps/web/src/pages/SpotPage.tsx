/**
 * A spot's own page, as the web mock (WebSpot): tonight at that viewpoint hour by hour, the score against home,
 * navigation and a shareable link. Facts are only what OSM has (elevation, mapped view direction, position);
 * nothing is invented.
 */
import type { ForecastData } from '@aurora/core/hooks';
import type { Lang } from '@aurora/core/i18n';
import { useSpot, useSpotForecast } from '@aurora/core/spots';
import { sunTimesLine, verdict, type ViewModel } from '@aurora/core/view';
import type { Location } from '@aurora/data/sources';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { HourBars } from '../components/HourBars';
import { scoreTone } from '../components/score';
import { Trusted } from '../components/Trusted';

interface Props {
  lang: Lang;
  homeVm: ViewModel;
  data: ForecastData;
  loc: Location;
  now: Date;
}

export function SpotPage({ lang, homeVm, data, loc, now }: Props) {
  const S = homeVm.S;
  const { id } = useParams();
  const { spot, loading, attribution } = useSpot(import.meta.env.BASE_URL, id);
  const forecast = useSpotForecast(spot, loc, data, now, lang);
  const [copied, setCopied] = useState(false);

  if (!spot) {
    return (
      <main className="spot-page">
        <p className="hint">{loading ? S.loading : S.spot.notFound}</p>
        <Link to="/">{S.spot.back}</Link>
      </main>
    );
  }

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: spot.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      /* dismissed */
    }
  };
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`;
  const vm = forecast?.vm;
  const v = vm ? verdict(vm) : null;
  const tone = vm ? scoreTone(vm.headline) : 'lo';
  const view = spot.direction ? `${spot.direction.map((d) => `${d}°`).join(', ')}${spot.facesNorth ? ` · ${S.spot.viewNorthOpen}` : ''}` : S.spot.viewNorthUnknown;

  return (
    <main className="spot-page">
      <Link to="/" className="back-link">
        ← {S.spot.back}
      </Link>
      <div className={`spot-hero ${tone}`} aria-hidden="true">
        <svg viewBox="0 0 1280 140" preserveAspectRatio="none">
          <path d="M0 140 L0 70 L160 40 L300 76 L470 18 L640 66 L800 30 L960 62 L1120 36 L1280 58 L1280 140 Z" />
        </svg>
      </div>
      <div className="spot-title">
        <h1>{spot.name}</h1>
        <div className="hint">{forecast ? S.spot.fromHome(forecast.minutes, Math.round(forecast.km), loc.name) : ''}</div>
      </div>

      <div className="spot-body">
        <div className="spot-main">
          <div className="card">
            <div className="row-head">
              <h2>{S.hourByHour}</h2>
              <span className="hint">{vm ? sunTimesLine(vm, spot) : ''}</span>
            </div>
            {vm ? <HourBars vm={vm} height={160} /> : <p className="hint">{S.go.loading}</p>}
          </div>
          <div className="card">
            <div className="eyebrow">OpenStreetMap</div>
            <p className="about">{S.spot.about}</p>
            {attribution ? <p className="fine">{S.go.attribution}</p> : null}
          </div>
        </div>

        <aside className="spot-aside">
          <div className="card here">
            <div className="eyebrow">{S.spot.tonightHere}</div>
            {vm && v ? (
              <>
                <div className="vc-row">
                  <div className={`vc-score small t-${tone}`}>{vm.headline}</div>
                  <div className="vc-label">
                    <span className={`t-${tone}`}>{v.labelText}</span>
                    <small>
                      {S.tt.eye.toLowerCase()} {vm.headline} · {S.tt.camera.toLowerCase()} {vm.headlineCamera} · {S.go.home(homeVm.headline)}
                    </small>
                  </div>
                </div>
                <Trusted as="p" className="vc-sentence small" html={v.sentence} />
              </>
            ) : (
              <p className="hint">{S.go.loading}</p>
            )}
            <div className="actions">
              <a className="btn primary" href={directions} target="_blank" rel="noopener noreferrer">
                {S.spot.navigate}
              </a>
              <button className="btn" onClick={share}>
                {copied ? S.spot.copied : S.spot.share}
              </button>
            </div>
          </div>
          <div className="card facts">
            <div>
              <div className="k">{S.spot.elevation}</div>
              <div className="v">{spot.ele !== null ? `${spot.ele} m` : '—'}</div>
            </div>
            <div>
              <div className="k">{S.spot.viewNorth}</div>
              <div className="v">{view}</div>
            </div>
            <div>
              <div className="k">{S.spot.coordinates}</div>
              <div className="v">
                {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
