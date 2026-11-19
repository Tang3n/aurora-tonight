# 2. Vanilla TypeScript and Vite, no UI framework

- Status: Superseded by ADR 13 (accepted 2026-11-18, retroactive)
- Date: 2026-11-18

## Context

The first version is one screen: a verdict, a timeline, factor cards, an oval map and a WebGL sky. Most of the code
is the scoring model and astronomy, not UI. The bundle already carries a ~100 kB AACGM grid, so every extra kilobyte
of runtime matters on a phone outdoors at night with weak signal.

## Decision

Use TypeScript (strict) with Vite as the bundler and dev server, and no UI framework. UI is plain DOM rendering in
`src/ui/`; state is the result of one model run. Tests use Vitest.

## Alternatives

- **React / Preact**: familiar, but adds a runtime and a component layer for a page that re-renders once per data
  refresh.
- **Svelte / Solid**: small output, but a new toolchain to learn for little gain at this size.

## Consequences

- Small bundle, no framework upgrades to chase.
- The mock in `design/app-mock/` has six screens, forms and auth. Hand-written DOM will not scale to that cleanly.
  Revisit when phase 2 (accounts and reports) starts: a lightweight framework such as Preact or Lit for the new
  screens is the likely successor ADR. The model code is framework-independent either way.
