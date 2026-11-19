# Where to go (phase 1)

Part of the [architecture diagrams](../architecture.md). Mermaid sequence diagram, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

Runs entirely in the client ([ADR 6](../adr/0006-where-to-go-computed-in-the-client.md),
[ADR 7](../adr/0007-spots-seeded-from-openstreetmap.md)). The expensive part, the cloud forecast for many points, is one
request.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant C as Client (web or app)
    participant S as public/spots/*.json<br/>(OSM, built offline)
    participant OM as Open-Meteo<br/>multi-location forecast
    participant N as NOAA SWPC
    participant M as packages/model

    U->>C: open "Go", travel limit ≤ 1 h
    C->>S: spots in bounding box around the user
    S-->>C: ~20–40 spots (name, position, north view)
    par one request each
        C->>OM: hourly clouds for all spot coordinates
        C->>N: Kp forecast + OVATION (already cached for Tonight)
    end
    OM-->>C: cloud cover per spot and hour
    N-->>C: Kp blocks, oval grid
    loop each spot
        C->>M: buildTonight(now, spot, {kp, clouds, ovation})
        M-->>C: hourly scores
    end
    C->>C: filter by travel time ≈ distance × road factor<br/>rank by best score in tonight's window
    C-->>U: map + ranked list ("Dalsnuten 64, 35 min")
```

---

[← All diagrams](../architecture.md)
