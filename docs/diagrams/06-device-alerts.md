# Alerts on the device

Part of the [architecture diagrams](../architecture.md). Mermaid sequence diagram, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

The app's alerts need no server ([ADR 14](../adr/0014-no-accounts-no-backend.md)). Code:
`apps/mobile/src/background/task.ts` (fetch, compute, notify) and `decideAlert` in
`packages/core/src/alerts.ts` (unit-tested). Built and emulator-tested 2026-11-19.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant A as App (Alerts tab)
    participant WM as Android WorkManager
    participant T as Background task (JS, Hermes)
    participant KV as kv-store on the phone
    participant D as NOAA + MET Norway
    participant N as Local notification

    U->>A: turn alerts on, threshold 50
    A->>A: ask notification permission
    A->>KV: save { enabled, threshold }
    A->>WM: registerTaskAsync(minimumInterval 15 min)
    Note over WM: scheduled when the app goes to the background,<br/>runs only when battery and network allow
    loop about every 15 minutes
        WM->>T: run
        T->>KV: read place, language, threshold, last alert night
        T->>D: Kp forecast + MET clouds (no 1 MB OVATION grid)
        D-->>T: data
        T->>T: buildTonight + buildViewModel (packages/model, core)
        T->>T: decideAlert: enabled? already sent tonight?<br/>score ≥ threshold? window not over?
        alt notify
            T->>N: "Aurora tonight: 62 · Good" + best window
            T->>KV: last alert night = tonight
        end
        T->>KV: last check (time, score, reason)
    end
    U->>A: open Alerts tab
    A->>KV: show last check and last alert
```

Testing on an emulator: `apps/mobile/README.md` (force the WorkManager job with `cmd jobscheduler run`).

---

[← All diagrams](../architecture.md)
