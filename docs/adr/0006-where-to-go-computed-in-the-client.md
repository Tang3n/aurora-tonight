# 6. "Where to go" is computed in the client from a multi-point cloud forecast

- Status: Accepted
- Date: 2026-11-19

## Context

The main differentiator (see the mock, screen 2) is "clear sky 35 min north-east": score candidate spots within a
driving radius and rank them. In southern Norway clouds decide most nights, and they vary over tens of kilometres.

The current cloud source, MET Norway Locationforecast, is one request per point. Scoring 20–40 spots per user would
multiply requests, and MET's terms ask clients to identify themselves and keep traffic reasonable. Open-Meteo's
forecast API accepts many coordinates in one request and returns low/mid/high cloud cover, including from the MET
Nordic model.

## Decision

- Phase 1 runs entirely in the browser, without a backend:
  1. load spots in a bounding box around the user (ADR 7);
  2. fetch hourly cloud cover for all of them in one Open-Meteo multi-location request;
  3. run the shared model (ADR 4) per spot and hour, with the oval and Kp data already loaded for the home point;
  4. rank by best score in the night's window, filtered by travel time.
- Travel time starts as great-circle distance × a road factor, shown as "≈ 35 min". Real routing (OSRM or
  OpenRouteService) is a later ADR, only for the top few spots.
- MET Norway stays the source for the home point, which keeps the validated cloud curve unchanged there.

## Alternatives

- **Precompute a regional grid on a server**: one fetch per region for everyone, but needs a backend and scheduler
  before phase 2.
- **MET Norway per spot**: one source everywhere, but too many requests and against the spirit of its terms.

## Consequences

- Ships without a backend; each user pays only one extra request.
- Two cloud sources means the home score and a spot score at the same place may differ slightly. Show the source
  and re-check the empirical cloud curve against Open-Meteo data in `validation/`.
- Open-Meteo's free API is for non-commercial use with attribution (CC BY 4.0), which fits this project.

## Implementation notes (2026-11-19)

- Built as decided: `useWhereToGo` in `packages/core/src/spots.ts`, page `apps/web/src/pages/GoPage.tsx`.
- The two cloud sources agree: `validation/compare_cloud_sources.py` found 0.4 pp mean absolute difference
  in total cloud between MET and Open-Meteo `metno_seamless` (198 hours, six places), so the concern above did
  not materialise.
- Added a rule the ADR did not have: a spot is only recommended when it beats home by at least 5 points
  (`worthTheDrive`), because forecast noise makes smaller gains meaningless. Revisit with report data.
- Scoring is ~7 ms per spot (Node, laptop); at most 60 candidates run on the main thread. A Web Worker is the
  fix if phones struggle.
- 2026-11-19, later: on the web "where to go" moved into the home page (map beside the verdict, spot cards below)
  and each spot got its own page (`/spot/:id`), following the web mock; `/go` redirects to `/`.
