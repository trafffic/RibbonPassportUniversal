# Reference audit and dependency decisions

Inspected reference commit: `3d16bd7042ce846a60474237b6a84526fc677d11`. No applicable `AGENTS.md` was present in the workspace, reference repository, or inspected ancestor directories.

This section records the initial port audit. [Slice two](SLICE-TWO.md) adds collection editors/organisation and the reference PC styling. Following the user's artwork preference, it retains the twelve original bundled Pokémon sprites with corrected scaling and containment; broader species artwork coverage remains open.

## Reuse and parity

Copied unchanged: `catalog.json`, `catalog-order.json`, `ribbon-rules.json`, `demo-backup.json`, `export-compatibility.json`, `art-colours.json`, bundled artwork/sprites, Sun/Moon wallpapers, Pixelify Sans, app icon, licence notices and source credits. An explicit static artwork manifest makes referenced images available to Metro offline. The source only bundles a small set of Pokémon sprites; unsupported imported species display a labelled `?` instead of fetching images or substituting another species. Full species artwork coverage is remaining work.

The primary references were `Shared/RibbonCore.swift`, `RibbonRules.swift`, `UserCustomization.swift`, `CommunityContent.swift`, `SharedStore.swift`, `PassportViews.swift`, `RetroStyle.swift`, relevant `Tests/ImportTests.swift` cases, and the reference testing/research notes. The reference’s recent native XCTest results are context, not results for this port.

Ported to pure TypeScript:

- Catalogue ordering and game labels; modern Memory Ribbon presentation while preserving originals.
- Directed reachable groups, compatible games, mythical/legendary challenge restrictions, BDSP restrictions, Gmax and GO Safari constraints, Spinda/Nincada transfer locks.
- Shadow National Ribbon, level-50 Winning Ribbon, sequential BDSP purchases, Footprint transfer/met-level/voiceless exceptions, automatic/event awards and post-capture/size marks.
- Whole-generation transfer safety, compatible later earning games, unknown met-level warnings, and generation-aware ribbon planning.
- Recording/removing ribbon ownership, game-specific earning metadata, recorded visits plus known endpoints, and undo with stale-version protection.
- Authored six-Pokémon demo journeys and generation-only earning histories. Imported histories are never filled from the demo.

SwiftUI views, UIKit artwork handling, App Group persistence, WidgetKit and Xcode targets cannot be reused in React Native. The richer passport notebooks, competitive teams, customisation, source guides, recovery browser, move flow, editors and widgets remain outside this slice. Their backup fields are preserved even where no editor/view is ported.

## Official Expo checks (21 October 2026)

- [Create a project](https://docs.expo.dev/get-started/create-a-project/) explicitly recommended `default@sdk-58`; the transition default without that flag was SDK 57. npm confirmed Expo `58.0.16` and template `58.0.25`.
- [Router introduction](https://docs.expo.dev/router/introduction/) recommends the configured default template for universal file-based routes. The app uses Router’s Stack and shared RN components, with no custom web-only navigation implementation.
- [SDK installation](https://docs.expo.dev/versions/latest/) recommends `npx expo install` for SDK-compatible package versions. React `19.3.0`, RN `0.88.0`, Router `58.0.24`, TypeScript `6.0.3` and matching core packages came from the SDK 58 template; SQLite, picker, file system, sharing and Crypto were installed through Expo CLI. The lockfile fixes the resolved graph.
- [SQLite guidance](https://docs.expo.dev/versions/latest/sdk/sqlite/) confirms persisted native storage. Its web mode needs WASM/SharedArrayBuffer headers; this slice instead uses native browser IndexedDB behind the same interface, without cross-origin isolation requirements.
- [Local builds](https://docs.expo.dev/guides/local-app-development/) requires Android tooling for Android and macOS/Xcode for iOS. Actual native validation is tracked separately from browser tests.
- [PWA guidance](https://docs.expo.dev/guides/progressive-web-apps/) was checked for offline web delivery. A small generated service worker precaches this entirely local slice. No hosting or deployment was configured.

No UI kit, authentication SDK, sync backend, ORM, or remote image dependency was added. Pixelify Sans and the reference sage palette are used throughout shared app UI.

For local Windows native tooling, [Ninja 1.13.2](https://github.com/ninja-build/ninja/releases/tag/v1.13.2) was used with the SDK CMake toolchain to support long cached dependency paths. The downloaded official Windows ZIP SHA-256 was `07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65`. This is a local build-tool prerequisite, not an app runtime dependency.
