import type { ForecastData } from '@aurora/core/hooks';
import type { ViewModel } from '@aurora/core/view';
import type { Location } from '@aurora/data/sources';
import { Link } from 'react-router';
import { Factors } from '../components/Factors';
import { Nights } from '../components/Nights';
import { OvalCard } from '../components/OvalCard';
import { SpaceWeather } from '../components/SpaceWeather';
import { Timeline } from '../components/Timeline';
import { Verdict } from '../components/Verdict';

interface Props {
  vm: ViewModel;
  data: ForecastData;
  loc: Location;
  now: Date;
}

export function TonightPage({ vm, data, loc, now }: Props) {
  const S = vm.S;
  return (
    <main>
      <section className="hero">
        <Verdict vm={vm} loaded={data.loaded} />
        <OvalCard S={S} grid={data.ovation} loc={loc} now={now} />
      </section>

      <div className="notice" hidden={data.failed.length === 0}>
        {data.failed.length ? S.failed(data.failed.join(', ')) : ''}
      </div>

      {data.loaded ? (
        <Link to="/go" className="card go-teaser section">
          <span className="eyebrow">{S.nav.go}</span>
          <span>{S.go.lead}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      ) : null}

      <Timeline vm={vm} loc={loc} loaded={data.loaded} />
      <Factors vm={vm} loc={loc} loaded={data.loaded} />

      <section className="split section">
        <SpaceWeather S={S} wind={data.wind} loaded={data.loaded} />
        <Nights vm={vm} kp={data.kp} tz={loc.tz} loaded={data.loaded} />
      </section>
    </main>
  );
}
