# System context

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

Who uses the system and which outside services it depends on. There is no backend: the website and the app talk
only to public data sources ([ADR 3](../adr/0003-static-hosting-and-web-first.md),
[ADR 14](../adr/0014-no-accounts-no-backend.md)).

```mermaid
flowchart LR
    visitor(["Web visitor<br/>forecast, where to go"])
    user(["App user<br/>forecast, where to go, alerts"])

    subgraph aurora["Aurora Tonight (no accounts, no server)"]
        web["Website<br/>apps/web, static on GitHub Pages"]
        app["Mobile app<br/>apps/mobile, Expo"]
        job["Scheduled GitHub Action<br/>camera scorecard"]:::planned
    end

    noaa[("NOAA SWPC<br/>Kp, OVATION, solar wind")]
    met[("MET Norway<br/>clouds, home point")]
    om[("Open-Meteo<br/>geocoding, clouds for spots")]
    tiles[("OpenFreeMap<br/>map tiles")]
    osm[("OpenStreetMap<br/>viewpoints")]
    cams[("All-sky cameras<br/>FMI keograms")]:::planned

    visitor --> web
    user --> app
    web --> noaa & met & om & tiles
    app --> noaa & met & om & tiles
    app -- "spots JSON" --> web
    osm -. "build time: tools/fetch_spots.py (ADR 7)" .-> web
    cams -.-> job -. "static scorecard JSON" .-> web

    classDef planned stroke-dasharray: 5 5
```

All forecast data is fetched directly by the client (every source allows CORS or, in the app, plain HTTPS), so
nothing personal is stored anywhere but on the user's own device.

---

[← All diagrams](../architecture.md)
