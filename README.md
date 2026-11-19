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
| MET Norway — Locationforecast | total + layered cloud cover and fog per hour |
| Open-Meteo — Geocoding | place search |
| computed locally (`suncalc`) | sun altitude, moon phase and altitude |

For every hour of the night the app estimates the **chance to see aurora with your own eyes** (and separately with a
phone camera) by following the light:

1. **Where is the oval?** Starkov (1994) boundary model driven by the Kp forecast and *magnetic local time*
   (the oval reaches furthest south around magnetic midnight).
2. **How far is it from you?** Distance in AACGM-v2 **magnetic** latitude — a precomputed grid
   (`tools/gen_aacgm_grid.py`), because the simple dipole is 3–4° off over Scandinavia.
3. **How high above the horizon?** Elevation of the aurora's lower edge at 110 km, with Earth curvature.
4. **How much light gets through?** Atmospheric extinction (Kasten & Young airmass).
5. **Can it beat the sky?** Contrast against a background brightened by twilight and the Moon
   (Krisciunas & Schaefer 1991), with thresholds for the eye (~1 kR) and a camera (~0.1 kR).
6. **Is it clear?** MET Norway total cloud cover, averaged over ±1 h.

Forecast Kp is treated as a distribution (σ ≈ 1.2), and the live OVATION nowcast is run through the same light path
for the next hour or two. Brightness was calibrated to NOAA's Kp→latitude table — not yet against real sightings,
so the number is a score, not a calibrated probability. If a data source fails, the page says so and stays cautious.

See [docs/spec.md](docs/spec.md) for the full spec and model.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173/aurora-tonight/
npm test        # unit tests in every workspace
npm run typecheck
npm run build   # typecheck + production build of the web app to apps/web/dist/
```

npm workspaces monorepo:

| Path | What |
|---|---|
| `packages/model` | pure scoring and astronomy, unit-tested; no DOM or Node APIs, runs on web, mobile and server |
| `packages/data` | all network access (NOAA, MET Norway, Open-Meteo), only `fetch` |
| `apps/web` | the website: `src/ui/` rendering, `src/main.ts` state and refresh schedule |
| `validation/` | hindcast against the Kilpisjärvi all-sky camera |
| `tools/` | generator of the AACGM grid |

Pushes to `main` deploy `apps/web` to GitHub Pages via Actions. Plans and decisions: [docs/spec.md](docs/spec.md),
[docs/adr/](docs/adr/README.md), [docs/tech-stack.md](docs/tech-stack.md).

## License

MIT
