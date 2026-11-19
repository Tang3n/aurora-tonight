# Aurora Tonight — mobile app (Expo)

React Native app for Android (iOS later), built with Expo SDK 58 and Expo Router
([ADR 13](../../docs/adr/0013-react-and-react-native-via-expo.md)). It shares the model, the data fetchers, the
hooks, the view model, the "where to go" ranking and the alert decision with the website through `packages/*`;
only rendering and platform glue live here.

## Screens

| Route | File | What |
|---|---|---|
| Tonight | `src/app/(tabs)/index.tsx` | verdict, hourly timeline, factors, solar wind, next nights |
| Where to go | `src/app/(tabs)/go.tsx` | OSM viewpoints on a MapLibre Native map, ranked (spots JSON from the website) |
| Alerts | `src/app/(tabs)/alerts.tsx` | on/off, threshold 30 / 50 / 70, last check, test notification |
| Place | `src/app/place.tsx` | modal: search (Open-Meteo geocoding) or coarse GPS |
| Debug | `src/app/debug.tsx` | model-vs-Node checks from the spike, dry run of the alert check |

## Background alerts

`src/background/task.ts` is defined at module scope (imported first by `index.ts`). `expo-background-task` runs
it through Android WorkManager about every 15 minutes when battery and network allow; the worker is scheduled
once the app goes to the background. Each run fetches Kp and MET clouds for the saved place (not the 1 MB
OVATION grid), builds tonight with `packages/model`, and `decideAlert` (`packages/core/src/alerts.ts`) decides:
at most one notification per night, only above the threshold, only before the best window ends.

## Build and run (Linux, Android)

```sh
export ANDROID_HOME=$HOME/Android/Sdk          # Gradle needs it; without it: "SDK location not found"
cd apps/mobile
npx expo prebuild --platform android --clean     # generates android/ from app.json (not committed)
cd android && ./gradlew assembleRelease          # add -PreactNativeArchitectures=x86_64 for the emulator only
adb install -r app/build/outputs/apk/release/app-release.apk
```

Release builds bundle the JS as Hermes bytecode, as in production. For live reload during development use a
development build and `npx expo start` instead.

## Testing on the emulator

```sh
# the WorkManager job appears after the app goes to the background
adb shell dumpsys jobscheduler | grep "JOB .*tang3n.aurora/"
# run it now (WorkManager jobs live in their own namespace)
adb shell cmd jobscheduler run -f -n androidx.work.systemjobscheduler <package> <job id>
```

The Alerts screen then shows the time, score and reason of that check.

## Gotchas found on 2026-11-19

- **R8 vs WorkManager.** The minified release build crashed at start with
  `NoSuchMethodException: androidx.work.impl.WorkDatabase_Impl.<init>`: Room creates its database by
  reflection and R8 removed the constructor. Fixed with a keep rule through `expo-build-properties`
  (`extraProguardRules` in `app.json`).
- **MET Norway needs a User-Agent.** React Native sends `okhttp/…`, which MET answers with 403. `src/net.ts`
  calls `setClientIdentity` from `packages/data` before anything else; the web does not, because browsers
  send their own User-Agent.
- **Focus is not foreground.** A tab that stays selected does not refocus when the app returns from the
  background; the Alerts screen also listens to `AppState` to re-read what the background task wrote.

Permissions: coarse location and notifications only. Fine location, storage and overlay permissions from the
template are blocked in `app.json` (`blockedPermissions`), in line with ADR 10.
