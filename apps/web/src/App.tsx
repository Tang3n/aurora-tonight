/**
 * Web app shell: preferences, data hooks from @aurora/core, routes.
 * All logic the mobile app will share lives in packages/core; this file only wires it to the DOM.
 * Routes follow the web mock: one home page (tonight + where to go) and a page per spot.
 */
import { DEFAULT_LOCATION, useForecastData, useNow, usePersistentState, useViewModel } from '@aurora/core/hooks';
import { LANGS, STRINGS, langFromLocale, type Lang } from '@aurora/core/i18n';
import type { Location } from '@aurora/data/sources';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Ridge, Sky } from './components/Sky';
import { HomePage } from './pages/HomePage';
import { SpotPage } from './pages/SpotPage';
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

  useEffect(() => {
    document.documentElement.lang = lang === 'no' ? 'nb' : lang;
  }, [lang]);
  useEffect(() => {
    document.body.classList.toggle('loading', !data.loaded);
  }, [data.loaded]);

  const home = <HomePage vm={vm} data={data} loc={loc} now={now} lang={lang} />;
  return (
    <>
      <Sky score={data.loaded ? vm.headline : 0} />
      <Ridge />
      <div className="wrap">
        <Header lang={lang} onLang={setLang} loc={loc} onLocation={setLoc} />
        <Routes>
          <Route index element={home} />
          {/* "Where to go" used to be its own page; on the web it is now part of home. */}
          <Route path="go" element={<Navigate to="/" replace />} />
          <Route path="spot/:id" element={<SpotPage lang={lang} homeVm={vm} data={data} loc={loc} now={now} />} />
          <Route path="*" element={home} />
        </Routes>
        <Footer S={STRINGS[lang]} />
      </div>
    </>
  );
}
