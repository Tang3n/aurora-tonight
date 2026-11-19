# System context

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

Who uses the system and which outside services it depends on.

```mermaid
flowchart LR
    visitor(["Web visitor<br/>reads forecast, spots, scorecard"])
    hunter(["App user<br/>gets alerts, reports sightings"])

    subgraph aurora["Aurora Tonight"]
        web["Website<br/>apps/web"]
        app["Mobile app<br/>apps/mobile"]
        backend["Backend<br/>Supabase"]:::planned
    end

    noaa[("NOAA SWPC<br/>Kp, OVATION, solar wind")]
    met[("MET Norway<br/>clouds, home point")]
    om[("Open-Meteo<br/>geocoding, clouds for spots")]
    osm[("OpenStreetMap<br/>viewpoints, map tiles")]
    push[("Push services<br/>FCM, APNs, Web Push")]:::planned

    visitor --> web
    hunter --> app
    web --> noaa & met & om
    app --> noaa & met & om
    web -.-> backend
    app -.-> backend
    osm -. "build time: seed spots (ADR 7)" .-> web
    backend -.-> push -.-> app

    classDef planned stroke-dasharray: 5 5
```

All forecast data is fetched directly by the client (CORS is allowed by every source), so the forecast keeps working
without a backend ([ADR 3](../adr/0003-static-hosting-and-web-first.md)). The backend only holds what users create.

---

[← All diagrams](../architecture.md)
