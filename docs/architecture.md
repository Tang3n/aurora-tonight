# Architecture

How Aurora Tonight is built and how its parts talk to each other. Each diagram is its own Markdown file in
[`diagrams/`](diagrams/), written in [Mermaid](https://mermaid.js.org/), so the repository page renders it and it
changes in the same commit as the code it describes.

In one sentence: a static React website and an Expo app share one TypeScript model and one React logic package,
read public data directly, and have no backend or accounts ([ADR 14](adr/0014-no-accounts-no-backend.md)).

Legend in every diagram: **solid** boxes exist today, **dashed** boxes are planned (phases in
[`spec.md`](spec.md#phases)). The reasons behind each picture are in the [ADRs](adr/README.md); the stack is listed
in [`tech-stack.md`](tech-stack.md). Last updated 2026-11-19.

| # | Diagram | Type | Shows | Status |
|---|---|---|---|---|
| 1 | [System context](diagrams/01-system-context.md) | flowchart | users, the site and app, outside services | built |
| 2 | [Where code runs](diagrams/02-runtimes.md) | flowchart | browser, phone, GitHub; the model in each | built |
| 3 | [Packages and dependencies](diagrams/03-packages.md) | flowchart | npm workspaces and who imports whom | built |
| 4 | [How the tonight score is computed](diagrams/04-tonight-score.md) | flowchart | data flow through `buildTonight()` | built |
| 5 | [Where to go](diagrams/05-where-to-go.md) | sequence | ranking spots in the client | built |
| 6 | [Alerts on the device](diagrams/06-device-alerts.md) | sequence | WorkManager → task → decision → notification | built |
| 7 | [Camera scorecard](diagrams/07-camera-scorecard.md) | sequence | scheduled GitHub Action, static JSON | planned (phase 3) |
| 8 | [Build and release](diagrams/08-build-and-release.md) | flowchart | CI, Pages, EAS, local APK | built / partly planned |
| 9 | [Validation loop](diagrams/09-validation-loop.md) | flowchart | camera hindcast, then automated | built / planned |

Archived (designed, then dropped with ADR 14): [reporting a sighting](diagrams/archive/06-report-sighting.md),
[server-side alerts](diagrams/archive/07-server-alerts.md), [database schema](diagrams/archive/08-database-schema.md).

Related records: [spike 2026-11-19](spikes/2026-11-19-expo-hermes-maplibre.md) (model on Hermes, MapLibre in Expo),
[mobile app README](../apps/mobile/README.md) (build, testing, gotchas).

## Keeping diagrams current

- A change to architecture updates the affected diagram in the same commit; a new decision gets an ADR and, if it
  changes a picture, the diagram links to it.
- One diagram per file, named `NN-topic.md`; add a row to the table above. Dropped designs move to `diagrams/archive/`.
- Check that a diagram renders before committing (the Mermaid live editor at https://mermaid.live, or the repository
  preview).
