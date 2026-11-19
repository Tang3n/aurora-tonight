# 13. React on the web, React Native with Expo on mobile, shared logic in packages

- Status: Accepted (supersedes ADR 2 and ADR 5; amends ADR 3; amended by ADR 14: no backend)
- Date: 2026-11-19

## Context

The app in `design/app-mock/` has six phone screens, forms, sign-in, a photo picker, maps, push notifications and
background checks, plus three desktop web pages. The current stack (vanilla TypeScript, ADR 2) was chosen for one
static screen. The Android build (ADR 5) wraps a WebView with Capacitor, is unverified on a device, and there is no
iOS app.

React with TypeScript is the stack I know best, and React Native is widely used in industry.

The web and the app do different jobs:

- **Web**: the public, read-mostly layer: tonight's forecast, "where to go", spot pages and the scorecard. These are
  shared as links and opened on laptops, so they need real HTML per URL, link previews and a desktop layout.
- **Mobile app**: the action layer: alerts, reporting with a photo from the spot, the journal, saved spots and
  background checks. These need native push, background tasks and the camera roll.

What the product needs from the platform:

| Need | Web | Native |
|---|---|---|
| Push alerts | Web Push; iOS only from home screen | APNs / FCM via `expo-notifications` |
| Background checks | none | `expo-background-task` (WorkManager / BGTaskScheduler) |
| Photos | file input + canvas re-encode | `expo-image-picker` + `expo-image-manipulator` (drops EXIF) |
| Maps | MapLibre GL JS | MapLibre Native (`@maplibre/maplibre-react-native`) |
| Shareable links, previews | yes | no, relies on the web |

## Options

1. **Keep vanilla TS + Capacitor.** Least work now; WebView app with weak native features; iOS still unaddressed.
2. **React web + React Native app, shared logic in packages.** Native where it matters, plain web where it matters;
   rendering components are written per platform.
3. **One Expo universal app** (react-native-web for the browser). Screens written once, but the web becomes a
   React Native app in a browser: bigger bundle, layout limited to React Native styles, harder to keep the CSS
   desktop layout and the WebGL sky.

## Decision

Option 2, in a monorepo with npm workspaces:

```
packages/model     pure TypeScript scoring model (ADR 4); no React; Vitest
packages/data      typed fetchers (NOAA, MET Norway, Open-Meteo), Supabase client and generated DB types
packages/core      React hooks and state shared by both apps: useTonight, useSpotRanking, useReportForm,
                   alert preferences, i18n tables; TanStack Query for fetching and caching; no DOM, no native views
apps/web           Vite + React + React Router (static prerender for spot pages and the scorecard), CSS,
                   MapLibre GL JS, WebGL living-sky shader; deployed to GitHub Pages
apps/mobile        Expo + Expo Router, MapLibre Native, React Native Skia for the sky shader,
                   expo-notifications, expo-background-task, expo-image-picker; built with EAS Build
```

Rules:

- `packages/core` may import React but never `react-dom` or `react-native`. Anything that touches the screen lives
  in an app. This is where the sharing comes from: both apps call the same hooks and only render differently.
- URLs match across platforms (`/spot/:id`, `/scorecard`). Android App Links (`assetlinks.json` on the web) open
  the app when it is installed, iOS Universal Links later.
- Reporting and the journal ship in the app first; the web gets read-only views and a "report in the app" prompt.
  A web report form can follow later, reusing `useReportForm`.

## Consequences

- Each platform uses its native strengths; the live web is rewritten in React but keeps its CSS, shader and size
  budget close to today's.
- Rendering code is written twice for screens that exist on both platforms (mainly Tonight and the map). Keeping
  logic in `packages/core` keeps that duplication to markup and styles.
- The Capacitor branch is retired. The model, validation and tests carry over unchanged into `packages/model`.
- The model must also run on Hermes (React Native's engine); verify `Intl.DateTimeFormat` with `timeZone` there
  (QuickJS needed a shim, `src/background/shims.ts`).
- Two map libraries and two shader implementations are the price of native maps and animation.
- Builds: Android via a development build over USB (the local emulator crashes); iOS only through EAS Build and an
  Apple Developer account, so iOS comes after Android.
- Migration order: (1) monorepo with `packages/model` and `packages/data`, existing web moved to `apps/web`
  unchanged; (2) web UI rewritten in React, phase 1 "where to go" built there; (3) `apps/mobile` with Expo;
  (4) backend features (ADR 8–11) on both.
