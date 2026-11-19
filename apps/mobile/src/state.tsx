/** App-wide preferences shared by all tabs: language, place, alert settings. */
import { DEFAULT_ALERT_PREFS } from '@aurora/core/alerts';
import { DEFAULT_LOCATION, usePersistentState } from '@aurora/core/hooks';
import type { Lang } from '@aurora/core/i18n';
import type { Location } from '@aurora/data/sources';
import { createContext, useContext, type ReactNode } from 'react';
import { appStore, KEYS, systemLang, type AlertSettings } from './prefs';

interface AppState {
  lang: Lang;
  setLang(l: Lang): void;
  loc: Location;
  setLoc(l: Location): void;
  alerts: AlertSettings;
  setAlerts(a: AlertSettings): void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = usePersistentState<Lang>(appStore, KEYS.lang, systemLang);
  const [loc, setLoc] = usePersistentState<Location>(appStore, KEYS.loc, () => DEFAULT_LOCATION);
  const [alerts, setAlerts] = usePersistentState<AlertSettings>(appStore, KEYS.alerts, () => ({
    enabled: DEFAULT_ALERT_PREFS.enabled,
    threshold: DEFAULT_ALERT_PREFS.threshold,
  }));
  return <Ctx.Provider value={{ lang, setLang, loc, setLoc, alerts, setAlerts }}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const s = useContext(Ctx);
  if (!s) throw new Error('useAppState outside AppStateProvider');
  return s;
}
