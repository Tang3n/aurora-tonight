/**
 * Web app shell: preferences, data hooks from @aurora/core, routes.
 * All logic the mobile app will share lives in packages/core; this file only wires it to the DOM.
 */
import { DEFAULT_LOCATION, useForecastData, useNow, usePersistentState, useViewModel } from '@aurora/core/hooks';
import { LANGS, STRINGS, langFromLocale, type Lang } from '@aurora/core/i18n';
import type { Location } from '@aurora/data/sources';
import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Ridge, Sky } from './components/Sky';
import { TonightPage } from './pages/TonightPage';
import { webStore } from './storage';

// The map library is large; only visitors of "Where to go" download it.
const GoPage = lazy(() => import('./pages/GoPage'));

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

  const tonight = <TonightPage vm={vm} data={data} loc={loc} now={now} />;
  return (
    <>
      <Sky score={data.loaded ? vm.headline : 0} />
      <Ridge />
      <div className="wrap">
        <Header lang={lang} onLang={setLang} loc={loc} onLocation={setLoc} />
        <Routes>
          <Route index element={tonight} />
          <Route
            path="go"
            element={
              <Suspense fallback={<main className="go"><p className="hint">{S.go.loading}</p></main>}>
                <GoPage lang={lang} vm={vm} data={data} loc={loc} now={now} />
              </Suspense>
            }
          />
          <Route path="*" element={tonight} />
        </Routes>
        <Footer S={S} />
      </div>
    </>
  );
}
