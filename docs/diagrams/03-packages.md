# Packages and dependencies

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

npm workspaces ([ADR 13](../adr/0013-react-and-react-native-via-expo.md)). Arrows point from the user of a package to
the package. The rule that keeps sharing possible: nothing below `apps/` may import `react-dom` or `react-native`
(`packages/core/src/platform.test.ts` checks it), and `packages/model` may not touch any runtime API at all (its
`tsconfig` has no DOM or Node types).

```mermaid
flowchart BT
    model["packages/model<br/>scoring, astronomy, AACGM grid<br/>deps: suncalc"]
    data["packages/data<br/>fetchers: NOAA, MET, Open-Meteo, spots<br/>only fetch"]
    core["packages/core<br/>React hooks, TanStack Query,<br/>view model, i18n, spot ranking, alert decision"]
    web["apps/web<br/>React + Vite"]
    mobile["apps/mobile<br/>Expo"]
    validation["validation/<br/>hindcast vs all-sky camera"]
    tools["tools/<br/>AACGM grid, OSM spots (Python)"]
    scorecard["scorecard job<br/>GitHub Actions"]:::planned

    data --> model
    core --> data
    core --> model
    web --> core
    web --> data
    web --> model
    mobile --> core
    mobile --> data
    mobile --> model
    validation --> model
    scorecard -.-> model
    tools -- "aacgmGrid.generated.ts" --> model
    tools -- "public/spots/*.json" --> web

    classDef planned stroke-dasharray: 5 5
```

---

[← All diagrams](../architecture.md)
