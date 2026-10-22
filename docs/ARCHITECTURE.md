# Local model and launch integration points

## Current boundaries

`src/domain` depends only on bundled data and pure TypeScript. Commands receive operation IDs and timestamps rather than reading platform clocks/randomness. The UI calls commands through the provider. The provider commits the result first, then updates visible ownership and success messages. A failed save leaves the last saved version visible. Undo checks the target record revision before writing.

The storage interface exposes `load`, `pendingConflict`, `history`, and atomic `commit(next, expectedRevision)`. SQLite uses an exclusive transaction and WAL; IndexedDB uses a read/write transaction. A single serialised collection envelope keeps the original backup and edits atomic in this first slice. The interface allows later incremental tables without changing record identities or the domain/UI contract.

Collection and record IDs are independent of position/name/species. Existing app IDs are retained; guide IDs are scoped to a newly imported collection and retained through universal backup/restore. A collection has a `schemaVersion` and a revision token. Every ribbon edit creates a record revision with its parent and appends an immutable operation (ID, record ID, parent, resulting revision, timestamp, action, award and game). UI selection writes advance the collection revision without changing a record revision. Timestamps are descriptive; they never select a winning edit.

Two local windows that diverge trigger compare-and-swap failure. Both branches are archived, the pending choice survives reopening, and the user can export each and explicitly choose which collection to continue editing. No automatic last-write-wins merge is used. This exercises conflict handling locally; it is not cross-device sync.

## Optional accounts and automatic sync — not implemented

Keep anonymous collections fully usable. Attach an optional remote owner/membership to an existing collection ID instead of migrating IDs. Add credentials through a native secure credential adapter and the web provider’s supported session mechanism; do not place credentials in backups or the collection database.

Add a transport/outbox adapter consuming stable operation IDs and record parent revisions. Store remote acknowledgements and causal/branch metadata separately from the source document. Local deletion already tracks source-index tombstones for lossless original exports; remote tombstones must additionally carry stable record IDs and causal ancestry. Use idempotent pull/push with retry and connectivity wakeups; offline commands continue committing locally. Before enabling real sync, define record-level branch reconciliation and a resolution record with both parent revisions. The present single-parent command history must be extended additively to express that resolution ancestry.

When operations share an ancestor but conflict, retain both complete record versions and their original backup data. Ask the user to compare ownership, earning games, visits and notes; resolving one branch must not erase the other. Never resolve by client timestamp. Test concurrent ownership/removal, earning-game edits, imports, deletions, schema upgrades and attachment failures before claiming automatic cross-device sync.

## Shared passports, public guides, community collections — intended launch work

Use explicit publication commands that create a separate sanitised public projection with an owner, visibility, attribution, immutable revision and revocation. Sharing a local Router URL is currently only navigation within one device’s collection; it does not publish a passport. Never publish trainer IDs, private journals/photos, raw source backup text or recovery history by default.

The app now bundles the original 25 attributed guides and team library, with source review dates and offline routes. Public guide authoring still needs a versioned publishing workflow, moderation/reporting, access controls and updates. Community collection imports should create independent local IDs and retain source attribution/version, with a deliberate update/merge flow. Test access control, offline public snapshots, link revocation, community updates and conflict handling. These are launch requirements, not working features here.

## Widgets — not implemented

Publish a small versioned read-only widget projection only after a successful collection commit. iOS needs a WidgetKit extension, App Group storage, timeline refreshes, deep links and signing/capabilities. Android needs an AppWidget/Glance integration, widget state persistence, update scheduling and deep links. Both need OS-level testing, platform-specific font/rendering work and privacy controls for visible trainer data. Shared domain code can calculate goals/awards; native widget rendering/lifecycle remains platform-specific.

## Other remaining work

Slice two adds pure commands for adding/editing Pokémon, moves/swaps/party, box creation/names/wallpapers, empty collections and snapshot undo. Record edits use expected record revisions so an open editor cannot overwrite a newer record. Every organisation command also records an immutable operation; layout operations use the collection revision as their parent. Cross-window writes still use storage compare-and-swap. Newly created records use `created: true, sourceIndex: -1`, with their complete projection plus subsequent explicit patches; imported record positions never become identities. `layoutChanged` distinguishes intentional layout edits from display-only reconciliation. The schema changes are additive to v1; older envelopes remain readable by this app. The first-slice app cannot read the new edit fields and should not be used to edit second-slice backups.

The parity implementation adds deletion/source tombstones, competitive teams and Showdown builds, notebooks/media, guided transfer, offline guides/team copies, metadata-specific patches and archive recovery. Content changes archive the preceding collection; selection-only saves do not. Web recovery uses an atomic monotonic archive counter, and SQLite uses insertion order. Photo removal retains an explicit empty value across reopen/edit so original attachments cannot reappear. Known nested fields merge with original objects; unsupported team rows remain opaque. Remaining work includes box reordering, drag gestures/spatial arrow-key navigation, per-Pokémon recovery, historical earning reassignment, large-text/screen-reader passes, uncommon sprite variants and large-collection performance. Keep collection organisation and planning as peers as the app expands. Web offline caching also needs a tested install/update UX before public launch.

iOS/iPad require a cloud Mac or local Mac/Xcode. Add a macOS build/test job only when an authorised runner is available; device signing and real iPhone/iPad testing remain explicit validation gates. No remote job, push, upload or publication was performed to work around missing Mac access.
