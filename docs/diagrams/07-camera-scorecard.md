# Camera scorecard (planned, phase 3)

Part of the [architecture diagrams](../architecture.md). Mermaid sequence diagram, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

How accurate is the forecast, without users or a server ([ADR 14](../adr/0014-no-accounts-no-backend.md)): a
scheduled GitHub Action repeats what `validation/` does by hand today and publishes the result as static JSON.
Only the plan exists; which cameras can be used, and on which terms, is an open question in `spec.md`.

```mermaid
sequenceDiagram
    autonumber
    participant GA as GitHub Actions (daily)
    participant FMI as All-sky cameras<br/>(FMI keograms)
    participant GFZ as GFZ Kp + ERA5 clouds
    participant M as packages/model
    participant R as Repository (gh-pages build)
    participant W as Web + app

    GA->>FMI: yesterday's keogram per station
    GA->>GA: label hours with aurora (as validation/label.py)
    GA->>GFZ: observed Kp, reanalysis clouds
    GA->>M: score every hour of that night per station
    GA->>GA: update rolling stats: AUC, Brier skill, calibration bins, nights we got wrong
    GA->>R: commit scorecard.json, redeploy Pages
    W->>R: fetch scorecard.json (static)
```

Cameras cover northern Norway and Finland; southern Norway stays a blind spot, and the page has to say so.

---

[← All diagrams](../architecture.md)
