import { LANGS, STRINGS, type Lang } from '@aurora/core/i18n';
import { searchPlaces, type Location } from '@aurora/data/sources';
import { useEffect, useRef, useState } from 'react';

interface Props {
  lang: Lang;
  onLang(lang: Lang): void;
  loc: Location;
  onLocation(loc: Location): void;
}

export function Header({ lang, onLang, loc, onLocation }: Props) {
  return (
    <header>
      <div className="brand">
        <span className="mark" />
        Aurora Tonight
      </div>
      <LocationPicker lang={lang} loc={loc} onLocation={onLocation} />
      <div className="lang" role="group" aria-label="Language">
        {LANGS.map((l) => (
          <button key={l} aria-pressed={l === lang} onClick={() => l !== lang && onLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}

function LocationPicker({ lang, loc, onLocation }: Omit<Props, 'onLang'>) {
  const S = STRINGS[lang];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[] | null>(null);
  const [locating, setLocating] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults(null);
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  // Debounced search; a newer query wins even if an older one answers later.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults(null);
      return;
    }
    const id = setTimeout(async () => {
      const mine = ++seq.current;
      try {
        const found = await searchPlaces(text, lang === 'no' ? 'nb' : lang);
        if (mine === seq.current) setResults(found);
      } catch {
        if (mine === seq.current) setResults([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query, lang]);

  const choose = (l: Location) => {
    setOpen(false);
    onLocation(l);
  };

  const geolocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lon } = pos.coords;
        choose({
          name: S.myLocation,
          region: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          lat,
          lon,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      },
      () => setLocating(false),
      { timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  };

  return (
    <div className="loc" ref={root}>
      <button
        className="pill"
        ref={button}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${S.changeLocation}: ${loc.name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <span>{loc.name}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="popover" role="dialog" hidden={!open}>
        <input
          ref={input}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={S.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results?.[0]) choose(results[0]);
          }}
        />
        <ul>
          {results === null
            ? null
            : results.length
              ? results.map((p, i) => (
                  <li key={`${p.lat},${p.lon},${i}`}>
                    <button type="button" onClick={() => choose(p)}>
                      {p.name}
                      <small>{p.region}</small>
                    </button>
                  </li>
                ))
              : <li className="empty">{S.noResults}</li>}
        </ul>
        <button className="geo" type="button" onClick={geolocate}>
          {locating ? (
            S.locating
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              {S.useMyLocation}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
