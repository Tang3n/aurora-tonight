# 1. Record architecture decisions

- Status: Accepted
- Date: 2026-11-19

## Context

Aurora Tonight started as a static page with no backend, and many of its early decisions live only in commit
messages and `docs/spec.md`. The product is now growing into an app with accounts, user reports and server-side
alerts (see `design/app-mock/`). Decisions will be harder to reverse, and I need to be able to explain why each one
was made, including the alternatives that lost.

## Decision

Keep Architecture Decision Records in `docs/adr/`, one Markdown file per decision, numbered `NNNN-short-title.md`,
in the format of Michael Nygard:

- **Status**: Proposed, Accepted, Superseded by NNNN, or Rejected.
- **Context**: the forces at play, facts with their source and date.
- **Decision**: what we do, in active voice.
- **Alternatives**: what else was considered and why it lost.
- **Consequences**: what gets easier, what gets harder, and what must be watched.

Decisions already made in code are recorded retroactively with their original date. An accepted ADR is never
edited in substance; a change of mind is a new ADR that supersedes it. `docs/adr/README.md` is the index.

## Consequences

- One place to answer "why is it built this way?", useful for interviews as much as for future me.
- Small overhead per decision; only decisions that are costly to reverse get an ADR.
