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

## Scoring model (v2, 2026-11-18)

Replaced the first "Kp minus threshold" model, which saturated (Stavanger ≈ Trondheim) and used a centred dipole
that is 3–4° off over southern Norway. Now: P(see) = P(clear) × E_Kp[V], where V follows the light from the
Starkov oval (Kp, MLT) through elevation, extinction and contrast against twilight + moonlight, for the eye and for a
camera. Code: `src/model/{aacgm,oval,visibility,night}.ts`; parameters and their status (sourced / fitted / estimate)
are listed in `PARAMS` in `visibility.ts`. Research behind it: Starkov 1994 via Sigernes et al. 2011; Case et al.
2016; Zhang & Paxton 2008; Krisciunas & Schaefer 1991; Kasten & Young 1989; SWPC Kp verification.

Validated 2026-11-18 against the Kilpisjärvi all-sky camera (see `validation/README.md`): the physics ranks clear
hours well (AUC 0.97); forecast cloud was far too harsh and now uses an empirical curve (overall AUC 0.67 → 0.79,
Brier skill −0.23 → +0.22).

Next: sightings further south (Aurorasaurus), log forecast vs observed Kp, light pollution layer.

## Visual direction — "Living sky" (decided 2026-11-18)
Full-screen animated aurora curtains (WebGL shader) behind the UI; their brightness and motion follow the real score,
so a bad night literally looks dark. Content sits in dark glass cards. Mountain silhouette at the bottom.
Mockup: `design/mockup.html`.

## Tech
Vite + TypeScript, no UI framework; deploy to GitHub Pages via Actions. Unit tests for the scoring and astronomy code (Vitest).

## Open questions
- Final name / domain
