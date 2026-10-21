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

In particular, shiny `"square"` is not rewritten to `"star"`, string levels are not rewritten as numbers, ribbons are not filtered to currently known IDs, raw originals are not rewritten into Memory Ribbon IDs, and unknown species/forms are not mapped to a guessed substitute. A new ribbon records a single game and generation. Removal clears that award’s earning metadata and equipped title when applicable. Undo restores the exact previous field patch and record contents. Existing visits, including opaque future visit entries, survive when new known endpoints/earning stops are added.

The input document may contain notebooks, photos/base64 data, saved competitive builds, community attribution, widget presets, recovery history and source notes. These are preserved in the source document even though this slice has no corresponding UI.

## Export choices

**Export collection** is the portable, complete universal backup. It includes source text, typed projection, edits, stable IDs, UI selection/box projection, revisions and operation history. It does not claim to be importable into the Swift app.

**Export original format** is for interoperability with the imported app/site. It retains the source format and overlays ribbon/history fields. App v1 supports `earnedGames`, `earnedGenerations` and `visits`; ribbons.guide may ignore these additions. Universal-only revisions and projected box layout are not representable in the old formats and are not included. The UI explains this before export. Do not use an original-format export as the only backup of universal state.

The universal backup does not include separate locally archived collections/conflict branches. Export conflict candidates explicitly before resolving them when portable copies are desired. Local storage archives both candidates and replacement-import snapshots; a recovery archive browser is still needed.

## Known limits

- Validation uses the authored reference demo and synthetic rich backups covering opaque fields, attachments, dates, numbers, malformed versions, identities, and round trips. No real private user backup was provided. Large real-world collections/attachment volumes still need performance and quota testing.
- Missing fields have conservative UI defaults. Source export does not write those defaults back. Unknown species have no inferred eligibility and may lack bundled artwork.
- Source storage is reconciled for display only; broken references/oversized slots remain in the source. Box reordering/movement/editing is not implemented in this slice.
- Imported histories with a known generation but no known game remain labelled “Game not set.” No intermediate Journey stops are inferred from the transfer graph.
- Backups may contain personal trainer data/photos. This slice keeps them local and has no upload path.
