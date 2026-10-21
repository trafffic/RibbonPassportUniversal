# Ribbon Passport Universal

A local-first React Native / Expo / TypeScript / Expo Router port of Ribbon Passport for web, iPhone, Android, iPad, and Android tablets. The first two slices cover collection organisation → passport → ribbons → Journey, with the iPhone app’s Sun/Moon PC artwork, shiny emblems and game mascots. It has no authentication, cloud backend, public sharing, community service, or widgets.

Chosen design direction: Classic PC storage opens Passport Studio. The original iPhone app defines the feature set; the [feature parity checklist](docs/UI-PARITY.md) records what exists and what still needs porting. The design mockup does not establish functional parity.

## Run locally

Node.js 24 LTS was used for validation. Install with `npm ci`.

```sh
npm run web
npm run android
# macOS + Xcode:
npm run ios
```

To test the **offline browser build**, export and serve it locally:

```sh
npm run export:web
npm run serve
```

Open http://127.0.0.1:8081. The development server is not the offline test target. A production export precaches the app shell, every route bundle, catalogue, font, and referenced image. Once caching completes, reloads and deep links work offline. A service worker update activates after the old windows close. Browser storage belongs to this origin; changing the port, clearing site data, or private-browsing policies can make a different/empty collection appear. Export backups for portability.

## Try the slice

Use **Start a new collection** to review and create an empty PC (the previous collection is archived and the action can be undone). **Add Pokémon** opens the species/form and journey editor. **Edit Pokémon** changes details while retaining ribbon ownership and earning history. **Create box** adds storage; **Box settings** changes its name and wallpaper. Choose **Move Pokémon**, switch boxes, then choose a slot; occupied slots swap. The same action moves to/from the six-slot party. Mouse, Tab/Enter and touch use the same controls. **Find Pokémon** searches across boxes and filters by current game without rearranging slots.

1. The first launch seeds six representative Pokémon from the reference app. Select **Box 01**, select a Pokémon, and use **Open full passport**.
2. **Owned awards** shows the current ribbon case. **Show original records** exposes older ribbons represented by Memory Ribbons. Selecting an award shows its description and known earning location.
3. For Gardevoir, choose **Plan next ribbon → Alert Ribbon → Alpha Sapphire → Record ribbon**. **Undo last change** restores the previous record. The separate Ribbon planner route uses the same rules and components.
4. **Journey** shows recorded stops, known endpoints, and ribbons with a confirmed earning game. Generation-only earning history stays unassigned to a game.
5. Reopen the app to restore local selection, ownership, visits, and source data. SQLite stores native collections; IndexedDB stores web collections. Saves are transactional and only acknowledged after success.
6. **Import / export** previews imported backups before replacement. **Export collection** produces a complete universal backup. **Export original format** preserves the source document and overlays explicit ribbon/history edits. Imported original fields, unknown fields, embedded attachments, and numeric precision are retained. Other apps may ignore added history fields; universal-only layout/revision data needs a universal backup.

The undo action covers the latest change in the current session. It is not a full persistent recovery browser. Replacement imports archive the old collection locally; exporting before replacement remains the most portable recovery option.

## Checks

```sh
npm run verify
npm run export:web
npx playwright install chromium
npm run test:web
npx expo-doctor
```

The browser matrix uses 1440, 820, 390, and 320 px widths. Tests exercise actual local saves, offline reload, file import/download, undo, save failure, and concurrent-window conflict resolution. Browser widths do not validate a native app. See [validation](docs/VALIDATION.md) for actual native results and limits.

On Windows, long React Native C++ paths may require `./scripts/build-android-windows.ps1` after Android tooling is installed. Extract the official [Ninja 1.13.2 Windows release](https://github.com/ninja-build/ninja/releases/tag/v1.13.2) to `.tools/ninja/` first; the SDK’s bundled Ninja 1.10.2 cannot handle some cached header paths. The helper creates a temporary short staging drive, applies the checked-in Gradle init script, builds a local bundled APK, and removes the drive alias. The default output targets an x86_64 emulator and uses Expo’s generated debug signing key in release mode; it is a local test artifact. Set `-SdkRoot`, `-JdkRoot`, `-Architecture` or `-StagingDrive` for your environment.

## Code map

| Location | Responsibility |
| --- | --- |
| `app/` | Router routes and shared responsive screen composition |
| `src/domain/` | UI-independent models, catalogue, eligibility/transfer rules, commands, authored sample history |
| `src/backup/` | Lossless source preservation, version validation, universal/original exports, platform file handling |
| `src/storage/` | Transactional persistence interface, IndexedDB web adapter, SQLite native adapter |
| `src/state/` | Save-before-display state, undo, import replacement, local conflict resolution |
| `src/ui/` | Shared pixel-font controls, PC storage, preview, ribbon board, Journey |
| `assets/` | Copied reference catalogue, sprites/art, Pixelify Sans, wallpapers, notices |
| `tests/` | Swift-derived domain regressions, backup compatibility, storage and browser tests |
| `scripts/` | Local export/service-worker generation and local test server |

[Porting notes](docs/PORTING.md), [backup contract](docs/BACKUPS.md), and [future integration points](docs/ARCHITECTURE.md) describe the boundaries of this slice.

The bundled `assets/prepared/` files use the original iPhone sprites. `node scripts/prepare-artwork.mjs` removes transparent padding and enlarges existing pixels with nearest-neighbour scaling; it does not download or substitute sprites. Both image dimensions fit inside their PC slot or preview, retaining the whole silhouette. `assets/data/sprite-provenance.json` records original source paths and checksums. Species without original bundled artwork show an unavailable marker. See [artwork notes](docs/SLICE-TWO.md).

## Attribution

Reference app inspected read-only: `C:\Users\killi\Documents\GitHub\RibbonPassportMain\RibbonPassport`, commit `3d16bd7042ce846a60474237b6a84526fc677d11` on 21 October 2026. The reference was not modified. No commit was pushed and nothing was published.

Pixelify Sans by Stefie Justprince is bundled under SIL OFL 1.1. Ported reference logic and catalogue material carry their upstream GPL-3.0 obligations; copied sprites, artwork, and font have separate notices. See [reference credits](docs/REFERENCE-CREDITS.md) and `assets/Licences/`. Pokémon imagery retains its respective owners’ rights. This local port does not resolve the reference repository’s public-release artwork review.
