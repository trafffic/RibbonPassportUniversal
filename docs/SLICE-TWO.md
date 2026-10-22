# Collection organisation and iPhone visual parity

The original second-slice notes below are historical. The production Classic PC / Passport Studio implementation, local competitive tools, field guides and notebooks are now described in [UI-PARITY.md](UI-PARITY.md). Current checks are in [VALIDATION.md](VALIDATION.md).

The reference remains commit `3d16bd7042ce846a60474237b6a84526fc677d11`, inspected read-only. `PCScreens.swift`, `CollectionEditors.swift`, `RetroStyle.swift`, `PassportViews.swift`, `SharedStore.swift`, `CustomizationPacks.swift` and `UserCustomization.swift` define the port’s interactions and image geometry. No applicable AGENTS.md was found.

## Visual changes

- Full original 208×192 Sun/Moon PC artwork, including its frame/header. Slots occupy x=8, y=36, width=192, height=150: six columns of 32 and five rows of 30, matching `PCGridMetrics` and the Swift tests. All sixteen wallpapers are selectable. No generic tile borders are painted over the game artwork.
- Native wallpapers use an 8× nearest-neighbour prepared raster of the unchanged original. This avoids the broad bilinear blur produced by enlarging the small source directly on Android.
- Wallpaper thumbnails have an explicit aspect-ratio container, so the native image’s high-resolution intrinsic height cannot stretch the editor cards.
- The reference’s shiny-light emblem replaces Unicode stars. Original cover-mascot art appears in game selectors, earning-game buttons, summary rows and Journey. Primal Kyogre/Groudon use the reference’s 20/24 display scale.
- Following the user’s sprite preference correction, Pokémon use the original bundled iPhone artwork again. The replacement Showdown portrait set has been removed. Both width and height are constrained by the actual slot, with internal clearance, so wide/tall sprites fit completely. Transparent padding is removed with the reference’s alpha >8 rule; all original visible pixels and colours are retained. Prepared rasters enlarge existing pixels with nearest neighbours before native rendering. Web images/backgrounds inherit pixelated rendering.
- PC controls sit around the original box; search is collapsed until requested. Desktop keeps the quick passport beside the box. Phone/tablet use the same components. Pixelify Sans and the sage palette remain throughout.

## Artwork provenance and limits

`assets/art` and `assets/wallpapers` retain the reference files unchanged. `assets/prepared` contains rendering copies of that artwork plus 27 attributed team-member icons from the same PokeSprite / Gen IX PokeAPI sources. The twelve original bundled Pokémon sprites retain their exact style and colours; the manifest records their source paths and checksums. Species/forms/shinies not present in the original bundle show an explicit unavailable-artwork marker. No replacement portrait, different species or regular-colour sprite is substituted for a missing shiny. No artwork request happens at runtime.

Sources and artwork rights remain those recorded in [the reference credits](REFERENCE-CREDITS.md). The newly downloaded replacement portrait bundle is no longer included. Nothing was published or uploaded.

The existing Expo/RN dependency versions remain. `pngjs` 7 is a build/test-only development dependency for PNG preparation. [Official Expo Image guidance](https://docs.expo.dev/versions/latest/sdk/image/) was checked; it documents cross-platform fitting and caching, but does not promise nearest-neighbour interpolation. This slice uses bundled prepared PNGs and RN containment rather than relying on an undocumented native interpolation setting.

## Working scope

Create an empty collection, add/edit species/form, nickname, gender, shiny, Gmax/shadow flags, origin/current game, level, met level and size. Create/rename boxes, select a wallpaper, search/filter across boxes, and move/swap to occupied/empty box or party slots. Saves commit before showing success. Undo restores data and writes a fresh operation; edits retain ownership, earning history and previous known endpoints. Setting a current game edits recorded details; it is not a guided transfer check-in.

Backup compatibility details are in [BACKUPS.md](BACKUPS.md). Accounts, cloud sync, sharing, public contribution services and widgets remain integration work. Original bundled guides and team-library content now work offline with local personal copies and notes; they are separate from those public services. Native iPhone/iPad validation still requires a cloud Mac/signing/build environment.
