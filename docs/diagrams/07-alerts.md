# Alerts (phase 4)

Part of the [architecture diagrams](../architecture.md). Mermaid sequence diagram, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

([ADR 11](../adr/0011-server-side-alerts.md)). Forecast alerts and report alerts share one job, one cooldown and one log.

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

---

[← All diagrams](../architecture.md)
