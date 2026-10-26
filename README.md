# TasteRank

A native Android app for rating and ranking energy drinks, protein bars, snacks, restaurants and anything else you try. Built with Expo SDK 58, React Native 0.88 and TypeScript — not a website or WebView wrapper.

Ratings, reviews and photos save on-device and rank themselves automatically. Version 1.2 adds real product discovery with an Ice Blue theme: search Open Food Facts by name, brand or flavor, or scan a barcode with the camera, then rate the product. Version 1.2.1 replaces the Google-dependent scanner fallbacks with an on-device photo decoder and adds scanner diagnostics. No login, no backend, no paid API.

## Design

- Dark charcoal surfaces (`#101318`) with a single Ice Blue accent (`#7DD3FC`)
- All accent tokens live in `src/constants/theme.ts`; screens and components never hard-code the accent
- Launcher icon, adaptive icon foreground, splash mark and favicon recolored to match
- Space Grotesk typography, high-contrast text, rounded cards and generous spacing
- Native stack transitions, spring-press feedback and light haptics on real interactions
- Safe-area aware for edge-to-edge Android, tuned for Galaxy-sized phones

## Screens

| Screen | What it does |
| --- | --- |
| **Home** | Greeting, your #1 pick, rating/average/category stats, favourite category, top-rated carousel, recent ratings, quick add |
| **Rankings** | Live leaderboard with numbered positions, product search, category filter, four sort modes, share-as-text |
| **Rate** | **Product search first:** real Open Food Facts results, barcode scanner, manual-entry fallback. Selecting a product fills the rating form; score 0.0–10.0 (0.1 steps), custom photo, written review |
| **Item details** | Full-bleed photo or category artwork, score, verdict, review, barcode, dates, working edit/delete/share |
| **Edit** | Same form pre-filled, plus delete, presented as a native modal |
| **Insights** | Totals, averages, score distribution, category averages, top-rated items, favourite category |
| **Settings** | Demo data, share rankings, delete all data, Open Food Facts attribution, storage and offline notes |
| **Product data** | Attribution and licensing for Open Food Facts, API usage, cache policy and rate limits |

## Product search and barcode scanning

