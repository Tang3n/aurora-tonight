# 14. No accounts and no backend: a static website and a self-contained app

- Status: Accepted (supersedes ADR 8, 9, 10, 11 and 12; amends ADR 3 and ADR 13)
- Date: 2026-11-19

## Context

ADRs 8–12 planned phase 3–4: Supabase accounts, sightings with photos, a journal, moderation, server-side push
alerts and a scorecard built from user reports. After phases 1 and 2 were built (web in React with "where to go",
and an Expo app with device-side alerts), it was clear what that plan would cost:

- a backend to run and secure (RLS policies, backups, the free plan pausing after a week of inactivity);
- GDPR work: privacy policy, EXIF stripping, location rounding, account deletion;
- moderation of photos from strangers;
- a cold start: reports only matter once many people send them.

None of it is needed to answer the product's question, "is it worth going out tonight, when and where?". The
forecast, the spot ranking and the alerts already run entirely on the client.

## Decision

Keep Aurora Tonight free of accounts and servers:

- **Website**: static files on GitHub Pages (ADR 3). Tonight and Where to go.
- **Mobile app**: Expo app (ADR 13) with Tonight, Where to go and **device-side alerts** (`expo-background-task`
  + local notifications). It keeps its settings on the phone and talks only to the public data sources.
- No accounts, no user-generated content, no database, no push server.
- **Accuracy without users (future)**: a scorecard built automatically from public all-sky cameras (the same
  keograms `validation/` already reads), regenerated on a schedule by GitHub Actions and published as static
  JSON next to the site. Still no backend.

ADRs 8–12 are kept as records of the alternative that was considered and why it lost; they are marked
superseded rather than deleted.

## Consequences

- Almost nothing to operate: no database, no secrets, no personal data, no moderation. GDPR scope shrinks to
  "the app sends coordinates to weather APIs", stated in the app's permission text.
- The main differentiator from community apps changes: no "saw nothing" reports from the south. The scorecard
  must come from cameras, which cover northern Norway and Finland well and southern Norway hardly at all.
- Alerts are forecast-only ("a good night is coming"); "people near you see it right now" is gone.
- Diagrams 06 (reporting), 07 (server alerts) and 08 (database schema) move to `docs/diagrams/archive/`.
- If community features are ever wanted again, ADRs 8–12 are the starting point.
