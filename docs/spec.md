# Aurora Tonight — Product spec

Rewritten 2026-11-19 when the project grew from a static forecast page into a web + mobile product; the same day
accounts and the backend were dropped again ([ADR 14](adr/0014-no-accounts-no-backend.md)). Architecture decisions are in [`adr/`](adr/README.md), diagrams in [`architecture.md`](architecture.md), the stack in
[`tech-stack.md`](tech-stack.md), the UI mock in
`design/app-mock/` (canvas: https://claude.ai/artifact/YDjKRcTRCTwzhMMn7vqHMw).

## Goal

**Tell people whether, when and *where* to go tonight to see the aurora — and admit the next morning whether we
were right.**

Other aurora apps answer "what is the Kp?". People actually decide "do I drive out, and to which place?". The
answer must come in under 5 seconds; the *why* is one level down.

## Who it is for

People at the **edge of the auroral oval**: southern and central Norway, Sweden, Finland, Scotland. In Tromsø the
aurora is overhead most clear nights; further south every night is a bet and a good forecast is worth the most.
Secondary: exchange students and tourists who do not know where to go.

## Market (checked 2026-11-19)

Community sightings with photos already exist in Hello Aurora, AuroraPulse and Aurora Forecast (iOS); we do not
compete there. What sets us apart: a physics model validated against all-sky cameras, a "where to go" answer,
alerts that need no account, and (later) a public scorecard of our own accuracy.

## How it is used

```
open the app / get an alert ──► see tonight's score and window ──► (maybe) pick a spot within reach ──► go out
```

No sign-up, no server: everything runs on the device or in the browser, from public data
([ADR 14](adr/0014-no-accounts-no-backend.md)).

## Pillars

1. **Tonight**: one score (eye and camera), the best window, factors (activity, clouds, darkness, moon), the oval,
   live solar wind, 3-day outlook.
2. **Where to go**: rank OSM viewpoints within a chosen travel time by tonight's score; recommend driving only when
   a spot beats home by 5+ points ([ADR 6](adr/0006-where-to-go-computed-in-the-client.md),
   [ADR 7](adr/0007-spots-seeded-from-openstreetmap.md)).
3. **Alerts** (app): the phone checks the forecast for the saved place about every 15 minutes and notifies at most
   once per night above a chosen threshold.
4. **Scorecard** (later): how often the forecast matched what public all-sky cameras saw, regenerated
   automatically, published as static data.

## Platforms ([ADR 13](adr/0013-react-and-react-native-via-expo.md), [ADR 14](adr/0014-no-accounts-no-backend.md))

| | Web (React, GitHub Pages) | Mobile app (React Native, Expo) |
|---|---|---|
| Tonight, where to go | yes (desktop layout: forecast and map side by side) | yes |
| Alerts | no (a browser cannot run in the background) | yes, on the device |
| Scorecard (later) | yes | yes |
| Accounts, reports, photos | no | no |

Both share `packages/model`, `packages/data` and `packages/core` (hooks, view model, ranking, alert decision).

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | static forecast page, model v2, validation, EN/CS/NO | done, live |
| 1 | monorepo; web in React; **where to go** with OSM spots | done, live 2026-11-19 |
| 2 | Expo app (Android first): tonight, where to go, device-side alerts | built 2026-11-19, emulator-tested; phone test pending |
| 3 | camera scorecard: scheduled GitHub Action reads all-sky keograms, compares with the model, publishes JSON; scorecard page in web and app | next |
| later | animated sky in the app (Skia), north view from a terrain model, routing-based travel times, light-pollution layer, iOS build | — |

## Non-goals

- Accounts, user-generated content (reports, photos, comments) and any backend or database ([ADR 14](adr/0014-no-accounts-no-backend.md)).
- Social features of any kind.
- Monetisation, ads, paid tiers.
- A historical archive of space weather (we link to existing ones).

## Privacy

No personal data is collected or stored by us. The app keeps its settings on the phone; the chosen place (or a
coarse GPS position) is sent only to the public weather and space-weather APIs to fetch the forecast. Fine location,
storage and overlay permissions are blocked in the Android build.

## Data sources (verified 2026-11-18/19, all CORS-enabled)

| Source | Endpoint | Resolution | Used for |
|---|---|---|---|
| NOAA SWPC OVATION | `services.swpc.noaa.gov/json/ovation_aurora_latest.json` | 1°×1° grid, ~30–90 min ahead | aurora probability now |
| NOAA SWPC Kp forecast | `services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json` | 3 h, ~3 days ahead | tonight's timeline, 3-day outlook |
| NOAA real-time solar wind | `services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json`, `rtsw_wind_1m.json` | 1 min | "right now" panel |
| MET Norway Locationforecast | `api.met.no/weatherapi/locationforecast/2.0/complete` | 1 h | clouds at the home point |
| Open-Meteo forecast | `api.open-meteo.com/v1/forecast` (many coordinates per request) | 1 h | clouds for spots (phase 1) |
| Open-Meteo Geocoding | `geocoding-api.open-meteo.com/v1/search` | — | place search |
| OpenStreetMap (Overpass, build time) | `overpass-api.de/api/interpreter` | — | seeded spots (phase 1) |
| Computed locally | — | any | sun and moon |

Licences: [`tech-stack.md`](tech-stack.md#data-sources).

## Scoring model (v2, 2026-11-18)

Replaced the first "Kp minus threshold" model, which saturated (Stavanger ≈ Trondheim) and used a centred dipole
that is 3–4° off over southern Norway. Now: P(see) = P(clear) × E_Kp[V], where V follows the light from the
Starkov oval (Kp, MLT) through elevation, extinction and contrast against twilight + moonlight, for the eye and for a
camera. Code: `packages/model/src/{aacgm,oval,visibility,night}.ts`; parameters and their status (sourced / fitted /
estimate) are listed in `PARAMS` in `visibility.ts`. Research behind it: Starkov 1994 via Sigernes et al. 2011;
Case et al. 2016; Zhang & Paxton 2008; Krisciunas & Schaefer 1991; Kasten & Young 1989; SWPC Kp verification.

Validated 2026-11-18 against the Kilpisjärvi all-sky camera (see `validation/README.md`): the physics ranks clear
hours well (AUC 0.97); forecast cloud was far too harsh and now uses an empirical curve (overall AUC 0.67 → 0.79,
Brier skill −0.23 → +0.22). The same model runs on the web, in the app and in the app's background check
([ADR 4](adr/0004-one-typescript-model-for-all-runtimes.md)).

Next: the automated camera scorecard (phase 3), more camera stations, log forecast vs observed Kp, light-pollution layer.

## Visual direction — "Living sky" (decided 2026-11-18)

Full-screen animated aurora curtains behind the UI; their brightness and motion follow the real score, so a bad
night literally looks dark. Content sits in dark glass cards. Mountain silhouette at the bottom. Tokens: background
`#04070f`, aurora `#5cffb0`, cyan `#39d0ff`, violet `#b48cff`, warning `#ffc56b`; Space Grotesk for numbers and
headings, Inter for text. Original mockup: `design/mockup.html`; app screens: `design/app-mock/`.

## Open questions

- Final name and domain.
- Light-pollution data with a usable licence.
- Travel time: OSRM or OpenRouteService for the top spots, and their usage limits.
- Which all-sky cameras publish data usable for an automatic scorecard, and under which terms.
