# Where to go (phase 1)

Part of the [architecture diagrams](../architecture.md). Mermaid sequence diagram, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

Runs entirely in the client ([ADR 6](../adr/0006-where-to-go-computed-in-the-client.md),
[ADR 7](../adr/0007-spots-seeded-from-openstreetmap.md)). Built 2026-11-19: `packages/core/src/spots.ts`
(`useWhereToGo`), `packages/data/src/spots.ts`, `fetchCloudsMany` in `packages/data/src/sources.ts`, page
`apps/web/src/pages/GoPage.tsx`. The expensive part, the cloud forecast for many points, is one request.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant C as Client (web; app later)
    participant S as spots/*.json<br/>(OSM viewpoints, built offline)
    participant OM as Open-Meteo<br/>metno_seamless, many points
    participant N as NOAA SWPC
    participant M as packages/model

    U->>C: open "Where to go"
    C->>S: region files whose box is within 150 km of home
    S-->>C: named viewpoints (Rogaland 93, Trøndelag 107)
    C->>C: travel ≈ straight line × 1.35 at 65 km/h<br/>keep ≤ 2 h, at most 60 nearest
    par
        C->>OM: hourly clouds for all candidates (one request per 100)
        Note over C,N: Kp and OVATION are already cached by the Tonight page
    end
    OM-->>C: cloud cover per spot and hour (same as MET within 0.4 pp)
    loop each candidate (~7 ms each)
        C->>M: buildTonight(now, spot, {kp, clouds, ovation})
        M-->>C: hourly scores
        C->>C: same headline logic as the home verdict
    end
    C->>C: rank by eye score, then camera, then distance
    U->>C: pick ≤ 30 min / ≤ 1 h / ≤ 2 h
    alt best spot beats home by ≥ 5 points
        C-->>U: map + ranked list
    else
        C-->>U: list + "nothing within reach beats staying home"
    end
```

Known limits: travel time ignores real roads and ferries; the north view is known only for the ~7 % of
viewpoints that have an OSM `direction` tag; scoring runs on the main thread (fine on a laptop, ~1 s on a slow
phone; a Web Worker is the fix if needed).

---

[← All diagrams](../architecture.md)
