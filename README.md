# Aurora Tonight

**Should you go outside tonight to see the northern lights?** One answer for your location, with the reasons behind it.

**Live:** https://tang3n.github.io/aurora-tonight/

## Why

Every aurora app I tried showed a wall of numbers and charts — Kp, Bz, solar wind, cloud maps — and left the actual
decision to me. I wanted something of my own that answers the one question I care about while living in Norway:
*go out or stay in, and when?* The details are still there, one step below, for anyone curious about why.

## How it works

Everything runs in the browser — there is no backend. The page fetches public, keyless APIs directly:

| Source | Used for |
|---|---|
| NOAA SWPC — Kp forecast (3-hour blocks) | aurora activity for each hour tonight |
| NOAA SWPC — OVATION nowcast (1° grid) | the oval map and the current hour |
| NOAA SWPC — real-time solar wind (1 min) | Bz, speed, density right now |
| MET Norway — Locationforecast | low / mid / high cloud cover per hour |
| Open-Meteo — Geocoding | place search |
| computed locally (`suncalc`) | sun altitude, moon phase and altitude |

Each hour gets a score:

```
score = 100 × activity × sky × darkness × moon        (each factor 0..1)
```

The factors are multiplied on purpose: a single blocker — daylight or overcast sky — means no aurora, however strong
the storm. *Activity* compares the forecast Kp with the Kp your **geomagnetic** latitude needs (aurora follows the
magnetic field, not geography). If a data source fails, its factor falls back to a cautious default and the page says so.

See [docs/spec.md](docs/spec.md) for the full spec and model.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173/aurora-tonight/
npm test        # unit tests for the scoring model
npm run build   # typecheck + production build to dist/
```

Code map: `src/model/` pure scoring and astronomy (unit-tested) · `src/data/` all network access · `src/ui/` rendering ·
`src/main.ts` state and refresh schedule. Pushes to `main` deploy to GitHub Pages via Actions.

## License

MIT
