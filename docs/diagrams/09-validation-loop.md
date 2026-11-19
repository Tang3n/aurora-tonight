# Validation loop

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

How the model is checked against reality today, and how the same check becomes an automatic scorecard in phase 3.

```mermaid
flowchart LR
    subgraph today["Today"]
        fmi["FMI all-sky keograms<br/>Kilpisjärvi, Nov 2025–Mar 2026"] --> label["label.py<br/>aurora per hour"]
        gfz["GFZ Kp archive"] --> hind["hindcast.ts<br/>packages/model"]
        era["ERA5 clouds<br/>via Open-Meteo archive"] --> hind
        label --> eval["evaluate.py<br/>AUC, Brier skill"]
        hind --> eval
    end
    subgraph later["Phase 3: automated"]
        sched["GitHub Actions, daily<br/>same steps, more stations"]:::planned --> sc["scorecard.json<br/>published with the site"]:::planned
    end
    fmi -.-> sched
    eval --> tune["model change<br/>(new ADR if it changes behaviour)"]
    sc -.-> tune
    tune --> hind

    classDef planned stroke-dasharray: 5 5
```

Current numbers (2026-11-18): clear-sky ranking AUC 0.97; overall AUC 0.79, Brier skill +0.22 after the empirical
cloud curve. Cameras are an unbiased reference (they record every night, not only the promising ones) but cover
only the north; southern Norway stays unvalidated. See [the camera scorecard](07-camera-scorecard.md).

---

[← All diagrams](../architecture.md)
