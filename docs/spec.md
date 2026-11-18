# Aurora Tonight — Product spec (draft)

## Goal

Answer one question in under 5 seconds: **"Is it worth going out tonight to see the aurora, and when?"**
Then let curious users drill into *why*.

Static site (GitHub Pages), no backend, no accounts, no API keys.

## Data sources (verified 2026-11-18, all CORS-enabled)

| Source | Endpoint | Resolution | Used for |
|---|---|---|---|
| NOAA SWPC OVATION | `services.swpc.noaa.gov/json/ovation_aurora_latest.json` | 1°×1° grid, ~30–90 min ahead | Aurora probability near you, right now |
| NOAA SWPC Kp forecast | `services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json` | 3 h, ~3 days ahead | Tonight's timeline + 3-day outlook |
| NOAA real-time solar wind | `services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json`, `rtsw_wind_1m.json` | 1 min | "Right now" panel: Bz, speed, density |
| MET Norway Locationforecast | `api.met.no/weatherapi/locationforecast/2.0/complete` | 1 h | Cloud cover (low / mid / high) |
| Open-Meteo Geocoding | `geocoding-api.open-meteo.com/v1/search` | — | Place search |
| Computed locally | — | any | Sun altitude (darkness), moon phase + altitude |

## Features

### MVP
1. **Location** — browser geolocation, or place search; remembered locally. Default: Stavanger.
2. **Tonight verdict** — score 0–100, a one-word label (No / Unlikely / Maybe / Good / Go now) and one sentence,
   e.g. *"Best window 22:00–00:30. Look north, low on the horizon."*
3. **Hourly timeline** for tonight (sunset → sunrise): combined score per hour, with the factor breakdown on hover/tap.
4. **Factor cards** — aurora activity, clouds, darkness, moon; each with a value, a status and a one-line explanation.
5. **Right now panel** — live solar wind (Bz, speed, density) with plain-language reading ("Bz is southward — good").
6. **3-day outlook** — max Kp per night.
7. **Data freshness** — every value shows its age; stale or failed sources degrade the score instead of breaking the page.
8. **Aurora oval map** — OVATION grid rendered on a polar globe with your position.
9. **Languages** — EN / CS / NO.

### Later
- PWA (installable, offline shell)
- In-tab alert when the score crosses a threshold
- Island in the portfolio fjord world linking here

### Non-goals
Backend, push notifications, accounts, photo sharing, historical archive.

## Scoring model (first version, to be tuned)

Per hour *h* tonight:

```
score(h) = activity(h) × sky(h) × dark(h) × moon(h)      each factor in 0..1
```

- **activity** — from OVATION probability in a band north of the user (aurora is seen equatorward of the oval)
  for the nowcast window, and from Kp vs. the Kp needed at the user's geomagnetic latitude for later hours.
- **sky** — `1 − effective cloud cover`, low clouds weighted most, high clouds least.
- **dark** — 0 above sun altitude −6°, ramps to 1 at −18°.
- **moon** — small penalty scaled by illumination × max(0, altitude).

The model is shown to the user ("why this score"), not hidden.

## Visual direction — "Living sky" (decided 2026-11-18)
Full-screen animated aurora curtains (WebGL shader) behind the UI; their brightness and motion follow the real score,
so a bad night literally looks dark. Content sits in dark glass cards. Mountain silhouette at the bottom.
Mockup: `design/mockup.html`.

## Tech
Vite + TypeScript, no UI framework; deploy to GitHub Pages via Actions. Unit tests for the scoring and astronomy code (Vitest).

## Open questions
- Final name / domain
