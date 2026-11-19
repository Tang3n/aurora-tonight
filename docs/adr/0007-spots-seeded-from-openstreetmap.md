# 7. Spots are seeded from OpenStreetMap at build time

- Status: Accepted
- Date: 2026-11-19

## Context

A map of spots must not be empty on day one, before any user has added a place. OpenStreetMap has viewpoints
(`tourism=viewpoint`), peaks and parking areas with names and positions. The Overpass API is a shared public service
with usage limits; calling it from every browser would be both slow and impolite.

## Decision

- A script in `tools/` queries Overpass for selected regions (start with Rogaland and Trøndelag) and writes one
  compact JSON file per region to `public/spots/`. It runs manually or on a monthly schedule, and the output is
  committed.
- Each spot gets derived fields computed once at build time: rough north-horizon openness from a terrain model
  where available, and darkness from a light-pollution layer if its licence allows (open question, see spec).
- Show the ODbL attribution ("© OpenStreetMap contributors") wherever spots are shown.
- In phase 2, user-created spots live in the database (ADR 8) and are merged with the seeded ones on the client.

## Alternatives

- **Overpass at runtime**: always fresh, but slow and against fair use.
- **Hand-curated list only**: high quality, but does not scale beyond places I know.

## Consequences

- Fast, cacheable, works offline in the PWA.
- Seeded spots can be poor (no view north, closed roads). Reports and a "not a good spot" flag will need to hide
  them; until then, keep the seed list small and reviewed.
- ODbL share-alike applies if we publish a derived database of spots; keep the derived file under ODbL.
