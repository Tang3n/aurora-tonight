# 5. Android app via Capacitor and Background Runner

- Status: Superseded by ADR 13 (was implemented on branch `worktree-android-app`, never merged)
- Date: 2026-11-19

## Context

The first request for a phone app was "just an app on my Android phone with notifications, no link to the web".
A browser tab cannot check the forecast while closed, so notifications need either native background work or a
server sending push messages. There was no server.

## Decision

Wrap the existing web app with Capacitor 8 and use `@capacitor/background-runner` 3: a QuickJS script, scheduled by
Android WorkManager roughly every 15 minutes, fetches the data, runs the shared model (ADR 4) and posts a local
notification. Logic is in `src/background/notify.ts`, the runner entry in `src/background/runner.ts`, built with
`vite.runner.config.ts`. `npm run android:apk` builds the APK.

## Alternatives

- **Kotlin native app**: best platform integration, but a second implementation of UI and model.
- **React Native / Flutter**: a rewrite of the UI for no product gain.
- **Server push only**: needs a backend, which did not exist at the time.

## Consequences

- One codebase for web and Android; the APK is a thin shell.
- WorkManager does not guarantee timing; Doze can delay checks. Good enough for a forecast that changes hourly, not
  for "someone sees it right now" alerts. Those come from the server (ADR 11).
- When server alerts exist, the runner stays as the no-account fallback; FCM handles signed-in users.
- Still unverified on a real device (the local emulator crashes at boot).
