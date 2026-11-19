# 13. React Native with Expo as one universal app for iOS, Android and web

- Status: Proposed (if accepted, supersedes ADR 2 and ADR 5 and amends ADR 3 and ADR 11)
- Date: 2026-11-19

## Context

The app in `design/app-mock/` has six phone screens, forms, sign-in, a photo picker, maps, push notifications and
background checks. The current stack (vanilla TypeScript, ADR 2) was chosen for one static screen. The Android
build (ADR 5) wraps a WebView with Capacitor and is not yet verified on a device; there is no iOS app, and iOS web
push needs the PWA added to the home screen.

React with TypeScript is the stack I already know best, and React Native is widely used in industry, so the choice
also has portfolio value.

What the product needs from the platform:

| Need | Web (PWA) | Native |
|---|---|---|
| Push alerts | Web Push; iOS only from home screen | APNs / FCM, reliable |
| Background checks | none | `expo-background-task` (WorkManager / BGTaskScheduler) |
| Photos | file input + canvas re-encode | `expo-image-picker` + `expo-image-manipulator` (drops EXIF) |
| Maps | MapLibre GL JS | MapLibre Native (`@maplibre/maplibre-react-native`) |
| Shareable links, SEO | yes | no, needs the web |

## Options

1. **Keep vanilla TS + Capacitor** (status quo, maybe with Preact or Lit for new screens). Least work now; WebView
   app with weaker native features; iOS still unaddressed.
2. **React web (Vite) + a separate React Native app.** Best web experience and best native experience, but two UI
   codebases: every screen is written twice, in DOM and in native components.
3. **Expo universal app** (Expo Router, React Native, react-native-web). One UI codebase for iOS, Android and web;
   platform-specific files (`*.web.tsx`) only where needed.

## Decision (proposed)

Option 3, in a monorepo with npm workspaces:

```
packages/model     pure TypeScript scoring model (ADR 4), no React; tested with Vitest
packages/data      typed fetchers for NOAA, MET Norway, Open-Meteo; Supabase client and types
apps/app           Expo + Expo Router (iOS, Android, web); static web output for shareable pages
```

- Navigation and deep links via Expo Router, so `/spot/dalsnuten` is the same route on web and in the app.
- Web is exported as static HTML (`web.output: "static"`) and can still be hosted on GitHub Pages (ADR 3).
- Platform splits: the map (`Map.native.tsx` with MapLibre Native, `Map.web.tsx` with MapLibre GL JS) and the
  living-sky background (WebGL shader on web, React Native Skia runtime shader on native).
- Notifications through `expo-notifications`; the server job of ADR 11 sends to Expo's push service or straight to
  APNs/FCM, plus Web Push for browsers.
- Builds with EAS Build; Android first (Google Play one-off fee), iOS later (Apple Developer Program, yearly fee).

## Consequences

- One codebase for three platforms; screens are written once.
- A rewrite of the current UI (`src/ui/`, `src/main.ts`), and the Capacitor branch is dropped. The model,
  validation and tests carry over unchanged as `packages/model`.
- The model must run on Hermes (React Native's JS engine); check `Intl` time-zone support there, which needed a
  shim in QuickJS.
- The web bundle grows (React, react-native-web, Expo Router) compared with today's vanilla build; the desktop
  layout from the mock has to be built with responsive React Native styles, which is less flexible than CSS.
- Two map libraries and two shader implementations are the price of native maps and smooth animation.
- Migration order: monorepo and `packages/model` first, then phase 1 ("where to go", ADR 6) built directly in Expo,
  then retire the old UI once the new web reaches parity.
