# Classic PC, Passport Studio and iPhone parity

Implemented 22 October 2026. The production Expo application follows the chosen Classic PC → Passport Studio desktop flow. Clicking a Pokémon's preview or Passport action opens that same record. Phones share the original iPhone composition, pixel typography, sage palette, PC wallpaper metrics and bitmap navigation symbols. Exact full-app parity is subject to the differences below and native iOS validation.

Reference inspected read-only: `RibbonPassportMain/RibbonPassport`, commit `3d16bd7042ce846a60474237b6a84526fc677d11`. No reference files were modified; nothing was committed, pushed, uploaded or published.

Only stored boxes appear. New boxes use Box 01, Box 02, etc. Imported names are retained. No invented Contest team or Next adventure categories are seeded.

| Reference area | Implemented behavior | Remaining difference |
| --- | --- | --- |
| Root / TerminalDock | Ribbons, Competitive, Settings; original bitmap icons on phones; desktop header; persistent light/dark/device appearance | Native iOS rendering and accessibility need a Mac/device pass. |
| PC storage | Original 6×5 grid and Sun/Moon wallpapers; whole contained sprites; actual box tabs; previous/next; party; All boxes; wallpaper/rename/new; search; selection and preview | Drag gestures and spatial keyboard navigation are not ported. Move plus a destination slot supports swaps. |
| Collection Options | Teams, Add Pokémon, backups, New box and search; competitive Team library and Showdown import | Demo refresh/reset controls are not ported; fresh installations still seed the original samples. Widget entries remain deferred. |
| Pokémon actions | Open passport/build, Edit, Move/Cancel move, Add to party/Return to box, individual export, confirmed deletion, undo | Individual export uses the original backup format or Showdown for competitive builds; not every Swift export destination is ported. |
| Passport | Overview/Ribbons/Journey; original phone header/options; desktop compact PC and wide Journey sidebar | Large tablets currently use the desktop Studio adaptation. |
| Overview | Hero, shiny emblem, equipped title, origin/current mascots and game colours; owned gallery/descriptions; guide links; transfer review | Descriptions use a sheet instead of an anchored SwiftUI popover. |
| Ribbon manager | Browse game; Earnable only; All games; All/Last chance/Later gens; 24/6 paging; owned/original records; Memory Ribbon originals/history; record/remove/undo; size marks | Broader screen-reader and large-font testing remains. |
| Transfer check | Generation-wide last chance/can wait; earning locations; record/undo; met-level input; compatible later-game transfer and visit retention | Historical earning-game reassignment remains. |
| Pokémon editor | Species/form, nickname, level/met level/size, shiny, gender, Shadow/Gmax, origin/current; equipped/custom title; capture marks | Widget-default controls belong to deferred widget integration. |
| Journey | Games/Generations stamps and paging; known/recorded stops; edit visits; per-game/generation earning history; four original shortcuts | Manual visits currently include all known games rather than a narrower contextual picker. |
| Notebooks | Milestones; memories with game/date/text/photo; Move Dex/HOME notes; add/edit/remove and date validation | Native photos use the document picker; a dedicated Photos-library picker is not ported. |
| Competitive | Separate boxes/party; teams, order, edit/delete/default; Showdown import/export; item/ability/nature/Tera/EV/IV/moves editor | Inline item illustrations and specialised build pickers remain. |
| Guides / team library | 25 original bundled guides covering all 423 earning award/game pairs; filters/search, locations, requirements, steps/notes/teams/sources; attributed rosters/strategies and independent personal copies | Bundled offline content, not a public contribution/publication service. |
| Source notes | Author/source links and private local notes, retained in backups | Nothing is sent to authors. |
| Settings / recovery | Appearance, backup, reload, rarity, credits; per-Pokémon/team recovery history (All / Deleted / Versions, 20 per item, 500 total) with "What will change" preview and restore to the original box/slot; older whole-collection archives listed as "Collection archive" | History starts at the first save after the update; Swift's saved-details disclosure is a plain list. |
| Artwork | Original twelve sample sprites unchanged; 27 additional team-member icons from the same PokeSprite / Gen IX PokeAPI sources; nearest-neighbour preparation; both dimensions constrained | Other unbundled species show an unavailable marker. No replacement portrait set or runtime fetch is used. |
| Widgets | Integration documented in ARCHITECTURE.md | WidgetKit/AppWidget extensions and studio remain outside this slice; no working widget control is displayed. |

Shared domain and backup code have no UI dependencies. Metadata tracks individual changed fields; competitive parties export separately; original deletions have explicit tombstones; unsupported source fields survive edits.

See [VALIDATION.md](VALIDATION.md) for checks and evidence. Actual Android phone/tablet testing is separate from browser layout checks. Native iOS/iPad validation is **blocked: the user has no Mac or cloud Mac access yet**. No iOS success is inferred from browser or Android results.

Authentication, sync, public sharing and community collection services remain deferred as originally requested. Their integration points are separate from the local guide/team-library features implemented here.
