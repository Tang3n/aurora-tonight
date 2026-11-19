# 11. Server-side alerts with a scheduled job and push

- Status: Superseded by ADR 14 (accepted 2026-11-19, withdrawn the same day: no accounts, no backend)
- Date: 2026-11-19

## Context

Two kinds of alert are planned (mock, screen 5): "a good night within 1 h drive" (forecast based) and "2+ sightings
within 50 km in 30 minutes" (report based). The Android background runner (ADR 5) can do the first on the device
but cannot know about other people's reports, and a browser tab cannot run in the background at all.

## Decision

- A Supabase Edge Function runs every 10 minutes (triggered by `pg_cron`):
  1. fetches space weather once, runs the shared model (ADR 4) for each subscribed user's saved spots,
  2. counts recent sightings near each subscriber with `ST_DWithin`,
  3. applies thresholds, quiet hours and a cooldown (at most one alert per kind per night),
  4. sends Web Push (VAPID) to browsers and installed PWAs, and FCM to the Android app.
- Subscriptions (`push_subscriptions`: user, endpoint or FCM token, platform) and preferences live in the database.
- Every sent alert is logged (`alerts_sent`), which feeds the scorecard ("we alerted, did people see it?").

## Alternatives

- **Device-only alerts**: no server cost, but no report-based alerts and nothing on iOS or desktop.
- **A third-party push service** (OneSignal and similar): less code, but another account, and alert data leaves the
  project.

## Consequences

- One alert logic for all platforms.
- Adds Firebase (only for FCM) to the Android build.
- iOS users get alerts only after adding the PWA to the home screen (ADR 3).
- Edge Function runtime limits apply; the job must stay small (batch users by region, cache space-weather data for
  the run).
