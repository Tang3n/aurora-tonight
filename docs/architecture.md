# Architecture

How Aurora Tonight is built and how its parts talk to each other. Each diagram is its own Markdown file in
[`diagrams/`](diagrams/), written in [Mermaid](https://mermaid.js.org/), so the repository page renders it and it
changes in the same commit as the code it describes.

Legend in every diagram: **solid** boxes exist today, **dashed** boxes are planned (phases in
[`spec.md`](spec.md#phases)). The reasons behind each picture are in the [ADRs](adr/README.md); the stack is listed
in [`tech-stack.md`](tech-stack.md). Last updated 2026-11-19.

| # | Diagram | Type | Shows | Phase |
|---|---|---|---|---|
| 1 | [System context](diagrams/01-system-context.md) | flowchart | users, the app, outside services | all |
| 2 | [Where code runs](diagrams/02-runtimes.md) | flowchart | browser, phone, Supabase, GitHub; the model in each | all |
| 3 | [Packages and dependencies](diagrams/03-packages.md) | flowchart | npm workspaces and who imports whom | now |
| 4 | [How the tonight score is computed](diagrams/04-tonight-score.md) | flowchart | data flow through `buildTonight()` | now |
| 5 | [Where to go](diagrams/05-where-to-go.md) | sequence | ranking spots in the client | 1 |
| 6 | [Reporting a sighting](diagrams/06-report-sighting.md) | sequence | photo, privacy, server snapshot | 3 |
| 7 | [Alerts](diagrams/07-alerts.md) | sequence | scheduled job and push | 4 |
| 8 | [Database schema](diagrams/08-database-schema.md) | ER | tables and relations | 3 |
| 9 | [Build and release](diagrams/09-build-and-release.md) | flowchart | CI, Pages, EAS, local APK | now / 2 |
| 10 | [Validation loop](diagrams/10-validation-loop.md) | flowchart | camera hindcast, later user reports | now / 4 |

Related records: [spike 2026-11-19](spikes/2026-11-19-expo-hermes-maplibre.md) (model on Hermes, MapLibre in Expo).

## Keeping diagrams current

- A change to architecture updates the affected diagram in the same commit; a new decision gets an ADR and, if it
  changes a picture, the diagram links to it.
- One diagram per file, named `NN-topic.md`; add a row to the table above.
- Check that a diagram renders before committing (the Mermaid live editor at https://mermaid.live, or the repository
  preview).