- **Source:** [Open Food Facts](https://world.openfoodfacts.org), a collaborative open database. Full-text search uses the documented [Search-a-licious API](https://search.openfoodfacts.org/docs); barcode lookups use the current [v3 product API](https://openfoodfacts.github.io/openfoodfacts-server/api/).
- **Search:** runs only when you submit a query, never as you type. This follows the published rule against search-as-you-type. Results are capped at 20 and show the real product image, name, brand, variant/flavor when the database has one, quantity and category.
- **Barcode scanning:** `expo-camera` live detection for EAN-13, EAN-8, UPC-A, UPC-E and Code 128. The detected number appears immediately, before the product lookup. The camera uses a stable native callback, a 1280×960 camera target and no preview rebinding. A 12-digit UPC-A is canonicalized to its 13-digit EAN form before lookup.
- **Scanner fallbacks:** **Photo scan** takes a still photo and decodes it entirely on the phone with ZXing (the `@zxing/library` JavaScript port and `jpeg-js`), so it needs no Google Play Services, Google Code Scanner or native ML Kit. **Enter number** accepts the digits printed under the barcode. The Google Code Scanner button was removed because it failed on a Samsung device without usable Play Services. Not-found barcodes open manual product entry with the number retained.
- **Scanner diagnostics:** the information button in the scanner shows whether the camera is ready, how many live barcode events have arrived, the last event time, the active formats and which decoder is in use. It also offers **Restart live camera** and **Photo scan**.
- **Category inference:** Open Food Facts tags (and well-known energy brands) map into TasteRank's existing categories; the user can always change the category on the form.
- **Duplicate protection:** a product is identified by barcode first, otherwise by normalized brand + name + flavor. Both the search list and the save path block duplicates and offer to open the existing rating. Changing a rating cannot collide with another saved product.
- **Photos:** remote front-of-pack images are downloaded into the app's private `rating-photos/` directory when a rating is saved, so they survive restarts and offline use. If the download fails, the remote URL is kept as a fallback, and a failed image shows a category placeholder instead of a broken box.
- **Manual entry:** always available, including from “no results” and from a barcode that is not in the database. A scanned barcode is kept on the manual rating, so scanning the same package later still detects the duplicate.
- **Offline:** ratings and local photos always work. Search results are cached for 24 hours and barcode lookups for 7 days; stale cached results are shown with an offline notice when the network fails. With no cache, the app explains the failure and offers manual entry.
- **Errors:** rate limits, timeouts, 5xx responses, not-found barcodes and malformed responses are handled separately, with a retry action where useful.
- **No fake data:** every result shown in the finished app comes from Open Food Facts. Demo ratings remain a separate, clearly tagged, removable sample collection that is ignored by duplicate checks.

### Rate limits and caching

Open Food Facts documents **10 search requests/minute/IP** and **15 product reads/minute/IP**. TasteRank enforces 6.5 seconds between searches and 4.5 seconds between barcode lookups, honors `Retry-After` on HTTP 429, and caches:

- search queries: 24 hours, bounded to 40 entries
- barcode products: 7 days, bounded to 60 entries

The cache is best-effort AsyncStorage and never touches the ratings envelope. If the cache is full, the oldest entries are removed.

### Attribution and licensing

Product data is © Open Food Facts contributors and is available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/). Individual database contents are available under the Database Contents License. Product images are available under [Creative Commons Attribution-ShareAlike](https://creativecommons.org/licenses/by-sa/4.0/). TasteRank is independent and not endorsed by Open Food Facts.

Attribution appears under the search results, on the selected product form, on item details for Open Food Facts products, and in the **Product data** screen, which links to the source, terms, ODbL, CC BY-SA and API documentation. The API documentation asks production apps to identify themselves with a custom User-Agent (TasteRank sends `TasteRank/1.2.1` plus the repository URL) and to submit its API usage form.

## Project structure

```
src/
  app/                    Expo Router routes
    _layout.tsx           Fonts, providers, root stack
    (tabs)/               Bottom tabs: Home, Rankings, Rate, Insights
    item/[id].tsx         Item details
    edit/[id].tsx         Edit modal
    settings.tsx          Settings modal
    data-credits.tsx      Open Food Facts attribution modal
  components/             Product search, result rows, scanner, form, cards
    ui/                   Design-system primitives
  constants/              Theme tokens and category metadata
  data/demo.ts            Removable demo ratings
  lib/                    Storage, photo persistence, OFF client, caches,
                          duplicate identity, stats, share, haptics
  store/RatingsProvider.tsx  App-wide ratings store backed by AsyncStorage
  types.ts                Rating and product models
```

## Persistence and data model

- Ratings are stored as a versioned JSON envelope in AsyncStorage under `@tasterank/ratings:v1`, written after every change. Reading is defensive: corrupt or partial data is discarded per-entry instead of crashing.
- Ratings now also carry an optional `barcode` and a `source` (`manual` or `openfoodfacts`). Older saved ratings load unchanged with no barcode and manual source, so upgrading does not lose any ratings.
- Picked photos are copied and Open Food Facts photos are downloaded into the app's private documents directory (`rating-photos/`) when a rating is saved. Replaced or deleted ratings have their photo files removed.
- Search caches live under separate `@tasterank/off-search:v2:*` and `@tasterank/off-product:v2:*` keys.
- Demo ratings are tagged and can be removed in Settings without touching real ratings.
- Uninstalling the app removes its private storage.

## Run and check locally

```bash
npm install
npx expo start          # scan the QR code with Expo Go (SDK 58)
npm run typecheck       # tsc --noEmit
npx expo-doctor         # dependency and config checks
npx expo export --platform android --output-dir /tmp/tasterank-export
```

Expo Go includes the camera module, but a new **development build or preview APK** is still required because the previous APK predates `expo-camera`.

## Android build (EAS)

`app.json` is configured for `com.tasterank.app`, version `1.2.1`, versionCode `4`, adaptive icon, splash screen, photo/camera permissions and the `expo-camera` config plugin. The preview APK and production AAB profiles are unchanged, and the existing EAS Android signing key is reused so the APK installs as an update.

`eas.json` has:

- `preview` — **APK** with internal distribution, for sideloading on your phone
- `production` — **AAB**, version auto-increment, for Google Play later

### Build the APK from GitHub Actions (no terminal needed)

`.github/workflows/build-tasterank-apk.yml` defines **Build TasteRank APK**:

1. Open the repository on GitHub → **Actions** → **Build TasteRank APK** → **Run workflow** (branch `main`).
2. The job authenticates with the repository's `EXPO_TOKEN` secret, links the EAS project on the first run, and EAS automatically generates and stores the Android keystore.
3. It queues the preview build with `eas build --platform android --profile preview --non-interactive --no-wait`.
4. Open the build link in the run summary on your phone. Wait for EAS to finish, then download and install the APK (allow “install unknown apps” once).
5. Installing over an existing TasteRank install reuses the same EAS signing key, so local ratings are preserved.

### Build locally with EAS

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

### Build the Play Store bundle later

```bash
npx eas-cli@latest build --platform android --profile production
```

## Verification and limitations

- TypeScript and Expo Doctor pass, and the Android Metro/Hermes bundle exports successfully.
- The Ice Blue palette is verified in the source: no `#C4FF54` accent values remain outside product data named “Chilli lime”.
- Logic checks cover barcode canonicalization, duplicate identity, category inference, variant extraction, product mapping, and API error types.
- The on-device photo decoder was tested against a real EAN-13 JPEG (`5060335635808`): it returned the correct number and `EAN-13` format.
- Live Open Food Facts checks were run against `search.openfoodfacts.org` and the v3 product endpoint:
  - **Monster:** 20 results, 12 with images; top results are real but generic (“Monster” / “Monster Energy”)
  - **Red Bull:** 20 results, 14 with images
  - **C4 Energy:** 20 results, 20 with images
  - **Barcode `5060335635808`:** Monster Ultra White, Monster Energy, energy category, real image, derived flavor “Ultra White”
  - **Flavor-style query “Frozen Bombsicle”:** 20 real C4 results
  - **12-digit UPC `611269818994`:** canonicalized to EAN-13 `0611269818994` and returned the Red Bull product
  - An invalid/unknown barcode returned a clean not-found error.
  - The client-side rate-limit guard rejected an immediate second search with a ~6 second retry.
- **Honest gaps:** many OFF listings are sparse. The top Monster, Red Bull and C4 entries have no `flavors` field, so TasteRank shows the full product name and quantity, and derives a variant only when the name reliably contains one (for example “Ultra White”). Some community entries are wrong or generic (the third C4 result is branded “Skittles” in OFF). Users can edit every field before saving, or add the product manually.
- This cloud environment cannot run an Android emulator or a browser, so the camera, live barcode detection, photo-camera capture, haptics, native share sheet and exact on-device layout have **not** been exercised here. They need a real device after installing the new APK. The scanner diagnostics screen is included specifically so a silent live-analyzer failure can be identified on the phone.
- No APK has been produced by this change. The existing **Build TasteRank APK** GitHub Actions workflow is ready and must be started manually; it uses the repository’s `EXPO_TOKEN` secret and the unchanged EAS signing key.
- Barcode photo decoding uses [ZXing](https://github.com/zxing-js/library) (MIT) and [jpeg-js](https://github.com/eugeneware/jpeg-js) (BSD-3-Clause). Both run locally on the device.
- iOS is configured only incidentally; the target is Android.
- All data is local to one device. Sharing exports text, not a sync service.
