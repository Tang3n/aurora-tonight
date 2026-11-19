# 4. One TypeScript scoring model for every runtime

- Status: Accepted
- Date: 2026-11-19

## Context

The visibility model (`src/model/`: AACGM, Starkov oval, extinction, moon and twilight contrast, empirical cloud
curve) is the core of the product and is validated against the Kilpisjärvi camera (`validation/`). It must run in:

1. the browser (forecast, "where to go" grid),
2. the Android background runner (QuickJS, branch `worktree-android-app`),
3. a server job for alerts and for the forecast snapshot stored with each report (ADR 9, ADR 11).

Two implementations of the model would drift apart, and the scorecard would then compare reports against a forecast
the user never saw.

## Decision

Keep exactly one implementation of the model, in TypeScript, in `src/model/`, with these rules:

- Pure functions, no DOM, no `fetch`, no Node-only APIs. Inputs (Kp distribution, OVATION grid, clouds, time,
  position) come in as plain data.
- Polyfill only what a runtime lacks, in a thin shim (as `src/background/shims.ts` does for `atob` and `Intl`).
- Every result carries a `modelVersion` (git tag or short hash) so stored snapshots can be traced to code.
- Tests for each runtime: Vitest in Node, plus the existing QuickJS WASM test for the runner. Deno (Supabase Edge
  Functions) gets a smoke test when the server job is written.

## Alternatives

- **Port the model to Kotlin/Python for the server**: more natural for some backends, but doubles the code and the
  validation effort.
- **Compute only on the client and upload the score with the report**: simplest, but trusts the client and fails
  for alerts, which must run when nobody has the app open.

## Consequences

- One place to fix a bug or recalibrate.
- The model's dependencies stay minimal (today `suncalc` and the generated AACGM grid); anything heavy must be
  justified for all three runtimes.
