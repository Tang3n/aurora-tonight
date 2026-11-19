# Database schema (phase 3)

> **Archived 2026-11-19.** Not built: accounts and the backend were dropped in [ADR 14](../../adr/0014-no-accounts-no-backend.md). Kept as the design that was considered.

Part of the [architecture diagrams](../../architecture.md). Mermaid ER diagram, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

Sketch from [ADR 9](../../adr/0009-sightings-as-observations-with-forecast-snapshot.md); the real schema will live in
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

---

[← All diagrams](../../architecture.md)
