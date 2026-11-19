# Where code runs

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

The same TypeScript model runs in four places ([ADR 4](../adr/0004-one-typescript-model-for-all-runtimes.md)).

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

---

[← All diagrams](../architecture.md)
