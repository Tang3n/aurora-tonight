# Where code runs

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

The same TypeScript model runs in every place that needs a score
([ADR 4](../adr/0004-one-typescript-model-for-all-runtimes.md)). No server of our own
([ADR 14](../adr/0014-no-accounts-no-backend.md)).

```mermaid
flowchart TB
    subgraph browser["Browser"]
        webapp["apps/web<br/>React"]
        m1["packages/model + core"]
        webapp --> m1
    end

    subgraph phone["Phone: Hermes JS engine"]
        mobile["apps/mobile<br/>Expo, React Native"]
        bg["background check<br/>expo-background-task, ~15 min"]
        store[("kv-store<br/>settings on the device")]
        m2["packages/model + core"]
        mobile --> m2
        bg --> m2
        mobile --- store
        bg --- store
    end

    subgraph gh["GitHub"]
        pages["Pages<br/>static web + spots JSON"]
        actions["Actions<br/>typecheck, test, build, deploy"]
        sched["Actions on a schedule<br/>camera scorecard"]:::planned
        m3["packages/model"]:::planned
        sched -.-> m3
    end

    actions --> pages --> browser
    pages -- "spots JSON" --> phone
    sched -. "scorecard JSON" .-> pages

    classDef planned stroke-dasharray: 5 5
```

---

[← All diagrams](../architecture.md)
