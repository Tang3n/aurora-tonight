/**
 * Web app shell: preferences, data hooks from @aurora/core, page layout.
 * All logic that the mobile app will share lives in packages/core; this file only wires it to the DOM.
 */
import { DEFAULT_LOCATION, useForecastData, useNow, usePersistentState, useViewModel } from '@aurora/core/hooks';
import { LANGS, STRINGS, langFromLocale, type Lang } from '@aurora/core/i18n';
import type { Location } from '@aurora/data/sources';
import { useEffect } from 'react';
import { Factors } from './components/Factors';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Nights } from './components/Nights';
import { OvalCard } from './components/OvalCard';
import { Ridge, Sky } from './components/Sky';
import { SpaceWeather } from './components/SpaceWeather';
import { Timeline } from './components/Timeline';
import { Verdict } from './components/Verdict';
import { webStore } from './storage';

function initialLang(): Lang {
  const fromUrl = new URLSearchParams(location.search).get('lang') as Lang | null;
  if (fromUrl && LANGS.includes(fromUrl)) return fromUrl;
  try {
    const stored = webStore.get('aurora.lang');
    if (stored) return JSON.parse(stored) as Lang;
  } catch {
    /* fall through */
  }
  return langFromLocale(navigator.language);
}

export function App() {
  const [lang, setLang] = usePersistentState<Lang>(webStore, 'aurora.lang', initialLang);
  const [loc, setLoc] = usePersistentState<Location>(webStore, 'aurora.loc', () => DEFAULT_LOCATION);
  const now = useNow();
  const data = useForecastData(loc);
  const vm = useViewModel(lang, loc, data, now);
  const S = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang === 'no' ? 'nb' : lang;
  }, [lang]);
  useEffect(() => {
    document.body.classList.toggle('loading', !data.loaded);
  }, [data.loaded]);

  return (
    <>
      <Sky score={data.loaded ? vm.headline : 0} />
      <Ridge />
      <div className="wrap">
        <Header lang={lang} onLang={setLang} loc={loc} onLocation={setLoc} />
        <main>
          <section className="hero">
            <Verdict vm={vm} loaded={data.loaded} />
            <OvalCard S={S} grid={data.ovation} loc={loc} now={now} />
          </section>

          <div className="notice" hidden={data.failed.length === 0}>
            {data.failed.length ? S.failed(data.failed.join(', ')) : ''}
          </div>

          <Timeline vm={vm} loc={loc} loaded={data.loaded} />
          <Factors vm={vm} loc={loc} loaded={data.loaded} />

          <section className="split section">
            <SpaceWeather S={S} wind={data.wind} loaded={data.loaded} />
            <Nights vm={vm} kp={data.kp} tz={loc.tz} loaded={data.loaded} />
          </section>
        </main>
        <Footer S={S} />
      </div>
    </>
  );
}
