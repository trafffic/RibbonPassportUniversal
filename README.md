# Ribbon Passport Universal

A local-first React Native / Expo / TypeScript / Expo Router port of Ribbon Passport for web, iPhone, Android, iPad, and Android tablets. The current implementation covers Classic PC → Passport Studio, ribbon planning, Journey notebooks, separate competitive storage, personal teams, and the original bundled field guides/team library, using the iPhone app’s pixel typography, sage palette, PC artwork, game mascots and exact game-title colours. It has no authentication, cloud backend, public sharing, community service, or widgets.

Chosen design direction: Classic PC storage opens Passport Studio. On widescreen, storage keeps the artwork’s original proportions and fits the available viewport, with a horizontal party strip and a compact passport on the right. Owned ribbons show their descriptions on hover, including a link to the matching field guide. The passport shows the selected Pokémon’s live last-chance ribbon check; opening it keeps storage beside the full passport, with longer passport content scrolling within its own pane. New collections start with Box 01 through Box 16. Older collections gain empty boxes, and the original demo’s “Next adventure” placeholder becomes Box 02. Box backgrounds cycle automatically by box order through the sixteen bundled wallpapers. The original iPhone app defines the feature set; the [feature parity checklist](docs/UI-PARITY.md) records what exists and what still needs porting.

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

Open http://127.0.0.1:8081. The development server is not the offline test target. A production export precaches the app shell, every route bundle, catalogue, font, and referenced image. Once caching completes, reloads and deep links work offline. Localhost previews load the latest exported HTML on reload and activate new caches immediately, with cached HTML as an offline fallback. On other hosts, a service worker update activates after the old windows close. Browser storage belongs to this origin; changing the port, clearing site data, or private-browsing policies can make a different/empty collection appear. Export backups for portability.

## Try the app

1. A fresh install starts empty, like the iPhone app: **Add Pokémon**, **Import ribbons.guide backup** or **Try demo** (Competitive offers **Add manually**, **Import Showdown team** and **Community teams**). Try demo adds six authored Pokémon and a Demo Ribbon Team; existing collections are never replaced on update. Select a Pokémon in **Box 01**. On desktop, click its **Passport preview** to enter Passport Studio; phones use the **Passport** action under the PC. The original sprites fit both dimensions of their frames.
2. Use **Overview**, **Ribbons** and **Journey**. Ribbons has the original game, earnable-only, last-chance/later-generation and paging controls, with original Memory Ribbon records available. For Gardevoir, record Alert Ribbon in Alpha Sapphire and use **Undo last change**.
3. **Journey** contains Games/Generations stamps, edit visits, Milestones, Memories (including photos), Move Dex notes, and Field guides. Dates are optional or valid YYYY-MM-DD values; notes do not alter ribbon eligibility.
4. **Collection options** contains Teams, Add Pokémon, import/export, Export Ribbon Masters, Try demo / Refresh demo (undoable; your edited notes and journal on demo Pokémon are kept), new boxes and search. The Party toggle is remembered per section. **Box options** renames boxes and adds new ones; each box gets its background automatically. Existing wallpaper metadata is retained for backup compatibility. Under Pokémon actions, choose Move then a destination slot (occupied slots swap), party/return, edit, individual export or delete. A new collection is reviewable and undoable.
5. **Competitive** has separate boxes/party, Showdown import, builds, and personal teams with member ordering/defaults. **Team library** contains attributed source rosters and strategies; Save personal copy creates independently editable Pokémon with new IDs and zero awards.
6. **Field guides** and **Team library** are available in Settings on every platform and in the desktop footer. The 25 offline guides cover every one of the 423 earning award/game pairs. Source notes stay private on the device. This is bundled reference content, not a public service.
7. **Settings → App backup** imports with a preview, exports a complete universal collection, or writes the original source format while preserving unsupported fields. **Recovery history** reviews and restores per-Pokémon and team versions, and older archived collections. Undo covers the latest change in the current session.
8. Reopen to restore selection and data. SQLite stores native collections; IndexedDB stores web collections. Offline edits remain local. Divergent browser windows preserve both versions and require an explicit choice.

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

The bundled `assets/prepared/` files retain the original twelve iPhone sample sprites unchanged and add 27 team-member sprites from the same PokeSprite / Gen IX PokeAPI providers. `node scripts/prepare-artwork.mjs` removes transparent padding and enlarges existing pixels with nearest-neighbour scaling; it does not download sprites or replace the original samples. The explicit community bundling script records source URLs/checksums in `assets/data/community-sprite-sources.json`. Both image dimensions fit inside their PC slot or preview, retaining the whole silhouette. `assets/data/sprite-provenance.json` records original source paths and checksums. Species without original bundled artwork show an unavailable marker. See [artwork notes](docs/SLICE-TWO.md).

## Attribution

Reference app inspected read-only: `C:\Users\killi\Documents\GitHub\RibbonPassportMain\RibbonPassport`, commit `3d16bd7042ce846a60474237b6a84526fc677d11` on 21 October 2026. The reference was not modified. No commit was pushed and nothing was published.

Pixelify Sans by Stefie Justprince is bundled under SIL OFL 1.1. Ported reference logic and catalogue material carry their upstream GPL-3.0 obligations; copied sprites, artwork, and font have separate notices. See [reference credits](docs/REFERENCE-CREDITS.md) and `assets/Licences/`. Pokémon imagery retains its respective owners’ rights. This local port does not resolve the reference repository’s public-release artwork review.
