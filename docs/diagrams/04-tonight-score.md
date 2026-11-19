# How the tonight score is computed

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

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

Validated against the Kilpisjärvi all-sky camera; see [the validation loop](09-validation-loop.md) and `validation/README.md`.

---

[← All diagrams](../architecture.md)
