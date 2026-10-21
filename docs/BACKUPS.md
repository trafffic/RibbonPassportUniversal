# Backup preservation contract

Supported inputs:

| Format | Detection | Identity |
| --- | --- | --- |
| Ribbon Passport app v1 | `format: "ribbon-passport", version: 1, collection` | Preserve Pokémon, team and visit IDs |
| Existing collection snapshot | `pokemon` and `teams` arrays | Preserve Pokémon/team IDs |
| ribbons.guide v5 | `fileVersion: 5, pokemon` | Assign collection-scoped record IDs once; preserve any original fields in source |
| Universal v1 | `format: "ribbon-passport-universal", version: 1, collection` | Retain collection, record, operation and revision IDs |

Unknown versions are rejected before replacement. Duplicate app record/team IDs, malformed ribbons/species and invalid current levels fail import without changing the current collection. Conflicting duplicate JSON keys are rejected. The lossless parser accepts identical duplicate keys; untouched exports retain the exact original text.

## Two representations

The original backup is kept as text inside the local/universal collection. A typed projection drives the UI and rules; it is not a replacement serialisation of the source. Per-record `changes` contain only fields explicitly edited in this slice. A no-edit source export returns the original bytes as text, including BOM, whitespace and numeric lexemes. An edited export parses with `lossless-json` and overlays only explicit fields. Whitespace/key formatting may change after an edit, but unknown root/collection/record/team data, attachments, Swift numeric dates, unedited numeric lexemes and capture-field representations remain preserved.

Untouched square shinies and string levels retain their representations. Explicitly toggling shiny on writes `"star"` for guide files, toggling it off writes `""`, and edited string levels remain strings. Ribbons are not filtered to known IDs, originals are not rewritten into Memory Ribbon IDs, and unknown species/forms are not mapped to substitutes. Met-level and size edits map to each format’s aliases; clearing them removes both aliases. A new ribbon records one game and generation. Removal clears that award’s earning metadata and equipped title when applicable. Undo restores the previous patch and record contents. Existing visits, including opaque future entries, survive edits. Changing game details retains previous endpoints without inventing a transfer route.

The input document may contain notebooks, photos/base64 data, saved competitive builds, community attribution, widget presets, recovery history and source notes. These are preserved in the source document even though this slice has no corresponding UI.

## Export choices

**Export collection** is the portable, complete universal backup. It includes source text, typed projection, edits, stable IDs, UI selection/box projection, revisions and operation history. It does not claim to be importable into the Swift app.

**Export original format** retains the source format and overlays explicit Pokémon edits. New records are appended with stable IDs and the required Swift record fields. New native-format collections include Swift’s required appearance and numeric reference-date fields. App-format storage writes moves/swaps, party, box names and wallpapers while retaining unknown storage/box/wallpaper fields. Unaffected source layouts are not normalised back into the source; an edited slot array retains opaque entries beyond the 30 visible slots.

Guide exports write standard box names and per-record box assignments. A versioned `ribbonPassportLayout` extension carries exact slot gaps, party, wallpaper and stable IDs for restoration in Universal; ribbons.guide ignores it and may compact the PC when it re-exports. Unknown fields within an existing supported extension are retained. An unknown extension version or unsupported guide box-list entries cause original-format export to fail with an explanation; a full universal export remains available. Neither source format carries universal operation/revision history. Other apps may ignore earning-history additions, so keep a universal backup as the complete portable copy.

The universal backup does not include separate locally archived collections/conflict branches. Export conflict candidates explicitly before resolving them when portable copies are desired. Local storage archives both candidates and replacement-import snapshots; a recovery archive browser is still needed.

## Known limits

- Validation uses the authored reference demo and synthetic rich backups covering opaque fields, attachments, dates, numbers, malformed versions, identities, and round trips. No real private user backup was provided. Large real-world collections/attachment volumes still need performance and quota testing.
- Missing fields have conservative UI defaults. Source export does not write those defaults back. Unknown species have no inferred eligibility and may lack bundled artwork.
- Source storage is reconciled for display; broken references/oversized slots remain preserved. Explicit moves, box names and wallpapers are exportable. Deletion, box reordering, competitive-section editing and archive browsing remain future work.
- Imported histories with a known generation but no known game remain labelled “Game not set.” No intermediate Journey stops are inferred from the transfer graph.
- Backups may contain personal trainer data/photos. This slice keeps them local and has no upload path.
