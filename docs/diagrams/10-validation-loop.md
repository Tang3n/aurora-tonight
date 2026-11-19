# Validation loop

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

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

---

[← All diagrams](../architecture.md)
