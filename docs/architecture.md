# Architecture

Diagrams of how Aurora Tonight is built and how its parts talk to each other. They are written in
[Mermaid](https://mermaid.js.org/), so GitHub renders them and they change in the same commit as the code.

Legend: **solid** boxes exist today, **dashed** boxes are planned (with the phase from [`spec.md`](spec.md#phases)).
Decisions behind each picture are linked as ADRs ([index](adr/README.md)). Last updated 2026-11-19.

Contents:

1. [System context](#1-system-context)
2. [Where code runs](#2-where-code-runs)
3. [Packages and dependencies](#3-packages-and-dependencies)
4. [How the tonight score is computed](#4-how-the-tonight-score-is-computed)
5. [Where to go (phase 1)](#5-where-to-go-phase-1)
6. [Reporting a sighting (phase 3)](#6-reporting-a-sighting-phase-3)
7. [Alerts (phase 4)](#7-alerts-phase-4)
8. [Database schema (phase 3)](#8-database-schema-phase-3)
9. [Build and release](#9-build-and-release)
10. [Validation loop](#10-validation-loop)

---

## 1. System context

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
without a backend ([ADR 3](adr/0003-static-hosting-and-web-first.md)). The backend only holds what users create.

## 2. Where code runs

The same TypeScript model runs in four places ([ADR 4](adr/0004-one-typescript-model-for-all-runtimes.md)).

```mermaid
flowchart TB
    subgraph browser["Browser"]
        webapp["apps/web<br/>React (today: vanilla TS)"]
        m1["packages/model"]
        webapp --> m1
    end

    subgraph phone["Phone: Hermes JS engine"]
        mobile["apps/mobile<br/>Expo, React Native"]
        bg["background task<br/>expo-background-task, ~15 min"]:::planned
        m2["packages/model"]
        mobile --> m2
        bg --> m2
    end

    subgraph supa["Supabase (phase 3–4)"]
        direction TB
        auth["Auth"]:::planned
        db[("Postgres + PostGIS<br/>RLS")]:::planned
        store[("Storage<br/>photos")]:::planned
        fn["Edge Functions, Deno<br/>snapshot, alerts"]:::planned
        cron["pg_cron, every 10 min"]:::planned
        m3["packages/model"]:::planned
        cron --> fn --> m3
        fn --> db
    end

    subgraph gh["GitHub"]
        pages["Pages<br/>static web"]
        actions["Actions<br/>test, build, deploy"]
    end

    actions --> pages --> browser
    browser -. "supabase-js over HTTPS" .-> supa
    phone -. "supabase-js over HTTPS" .-> supa

    classDef planned stroke-dasharray: 5 5
```

## 3. Packages and dependencies

npm workspaces ([ADR 13](adr/0013-react-and-react-native-via-expo.md)). Arrows point from the user of a package to
the package. The rule that keeps sharing possible: nothing below `apps/` may import `react-dom` or `react-native`,
and `packages/model` may not touch any runtime API at all (its `tsconfig` has no DOM or Node types).

```mermaid
flowchart BT
    model["packages/model<br/>scoring, astronomy, AACGM grid<br/>deps: suncalc"]
    data["packages/data<br/>fetchers: NOAA, MET, Open-Meteo<br/>only fetch"]
    core["packages/core<br/>React hooks, TanStack Query, i18n"]:::planned
    web["apps/web<br/>Vite"]
    mobile["apps/mobile<br/>Expo"]
    validation["validation/<br/>hindcast vs all-sky camera"]
    tools["tools/gen_aacgm_grid.py<br/>Python, aacgmv2"]
    edge["supabase/functions<br/>Deno"]:::planned

    data --> model
    core -.-> data
    core -.-> model
    web --> data
    web --> model
    web -.-> core
    mobile --> model
    mobile -.-> core
    validation --> model
    edge -.-> model
    edge -.-> data
    tools -- "generates aacgmGrid.generated.ts" --> model

    classDef planned stroke-dasharray: 5 5
```

## 4. How the tonight score is computed

One hour of `buildTonight()` in `packages/model/src/night.ts`. Inputs arrive at different resolutions (1 min, 1 h,
3 h, 1° grid); the model evaluates everything at the middle of each night hour. A missing input lowers confidence
instead of failing (`missing[]`).

```mermaid
flowchart LR
    subgraph inputs["Inputs"]
        kp["Kp forecast<br/>3 h blocks, NOAA"]
        ov["OVATION grid<br/>1°, ~30–90 min ahead"]
        cl["Cloud cover<br/>low/mid/high, 1 h, MET"]
        pos["Place<br/>lat, lon"]
        t["Hour midpoint"]
    end

    subgraph geo["Geometry"]
        mag["toMagnetic<br/>AACGM-v2 grid → MLAT"]
        mlt["magneticLocalTime<br/>MLT"]
        sun["sun altitude<br/>suncalc"]
        moon["moonSkyRatio<br/>moon brightness toward the oval"]
    end

    subgraph phys["Visibility physics, visibility.ts"]
        oval["Starkov oval boundary<br/>ovalBoundary(Kp, MLT)"]
        elev["arcElevation<br/>how high above the horizon"]
        bg["skyBackground<br/>twilight + moonlight"]
        ev["expectedVisibility<br/>over the Kp distribution,<br/>extinction, contrast vs threshold"]
        ovv["ovationVisibility<br/>nowcast from the OVATION grid"]
        blend["blend by nowcastWeight<br/>fades with τ = 50 min"]
    end

    clear["clearSky<br/>empirical curve from the camera<br/>eye / camera"]
    out["HourScore<br/>eye = 100 × clear × aurora<br/>camera = max(eye, camera path)"]
    sum["labelFor, bestWindow<br/>score.ts"]

    pos --> mag --> mlt
    t --> mlt & sun & moon
    pos --> sun & moon
    kp --> ev
    mag --> oval --> ev
    mlt --> oval
    mlt --> elev --> moon
    sun --> bg
    moon --> bg --> ev
    bg --> ovv
    ov --> ovv
    ev --> blend
    ovv --> blend
    cl --> clear
    blend --> out
    clear --> out --> sum
```

Validated against the Kilpisjärvi all-sky camera; see [section 10](#10-validation-loop) and `validation/README.md`.

## 5. Where to go (phase 1)

Runs entirely in the client ([ADR 6](adr/0006-where-to-go-computed-in-the-client.md),
[ADR 7](adr/0007-spots-seeded-from-openstreetmap.md)). The expensive part, the cloud forecast for many points, is one
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

## 6. Reporting a sighting (phase 3)

The privacy rules ([ADR 10](adr/0010-location-and-photo-privacy.md)) and the trusted forecast snapshot
([ADR 9](adr/0009-sightings-as-observations-with-forecast-snapshot.md)) are enforced on the server, not only in the UI.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant A as Mobile app
    participant ST as Supabase Storage
    participant DB as Postgres (RLS)
    participant F as Edge Function<br/>snapshot

    U->>A: result (eye / camera / nothing), sky, photo, precision
    A->>A: re-encode photo to WebP ~2048 px + 400 px thumb<br/>(drops EXIF and GPS)
    A->>ST: upload to sightings/{user_id}/… (signed in)
    ST-->>A: storage keys
    A->>DB: insert sighting (policy: user_id = auth.uid())
    DB->>DB: trigger: round location to chosen precision
    DB->>F: on insert (database webhook)
    F->>F: run packages/model for that time and place
    F->>DB: update score_eye, score_camera, kp, cloud, model_version
    DB-->>A: row id
    A-->>U: "Thanks, people within 50 km get an alert"
```

## 7. Alerts (phase 4)

([ADR 11](adr/0011-server-side-alerts.md)). Forecast alerts and report alerts share one job, one cooldown and one log.

```mermaid
sequenceDiagram
    autonumber
    participant CR as pg_cron
    participant F as Edge Function<br/>alerts
    participant N as NOAA SWPC
    participant DB as Postgres + PostGIS
    participant P as Expo push / FCM / APNs / Web Push
    participant D as User's device

    CR->>F: every 10 min
    F->>N: Kp forecast + OVATION (once per run)
    F->>DB: subscribers with saved spots and preferences
    loop each subscriber (batched by region)
        F->>F: score saved spots (packages/model)
        F->>DB: count sightings ST_DWithin 50 km, last 30 min
        alt above threshold, outside quiet hours, no alert of this kind tonight
            F->>P: send
            P->>D: notification
            F->>DB: insert alerts_sent
        end
    end
```

## 8. Database schema (phase 3)

Sketch from [ADR 9](adr/0009-sightings-as-observations-with-forecast-snapshot.md); the real schema will live in
`supabase/migrations/`. Every table has RLS: public read of rows that are not hidden, writes only by the owner.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1:1, cascade delete"
    PROFILES ||--o{ SIGHTINGS : reports
    PROFILES ||--o{ SAVED_SPOTS : saves
    PROFILES ||--o{ PUSH_SUBSCRIPTIONS : has
    PROFILES ||--o{ ALERTS_SENT : receives
    PROFILES ||--o{ FLAGS : raises
    SPOTS ||--o{ SIGHTINGS : "at (optional)"
    SPOTS ||--o{ SAVED_SPOTS : "saved as"
    SIGHTINGS ||--o{ PHOTOS : has
    SIGHTINGS ||--o{ FLAGS : "flagged by"

    PROFILES {
        uuid id PK "= auth.users.id"
        text handle UK
        timestamptz created_at
    }
    SPOTS {
        bigint id PK
        text name
        geography location "Point, GiST index"
        text source "osm | user"
        bigint osm_id
        real north_view_deg
        smallint bortle
        uuid created_by FK
        bool hidden
    }
    SIGHTINGS {
        bigint id PK
        uuid user_id FK
        bigint spot_id FK
        timestamptz observed_at
        geography location "rounded to precision"
        text precision "spot | 1km | 10km"
        text result "eye | camera | none"
        text sky "clear | partly | overcast"
        text note
        smallint score_eye "server snapshot"
        smallint score_camera "server snapshot"
        real kp
        real cloud
        text model_version
        bool hidden
    }
    PHOTOS {
        bigint id PK
        bigint sighting_id FK
        text storage_key
        text thumb_key
        int width
        int height
        real exposure_s
        int iso
        real focal_mm
    }
    SAVED_SPOTS {
        uuid user_id PK
        bigint spot_id PK
    }
    PUSH_SUBSCRIPTIONS {
        bigint id PK
        uuid user_id FK
        text platform "web | android | ios"
        text endpoint_or_token
    }
    ALERTS_SENT {
        bigint id PK
        uuid user_id FK
        text kind "forecast | nearby"
        timestamptz sent_at
        jsonb payload
    }
    FLAGS {
        bigint id PK
        bigint sighting_id FK
        uuid reporter_id FK
        text reason
    }
```

## 9. Build and release

```mermaid
flowchart LR
    dev["git push"] --> branch{"branch?"}
    branch -- main --> ci["GitHub Actions<br/>npm ci → npm test → npm run build"]
    ci --> pagesdeploy["upload apps/web/dist → GitHub Pages"]
    branch -- other --> none["no deploy"]

    dev2["release the app"] --> eas["EAS Build<br/>AAB / IPA"]:::planned
    eas --> stores["Google Play, App Store"]:::planned
    dev3["JS-only fix"] --> upd["EAS Update<br/>same runtimeVersion only"]:::planned
    local["local: expo prebuild + gradlew<br/>APK for testing"] --> phone["phone / emulator"]

    classDef planned stroke-dasharray: 5 5
```

`android/` and `ios/` in `apps/mobile` are generated by `expo prebuild` from `app.json` and are not committed.

## 10. Validation loop

How the model is checked against reality today, and how user reports will join in phase 4.

```mermaid
flowchart LR
    subgraph today["Today"]
        fmi["FMI all-sky keograms<br/>Kilpisjärvi, Nov 2025–Mar 2026"] --> label["label.py<br/>aurora per hour"]
        gfz["GFZ Kp archive"] --> hind["hindcast.ts<br/>packages/model"]
        era["ERA5 clouds<br/>via Open-Meteo archive"] --> hind
        label --> eval["evaluate.py<br/>AUC, Brier skill"]
        hind --> eval
    end
    subgraph later["Phase 4"]
        rep["sightings incl. 'nothing'<br/>+ stored forecast snapshot"]:::planned --> sc["scorecard<br/>calibration per region"]:::planned
    end
    eval --> tune["model change<br/>(new ADR if it changes behaviour)"]
    sc -.-> tune
    tune --> hind

    classDef planned stroke-dasharray: 5 5
```

Current numbers (2026-11-18): clear-sky ranking AUC 0.97; overall AUC 0.79, Brier skill +0.22 after the empirical
cloud curve. Reporters choose promising nights, so report-based calibration is biased; the camera stays the
unbiased reference.
