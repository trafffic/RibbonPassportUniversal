# Validation — 22 October 2026

## Collection refinements — 25 October 2026

- Strict TypeScript check and all **139 unit tests** pass. Added coverage checks canonical form aliases without changing saved IDs, cap/rider Showdown exports, sprite provider paths, combined collection filters, stable and undoable box sorting, navigation-insensitive backup fingerprints, and ribbon/earnable-mark goals through original/universal/guide exports, clearing, recovery and earning/undo.
- The final focused browser matrix covers desktop (1440px), phone (390px), small phone (320px) and tablet (820px): **70 applicable cases verified across the matrix and targeted reruns**, with six viewport-specific skips. The matrix initially passed 69 cases; its remaining desktop Back-navigation test resolved a retained, hidden PC during a route transition. The test now waits for the collection preview before selecting a slot; both desktop navigation cases subsequently passed three repetitions each (six checks). The earlier broad desktop/phone suite also exercised offline caching, conflicts, quota failures, ribbon recording, guides, teams and recovery.
- New browser flows verify automatic draft restoration across close/reload (including level/met level), explicit discard, draft-storage failures and stale revisions; compatible game suggestions with an explicit all-games override; combined search filters; sorting/undo; pinned mark export/reload/clear; and backup status before export, after navigation/reload and after a content edit. A 640px-height layout regression found during this pass was fixed by placing the mobile goal action inside the selected Pokémon summary.
- Production web export and offline precache pass with **1,149 bundled files**. The cap, cosplay and rider sprite URLs return HTTP 200; alias paths match the [PokeSprite catalogue](https://github.com/msikma/pokesprite/blob/master/data/pokemon.json). Unbundled sprites still need an initial online load before being available offline.
- Restored editor and goal layouts were visually inspected on desktop and phone. These changes have not been rebuilt or tested on native Android/iOS devices; earlier native evidence below applies to its recorded revisions.

## Current production parity implementation

- Strict TypeScript check and **54 domain/backup/storage/artwork tests passed**, with no failures or skips. Added coverage includes all 423 guide/earning-game pairs, independently editable attributed community teams, Showdown text/build round trips, notebook photos and removal, capture marks, metadata-specific source preservation, explicit deletion, chronological recovery, competitive opaque storage fields, and both six-member parties in native and guide-format exports.
- **32 Chromium interaction tests passed** across 1440px desktop, 820px tablet, 390px phone and 320px small phone. Eight flows cover actual PC → Passport Studio navigation, sprite bounds, record/undo/Journey, offline reopen, IndexedDB quota failure, persisted offline conflict resolution, lossless native backup import/export and malformed rejection, box editing/movement/party, empty/add/edit/recovery, offline guides/sources/team copies/build editing, and memories/date validation/photos.
- Production export and offline precache passed with **1,138 bundled files**. Current desktop/phone captures are the `parity-*` files in [web evidence](validation/web/); desktop PC/passport, the team library, and both phone layouts were visually inspected.
- The Android native flow passed on the local **Android 36 x86_64 emulator**, at **1080×2400 / density 420** and **1600×2560 / density 240**. It uses the actual document picker to import samples, records/undoes/repeats a ribbon change, opens Journey and bundled guides, saves an independent community team/build, disables network access and force-stops/reopens, exports JSON through the native share flow, and verifies stable identities, attribution and earning location. The exact final APK is identified in [build metadata](validation/android/parity-build.json); [native results](validation/android/parity-result.json) and `parity-*` PNG/XML files contain evidence.
- The emulator encountered a cold-boot **Android System UI** ANR while the completed Gradle daemon still held memory. The daemon was stopped and Wait dismissed the OS dialog before retrying. This is recorded separately from app behavior; physical Android devices remain untested.
- The original twelve sample sprites are unchanged. Twenty-seven additional team-member icons use the original app’s providers; their upstream URLs/checksums are recorded. No replacement portrait bundle is present. The copied community-content JSON matches the reference SHA-256.
- **iPhone/iPad native validation is blocked**: the user confirmed there is no Mac or cloud Mac access yet. No iOS build, signing, upload or native-validation success is claimed.

The local feature set and remaining differences are listed in [UI-PARITY.md](UI-PARITY.md). Drag gestures, per-Pokémon recovery, dedicated Photos-library UI and widgets remain unported. Authentication, cloud sync and public services remain outside this slice. Nothing was committed, pushed or published.

## Historical evidence — earlier slices (21 October 2026)


## Selected design and demo defaults

The Classic PC → Passport Studio design prototype was checked at desktop, tablet and 390/320px phone widths for preview navigation, retained Pokémon selection, return to storage, the source passport tabs/filters, and creating a normally named box. Its sample counts, Memory Ribbon presentation, recorded visits and transfer assessment are projected from the existing domain model. This is design evidence, not an implementation claim for the unported original features listed in [UI-PARITY.md](UI-PARITY.md).

Fresh demo collections now contain only Box 01. No stored/imported box is removed or renamed. Strict typecheck and 40 tests passed; the production PC/passport flow was rerun across the four browser viewports. Native builds from earlier sections predate this seed-only change.

## Original sprite restoration

The replacement portrait set was removed at the user's request. The current UI uses the original twelve bundled iPhone sprites, enlarged without changing their pixels or colours. Sprite frames constrain both axes and use containment in PC slots, quick previews and passports.

- Strict typecheck and all **40 domain/backup/storage/artwork tests** passed again. The artwork regression checks every original sprite's visible RGBA pixel counts against its prepared rendering copy.
- All **24 Chromium interaction tests** passed again across desktop, tablet and both phone widths. The sample PC now also checks every occupied slot's loaded image bounds in both axes.
- Production web export/offline precache passed. The `original-sprites-*` captures in [web evidence](validation/web/) show this revision; desktop and phone PC, preview and passport captures were visually inspected.
- The rebuilt release-mode Android test APK passed native sample import, PC selection, preview, passport and restart checks at **1080×2400 / density 420** and **1600×2560 / density 240** on the Android 36 x86_64 emulator. The five `original-sprites-*` native PNG captures were visually inspected: whole silhouettes, correct proportions and clearance inside slots. See [native results](validation/android/original-sprites-result.json) and [exact APK metadata/checksum](validation/android/original-sprites-build.json). ZIP inspection confirmed zero replacement portrait assets, including stale generated resources. This remains an emulator/debug-key local test APK; iOS and physical devices were not tested for this revision.

The slice-two screenshots and native flows described below predate this artwork correction and are retained as historical feature-validation evidence.

## Verified

- TypeScript strict typecheck passed.
- **40 domain/backup/storage/artwork tests passed** with no failures or skips. Cases cover Swift-derived eligibility/transfer rules, Memory Ribbons, lossless backups, persistence, stable identities, add/edit commands, box/party swaps, undo, required Swift export fields, guide layout extensions and complete sprite silhouettes.
- **24 Chromium interaction tests passed**: six flows at 1440×1000 desktop, 820×1180 tablet, 390×844 phone, and 320×740 small-phone viewports. Coverage includes building a three-Pokémon collection from empty, editors, box creation/rename/wallpaper, cross-box moves/swaps/undo, search, empty-collection review/undo, PC selection, passports, ribbons and Journey, offline reopen, both backup exports/import, save failures, and conflicting offline windows with persisted resolution. Individual images are checked against both slot dimensions to catch cropping.
- Official Expo Doctor: **20/20 checks passed**. `expo install --check`: dependencies up to date.
- Production web export and offline precache generation passed. Desktop/narrow-layout captures were visually inspected; the narrow review caught and corrected clipping that a document-width-only assertion missed. Tests now check individual control bounds as well.

Retained browser captures are in [validation/web](validation/web/). Playwright traces/reports are generated in ignored `test-results/` and `playwright-report/` folders on failure.

## Native validation

Second-slice results appear first. Earlier first-slice evidence is retained below.

### Second-slice phone

The final second-slice APK passed the native Android 36 x86_64 **1080×2400, density 420 phone configuration**. The complete flow creates an empty collection through the review UI, selects species and individual games in native editors, adds a Pokémon, creates a second box, moves to slot 30, undoes/repeats the move, selects a wallpaper, edits nickname/shiny, records Alert Ribbon in Alpha Sapphire, views its Journey, force-stops/reopens with Wi-Fi/mobile data disabled, and opens the original-format share sheet. See [phone results](validation/android/slice-two-result.json) and the `slice-two-*` PNG/XML captures.

Native validation caught and corrected wallpaper thumbnails inheriting the high-resolution raster’s height. The corrected picker uses bounded aspect-ratio cards and now has a native size regression assertion. The game editor also excludes aggregate catalogue headings, so earning locations use individual games. The test selector ignores inverted bounds that Android reports for untappable offscreen scroll children. Final phone captures were visually inspected for typography, whole sprite silhouettes, shiny/game emblems, wallpaper rendering and editor layout.

The APK is bundled in release mode with the generated debug key for local emulator testing; [build metadata and checksum](validation/android/slice-two-build.json) identify the exact artifact. It is not a store release or a physical ARM-device validation.

### Second-slice tablet and native export

The same final APK passed at **1600×2560, density 240** on the Android emulator: restored PC/quick preview, full passport and Journey earning history. The exported JSON was read through adb’s raw channel and checked for the Pokémon’s stable ID, nickname/shiny, level/met level, Alpha Sapphire earning location, exact second-box slot 30, Beach wallpaper, and the required Swift record/collection/wallpaper fields. See [tablet/export results](validation/android/slice-two-tablet-result.json). The native phone and tablet captures were visually inspected. This is a tablet display configuration of the emulator, not a physical Android tablet.

### First-slice evidence

Android tooling was absent at the start. Google’s command-line tools, SDK platform/build tools, NDK/CMake, and a Google APIs Android 36 x86_64 emulator were provisioned locally. The emulator boots using WHPX.

**Native Android APK build and interaction validation passed.** This is a bundled release-mode local test APK signed with Expo’s generated debug key, not a store release. It runs independently of Metro. Build details and the APK checksum are in [build.json](validation/android/build.json). Windows required short CMake staging paths and current Ninja 1.13.2; the SDK’s Ninja 1.10.2 failed on long cached header names. Both the full rebuild and a subsequent unchanged incremental rebuild succeeded; the latter completed in 45 seconds. The checked-in Windows build helper reproduces that configuration without patching dependency source.

Phone configuration: Android 36, x86_64, 1080×2400, density 420. Native checks passed for bundled sample selection, full passport, selecting an earning game, ribbon recording, undo/re-record, Journey history, export share sheet, and SQLite restoration after force-stop/relaunch with Wi-Fi/mobile data disabled. See [slice results](validation/android/result.json) and the retained phone PNG/XML captures.

The actual Android file picker imported [the rich app v1 fixture](../tests/fixtures/native-app-v1.json). Importing from an open passport now returns to the replacement collection; this native check found and fixed the stale-route case. The native original-format export matched all **1,241 fixture bytes** through adb’s raw output channel, retaining the large integer, decimal lexeme, date, opaque attachment and unknown fields. The universal export retained the saved Alpha Sapphire earning history. On the final APK, the imported Metagross then recorded Effort in Brilliant Diamond, undid/re-recorded it, and restored it in Journey after another offline force-stop/relaunch. See [backup results](validation/android/backup-result.json). Export artifact inspection used only this test emulator’s app cache.

The same APK also passed PC selection/preview, full passport and planning controls at a **1600×2560, density 240 tablet display configuration**. [Tablet results](validation/android/tablet-result.json) and the two tablet PNG/XML captures are retained. This was a display configuration change on the Android emulator, not a physical tablet test. The phone and tablet native captures were visually inspected for pixel typography, artwork, wrapping and control layout.

Native scripts in `scripts/android-*.mjs` only accept emulator serials. The slice script expects the fresh authored sample collection; the import/tablet scripts continue from its export and the compatibility fixture. They do not clear app data automatically. Native test data and SDK/build caches remain local/ignored.

iOS/iPad native validation has **not run**: this Windows session has no connected cloud Mac runner or signing/build access. The reference Swift app’s prior macOS results do not validate the universal app. No code was pushed or remote build/upload launched to bypass that limitation. Physical Android/iPhone/iPad testing, TalkBack/VoiceOver, large text, and native OS file-provider variants remain unverified.

## Dependency audit

`npm audit` reports **27 transitive findings (19 high, 8 moderate)** in the current Expo/React Native toolchain dependency graph. Underlying advisories concern `braces`, `node-forge`, and the `uuid` version pulled by Xcode tooling. A non-breaking `npm audit fix` was applied; those findings remain. npm’s proposed forced remediation would downgrade Expo to SDK 44 / RN to older incompatible versions, so it was not applied. No public launch/deployment is claimed. Recheck upstream fixes and audit the resolved lockfile before launch.

## Scope limits

The working slices include collection creation/editing and organisation, iPhone-style PC artwork, full passports, owned/planned ribbons, earning history, Journey, transactional local persistence, undo, and backup import/export. Browser responsiveness is reported separately from native results. There is no authentication, remote sync, publication, public guide service, community collection backend, or widget implementation. Unsupported backup fields remain preserved. The current parity editors and their remaining differences are listed in UI-PARITY.md. See [remaining integration work](ARCHITECTURE.md), [second-slice notes](SLICE-TWO.md), and [backup limits](BACKUPS.md).
