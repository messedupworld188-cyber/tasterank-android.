# TasteRank

A native Android app for rating and ranking energy drinks, protein bars, snacks, restaurants and anything else you try. Built with Expo SDK 58, React Native 0.88 and TypeScript — not a website or WebView wrapper.

Every rating saves on-device, ranking itself automatically. No login, no backend, no paid API, fully offline.

## Design

- Dark charcoal surfaces (`#101318`) with a single electric lime accent (`#C4FF54`)
- Space Grotesk typography, high-contrast text, rounded cards and generous spacing
- Native stack transitions, spring-press feedback and light haptics on real interactions
- Safe-area aware for edge-to-edge Android, tuned for Galaxy-sized phones

## Screens

| Screen | What it does |
| --- | --- |
| **Home** | Greeting, your #1 pick, rating/average/category stats, favourite category, top-rated carousel, recent ratings, quick add |
| **Rankings** | Live leaderboard with numbered positions, product search, category filter, four sort modes, share-as-text |
| **Rate** | Product name, brand, flavour, category, score 0.0–10.0 (0.1 steps), optional photo from camera or library, written review |
| **Item details** | Full-bleed photo or category artwork, score, verdict, review, dates, working edit/delete/share |
| **Edit** | Same form pre-filled, plus delete, presented as a native modal |
| **Insights** | Totals, averages, score distribution, category averages, top-rated items, favourite category |
| **Settings** | Load/remove demo ratings, share rankings, delete all data, storage and offline notes |

## Project structure

```
src/
  app/                    Expo Router routes
    _layout.tsx           Fonts, providers, root stack
    (tabs)/               Bottom tabs: Home, Rankings, Rate, Insights
    item/[id].tsx         Item details
    edit/[id].tsx         Edit modal
    settings.tsx          Settings modal
  components/             Reusable UI (buttons, chips, cards, score controls, form, cards)
    ui/                   Design-system primitives
  constants/              Theme tokens and category metadata
  data/demo.ts            Removable demo ratings
  lib/                    Storage, photo persistence, stats, search/sort, share, haptics
  store/RatingsProvider.tsx  App-wide ratings store backed by AsyncStorage
  types.ts                Rating model
```

## Persistence

- Ratings are stored as a versioned JSON envelope in AsyncStorage under `@tasterank/ratings:v1`, written after every change. Reading is defensive: corrupt or partial data is discarded per-entry instead of crashing.
- Picked photos are copied into the app's private documents directory (`rating-photos/`) when a rating is saved, so they survive restarts and gallery cleanup. Replaced or deleted ratings have their photo files removed too.
- Demo ratings are tagged and can be removed in Settings without touching real ratings.
- Uninstalling the app removes its private storage.

## Run and check locally

```bash
npm install
npx expo start          # scan the QR code with Expo Go (SDK 58)
npm run typecheck       # tsc --noEmit
npx expo-doctor         # 20/20 checks
npx expo export --platform android --output-dir /tmp/tasterank-export
```

All four checks pass in this repository. The Android Metro bundle exports successfully (Hermes bytecode, ~3.1 MB) and the web bundle exports too, which confirms every route, asset and native module resolves.

Automated logic checks cover demo data integrity, average/statistics math, score rounding and clamping, distribution buckets, search across name/brand/flavour/review/category, every sort mode, and favourite-category selection. Interactive native behaviour (haptics, camera capture, native share sheet) still needs a real device.

## Android build (EAS)

`app.json` is configured for `com.tasterank.app`, version `1.0.0`, versionCode `1`, adaptive icon, splash screen and Android camera/photo permissions.

`eas.json` has:

- `preview` — **APK** with internal distribution, for sideloading on your phone
- `production` — **AAB**, version auto-increment, for Google Play later

### Build the APK

An Expo account and a one-time EAS project link are required. In a terminal with network access:

```bash
npx eas-cli@latest login
npx eas-cli@latest init                                    # links the project, writes extra.eas.projectId
npx eas-cli@latest build --platform android --profile preview
```

EAS builds in the cloud, then prints a URL. Open it on the Samsung phone and install the APK (allow "install unknown apps" for your browser the first time).

### Build from GitHub Actions (no terminal needed)

`.github/workflows/build-tasterank-apk.yml` defines the **Build TasteRank APK** workflow. It runs only when started manually:

1. Open the repository on GitHub → **Actions** → **Build TasteRank APK** → **Run workflow** (branch `main`).
2. The first run links the EAS project with `eas init --account <your-account> --non-interactive` and EAS automatically generates and stores the Android keystore. No signing setup is needed from you.
3. The job only queues the build (`--no-wait`); EAS builds in the cloud. The job summary contains the EAS build page link.
4. Open that link on your phone, wait for the build to finish, then download and install the APK.

It authenticates with the repository's `EXPO_TOKEN` Actions secret. If the secret is missing, the workflow fails at **Verify Expo authentication** without exposing any values.

### Building from this Freebuff workspace

Interactive Expo login cannot run in the cloud workspace, so use an access token:

1. Create a free account at [expo.dev](https://expo.dev).
2. In Expo account settings, create an **access token**.
3. In this project open **Settings → Secrets** and add it as `EXPO_TOKEN`. Never paste the token into chat.
4. Ask for the preview build. The first build runs `eas init --non-interactive` to link the project, then `eas build --platform android --profile preview --non-interactive`.

### Build the Play Store bundle later

```bash
npx eas-cli@latest build --platform android --profile production
```

## Status and limitations

- **No APK has been produced yet.** EAS cloud builds need Expo authentication; nothing has been uploaded or built.
- This environment cannot run an Android emulator or a browser (missing Chromium system libraries, no root), so the app has not been exercised on a device here. TypeScript, Expo Doctor, Android/web Metro exports and the logic test suite all pass.
- iOS is configured only incidentally; the target is Android.
- All data is local to one device. Sharing exports text, not a sync service.
