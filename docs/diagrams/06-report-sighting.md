# Reporting a sighting (phase 3)

Part of the [architecture diagrams](../architecture.md). Mermaid sequence diagram, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

The privacy rules ([ADR 10](../adr/0010-location-and-photo-privacy.md)) and the trusted forecast snapshot
([ADR 9](../adr/0009-sightings-as-observations-with-forecast-snapshot.md)) are enforced on the server, not only in the UI.

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

---

[← All diagrams](../architecture.md)
