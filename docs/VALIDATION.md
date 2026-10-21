# Validation — 21 October 2026

## Verified

- TypeScript strict typecheck passed.
- **31 domain/backup/storage tests passed** with no failures or skips. Cases are ported from the relevant Swift reference tests and supplemented with lossless-backup and persistence regressions.
- **16 Chromium interaction tests passed**: four flows at 1440×1000 desktop, 820×1180 tablet, 390×844 phone, and 320×740 small-phone viewports. Coverage includes PC/box selection, full passport, earning-game selection, record/remove/undo, Journey, service-worker offline reload/deep links, native-app-format backup import preview, original-format download preservation, rejected malformed import, injected storage failure, and conflicting offline windows with persisted explicit resolution.
- Official Expo Doctor: **20/20 checks passed**. `expo install --check`: dependencies up to date.
- Production web export and offline precache generation passed. Desktop/narrow-layout captures were visually inspected; the narrow review caught and corrected clipping that a document-width-only assertion missed. Tests now check individual control bounds as well.

Retained browser captures are in [validation/web](validation/web/). Playwright traces/reports are generated in ignored `test-results/` and `playwright-report/` folders on failure.

## Native validation

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

The working slice is local collection selection, a full passport, owned/planned ribbons, earning history, Journey, transactional local persistence, undo, and backup import/export. Browser responsiveness is reported separately from native results. There is no authentication, remote sync, publication, public guide service, community collection backend, or widget implementation. Rich unsupported backup fields are retained without presenting them as editable features. See [remaining integration work](ARCHITECTURE.md) and [backup limits](BACKUPS.md).
