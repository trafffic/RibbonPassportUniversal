# Chosen web design and iPhone feature parity

The user selected Classic PC for collection storage, opening the Passport Studio desktop layout when the passport preview or Passport action is clicked. This changes the presentation of the same Pokémon; it must retain selection, earning metadata and navigation back to the selected box.

The iPhone app is the feature specification. Do not invent product sections, permanent collections or starter box names. Only actual stored boxes appear. A new box uses `Box 01`, `Box 02`, etc., unless the user renames it. The previously invented `Contest team` / `Next adventure` mockup boxes are removed. Fresh demo collections now contain only their real populated box. Existing saved/imported boxes are not deleted or renamed automatically.

Reference inspected read-only: `RibbonPassportMain/RibbonPassport`, commit `3d16bd7042ce846a60474237b6a84526fc677d11`. The design prototype illustrates navigation and local presentation; it does not establish functional parity or implement missing production features.

| Reference area | Required behavior | Universal implementation status |
| --- | --- | --- |
| Root navigation (`RibbonPassportApp.swift`, `TerminalDock`) | Ribbons, Competitive, Settings | Current production shell differs; chosen design follows the reference labels. |
| Storage (`PCScreens.swift`, `PCStorageView`) | Box/party toggle, actual box switcher, All boxes, Wallpaper/Rename/New box, selection/preview, move/swap/drag, Pokémon actions | Selection, boxes, wallpaper, move/swap and party placement exist. Drag interaction and the exact menus still need porting. |
| Collection Options | Teams, Widgets, Add Pokémon, import/export, Try/Refresh demo, New box; competitive Team library and Showdown import | Add/edit, boxes and backup tools exist. Teams, widgets and competitive workflows are not ported. |
| Pokémon actions | Open passport/build, Edit Pokémon, Move/Cancel move, Add to party/Return to box, Export Pokémon, Delete | Partial: editing and movement exist; complete original menu, single-record export and deletion need work. |
| Passport (`StampAlbumView`) | Overview, Ribbons, Journey; options for edit/visits, notebooks/guides, export and saved versions | Current ownership/planning/history are functional. Exact shell/options and additional screens remain. |
| Overview | Title, origin/current game, owned-award gallery, ribbon descriptions/field-guide action, transfer review | Ownership/game information exists. Equipped-title editing, full gallery and original description behavior need parity work. |
| Ribbon manager (`RibbonManager.swift`) | Browse game; Earnable only; All games; All/Last chance/Later gens; page size/paging; ownership, earning locations, Memory Ribbon expansion; size marks | Domain rules and basic planning/ownership/history exist. Full filter/pager/Memory expansion/editor UI is not ported. |
| Transfer check | Generation-wide last chance/can wait, earning games, record/undo, met-level input, move to later game/undo | Domain assessment and ribbon record/undo exist. Original transfer drawer and guided transfer/check-in actions remain. |
| Journey | Milestones, Memories, Move Dex, Field guides; Games/Generations stamp grouping and paging; edit visits; per-game/generation earning history | Recorded visits/earning history are visible. Original grouping/paging/edit visits and notebook/guide screens are not ported. |
| Notebook (`PassportNotebook.swift`) | Milestones; memories with game/date/text/photo; manual Move Dex notes | Unsupported backup fields are retained; editors/views are not ported. |
| Competitive (`CompetitiveScreens.swift`) | Separate storage; team creation/member order/defaults; Showdown import/export; build/moves/EVs/IVs/nature/item/ability/Tera editing | Not ported; compatible data is retained where supported by backup preservation. |
| Settings / recovery | Appearance, app backup, reload, recovery/version history, rarity guide, credits | Backup and local persistence exist. Remaining screens and reference recovery behaviors need porting. |
| Guides / community (`CommunityScreens.swift`) | Field-guide and team-library reading/editing/import flows as defined in the reference | Not ported. Source feature parity must be distinguished from the separately planned public services. |
| Widgets | Ribbon/competitive widgets, studio customization, default selections and refresh | Native platform integration remains necessary; the website cannot reproduce iOS Home Screen widgets directly. |

Full functional parity is the target, not the state of the existing slices. Port each area against Swift behavior, data and tests. Keep account/sync/public-service work separate from the reference's local functionality. Do not claim an unported control works because it appears in a mockup.
