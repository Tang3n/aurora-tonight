# 9. Sightings are observations, including "nothing", stored with a forecast snapshot

- Status: Superseded by ADR 14 (accepted 2026-11-19, withdrawn the same day: no accounts, no backend)
- Date: 2026-11-19

## Context

Other aurora apps (Hello Aurora, AuroraPulse, Aurora Forecast) already let people post photos of auroras they saw.
They collect only positive reports, which cannot tell us how often a forecast was wrong. Our validation so far uses a
single camera in Kilpisjärvi; southern Norway has no camera coverage.

## Decision

A sighting is an observation, not a post:

- Fields: `observed_at`, `location` (geography, precision chosen by the user), `spot_id` (nullable), `result`
  (`eye` | `camera` | `none`), `sky` (`clear` | `partly` | `overcast`), optional note and photos.
- At insert, the server computes and stores a snapshot of the forecast for that time and place: `score_eye`,
  `score_camera`, Kp used, cloud input and `model_version` (ADR 4). The client's own value is not trusted.
- "Nothing" reports are first-class in the UI and in the data.
- The public scorecard and `validation/` read from these rows. Calibration is reported per region and only for
  nights with enough reports.

Sketch of the schema:

```
profiles   (id = auth.users.id, handle, created_at)
spots      (id, name, location, source osm|user, osm_id, north_view, bortle, created_by, hidden)
sightings  (id, user_id, spot_id, observed_at, location, precision, result, sky, note,
            score_eye, score_camera, kp, cloud, model_version, hidden, created_at)
photos     (id, sighting_id, storage_key, thumb_key, width, height, exposure, iso, focal_length)
reports    (id, sighting_id, reporter_id, reason, created_at)          -- moderation flags
```

## Alternatives

- **Photo-first posts** like the competitors: more engaging, but no data on misses and no differentiation.
- **Store only the client's score**: simpler, but untrusted and tied to whatever version the client ran.

## Consequences

- Gives the project a dataset nobody else collects: forecasts against outcomes, including misses.
- Reporters are self-selected (people go out on promising nights), so calibration is biased. The scorecard must say
  so, and the camera hindcast stays the unbiased reference where it exists.
- Requires a server-side function on insert (Edge Function or database trigger calling one).
