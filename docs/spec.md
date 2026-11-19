# Aurora Tonight — Product spec

Rewritten 2026-11-19 when the project grew from a static forecast page into a web + mobile product with accounts.
Architecture decisions are in [`adr/`](adr/README.md), diagrams in [`architecture.md`](architecture.md), the stack in
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

Community sightings with photos already exist in Hello Aurora, AuroraPulse and Aurora Forecast (iOS). Photo sharing
alone does not set us apart. What does: a physics model validated against an all-sky camera, a "where to go"
answer, reports that include "saw nothing", and a public scorecard of our own accuracy.

## Core loop

```
forecast ──► alert ──► drive to a spot ──► report (eye / camera only / nothing, optional photo)
    ▲                                                   │
    └── calibration + alerts for people nearby ◄────────┘
```

Accounts exist to join this loop. Without one, everything is readable.

## Pillars

1. **Tonight**: one score (eye and camera), the best window, factors (activity, clouds, darkness, moon), the oval,
   live solar wind, 3-day outlook. Exists today (phase 0).
2. **Where to go**: rank spots within a chosen travel time by tonight's score; "clear sky 35 min north-east".
   Spots are seeded from OpenStreetMap viewpoints and later added by users ([ADR 6](adr/0006-where-to-go-computed-in-the-client.md),
   [ADR 7](adr/0007-spots-seeded-from-openstreetmap.md)).
3. **Sightings**: observations tied to a place and time: seen with the eye, camera only, or nothing; optional
   photos; stored with a server-computed snapshot of our forecast ([ADR 9](adr/0009-sightings-as-observations-with-forecast-snapshot.md)).
   Photos are shown on spot pages, not in a feed ([ADR 12](adr/0012-no-feed-chat-or-follows.md)).
4. **Scorecard**: a public page comparing forecasts with reports per region, including the nights we got wrong.
5. **Journal and alerts** (signed in): my nights, my photos, saved spots; alerts for "good night within 1 h drive"
   and "sightings within 50 km" ([ADR 11](adr/0011-server-side-alerts.md)).

## Platforms ([ADR 13](adr/0013-react-and-react-native-via-expo.md))

| | Web (React) | Mobile app (React Native, Expo) |
|---|---|---|
| Role | public, read-mostly; shared by link | action: alerts, reporting from the spot |
| Tonight, where to go | yes (desktop layout: forecast and map side by side) | yes |
| Spot pages, scorecard | yes, prerendered, link previews | yes |
| Report a sighting | later; prompt to use the app | yes, with photo |
| Journal, alerts | read-only journal later | yes, push + background checks |

Both apps share `packages/model`, `packages/data` and `packages/core` (hooks and state). URLs match on both
(`/spot/:id`, `/scorecard`).

## Phases

| Phase | Scope | Done when |
|---|---|---|
| 0 (done) | static forecast page, model v2, validation, EN/CS/NO | live on GitHub Pages |
| 1 | monorepo; web rewritten in React; **where to go** with OSM spots, no backend | I use it to choose where to drive |
| 2 | Expo app (Android first): tonight, where to go, device-side alerts | app on my phone |
| 3 | Supabase: accounts, sightings incl. "nothing", photos, journal, moderation basics, privacy policy | first report from someone else |
| 4 | server alerts (forecast + reports nearby), public scorecard from reports | numbers for southern Norway |
| later | iOS build, web report form, routing-based travel times, light-pollution layer | — |

Phases 3–4 come after the 2026 exam period.

## Non-goals

- Social features: feed, comments, chat, direct messages, followers, likes as a mechanic ([ADR 12](adr/0012-no-feed-chat-or-follows.md)).
- Monetisation, ads, paid tiers.
- A historical archive of space weather (we link to existing ones).
- Storing original photos or precise locations the user did not choose to share ([ADR 10](adr/0010-location-and-photo-privacy.md)).

## Privacy and moderation

GDPR applies (EU/EEA). EXIF is removed on the device, location precision is the user's choice and enforced on the
server, account deletion removes everything ([ADR 10](adr/0010-location-and-photo-privacy.md)). Posting needs an
account; daily upload limit, report button, auto-hide after repeated flags, admin view ([ADR 12](adr/0012-no-feed-chat-or-follows.md)).

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
Brier skill −0.23 → +0.22). The same model runs on the web, in the app and on the server ([ADR 4](adr/0004-one-typescript-model-for-all-runtimes.md)).

Next: calibrate against user reports in the south (phase 4), log forecast vs observed Kp, light-pollution layer.

## Visual direction — "Living sky" (decided 2026-11-18)

Full-screen animated aurora curtains behind the UI; their brightness and motion follow the real score, so a bad
night literally looks dark. Content sits in dark glass cards. Mountain silhouette at the bottom. Tokens: background
`#04070f`, aurora `#5cffb0`, cyan `#39d0ff`, violet `#b48cff`, warning `#ffc56b`; Space Grotesk for numbers and
headings, Inter for text. Original mockup: `design/mockup.html`; app screens: `design/app-mock/`.

## Open questions

- Final name and domain.
- Light-pollution data with a usable licence.
- Travel time: OSRM or OpenRouteService for the top spots, and their usage limits.
- Whether the Supabase free plan's inactivity pause is prevented by the alert cron (ADR 8).
