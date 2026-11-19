# Packages and dependencies

Part of the [architecture diagrams](../architecture.md). Mermaid flowchart, rendered in place on the
repository page. Legend: **solid** = exists today, **dashed** = planned.

npm workspaces ([ADR 13](../adr/0013-react-and-react-native-via-expo.md)). Arrows point from the user of a package to
the package. The rule that keeps sharing possible: nothing below `apps/` may import `react-dom` or `react-native`,
and `packages/model` may not touch any runtime API at all (its `tsconfig` has no DOM or Node types).

```mermaid
flowchart BT
    model["packages/model<br/>scoring, astronomy, AACGM grid<br/>deps: suncalc"]
    data["packages/data<br/>fetchers: NOAA, MET, Open-Meteo<br/>only fetch"]
    core["packages/core<br/>React hooks, TanStack Query,<br/>view model, i18n"]
    web["apps/web<br/>React + Vite"]
    mobile["apps/mobile<br/>Expo"]
    validation["validation/<br/>hindcast vs all-sky camera"]
    tools["tools/gen_aacgm_grid.py<br/>Python, aacgmv2"]
    edge["supabase/functions<br/>Deno"]:::planned

    data --> model
    core --> data
    core --> model
    web --> data
    web --> model
    web --> core
    mobile --> model
    mobile -.-> core
    validation --> model
    edge -.-> model
    edge -.-> data
    tools -- "generates aacgmGrid.generated.ts" --> model

    classDef planned stroke-dasharray: 5 5
```

---

[← All diagrams](../architecture.md)
