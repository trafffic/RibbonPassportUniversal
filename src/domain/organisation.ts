import type { Box, Collection, Operation, Pokemon } from './model';
import type { ChangeContext } from './collection';
import { catalog, recordedVisits, ruleData } from './catalog';

export const editableFields = [
  'species',
  'nickname',
  'gender',
  'shiny',
  'origingame',
  'currentgame',
  'currentlevel',
  'metLevel',
  'sizeScale',
  'shadow',
  'gmax',
  'title',
  'titleText',
  'ball',
  'language',
  'trainername',
] as const;
export type PokemonDetails = Pick<Pokemon, (typeof editableFields)[number]>;
export function emptyCollection(
  id: string,
  revision: string,
  boxID: string,
  at = '2001-01-01T00:00:00Z',
): Collection {
  const boxes: Box[] = [
    { id: boxID, name: 'Box 01', slots: Array(30).fill(null) },
  ];
  const source = {
    format: 'ribbon-passport',
    version: 1,
    collection: {
      pokemon: [],
      teams: [],
      selectedID: '',
      selectedTeamID: '',
      appearance: 'automatic',
      updatedAt: (Date.parse(at) - Date.UTC(2001, 0, 1)) / 1000,
      storage: { boxes, partyIDs: [] },
    },
  };
  return {
    schemaVersion: 1,
    id,
    revision,
    source: { kind: 'app', text: JSON.stringify(source, null, 2) },
    records: [],
    boxes,
    partyIDs: [],
    selectedID: '',
    selectedBoxID: boxID,
    operations: [],
  };
}
export function blankPokemon(id: string): Pokemon {
  return {
    id,
    species: '',
    nickname: '',
    gender: '',
    shiny: false,
    origingame: '',
    currentgame: '',
    currentlevel: 5,
    shadow: false,
    gmax: false,
    title: 'None',
    titleText: '',
    ribbons: [],
    visits: undefined,
    earnedGames: undefined,
    earnedGenerations: undefined,
    metLevel: undefined,
    sizeScale: undefined,
    ball: undefined,
  };
}
function validateDetails(p: PokemonDetails, old?: Pokemon) {
  if (!catalog.pokemon[p.species] && p.species !== old?.species)
    throw new Error('Choose a species or form from the catalogue.');
  if (!p.species) throw new Error('Choose a species or form.');
  if (
    !Number.isInteger(p.currentlevel) ||
    p.currentlevel < 1 ||
    p.currentlevel > 100
  )
    throw new Error('Level must be a whole number from 1 to 100.');
  if (
    p.metLevel !== undefined &&
    (!Number.isInteger(p.metLevel) || p.metLevel < 1 || p.metLevel > 100)
  )
    throw new Error('Met level must be blank or a whole number from 1 to 100.');
  if (
    p.sizeScale !== undefined &&
    (!Number.isInteger(p.sizeScale) || p.sizeScale < 0 || p.sizeScale > 255)
  )
    throw new Error('Size must be blank or a whole number from 0 to 255.');
  for (const field of ['origingame', 'currentgame'] as const)
    if (p[field] && !ruleData.games[p[field]] && p[field] !== old?.[field])
      throw new Error('Choose a recognised game.');
  if (p.nickname.length > 64)
    throw new Error('Nickname must be 64 characters or fewer.');
  if (!['', 'male', 'female'].includes(p.gender) && p.gender !== old?.gender)
    throw new Error('Choose a recognised gender.');
}
function append(
  c: Collection,
  context: ChangeContext,
  kind: Operation['kind'],
  recordID: string,
  parent = c.revision,
): Collection {
  if (!context.id || c.operations.some((o) => o.id === context.id))
    throw new Error('Operation identity must be unique.');
  return {
    ...c,
    revision: context.id,
    operations: [
      ...c.operations,
      {
        id: context.id,
        kind,
        recordID,
        parentRevision: parent,
        revision: context.id,
        at: context.at,
      },
    ],
  };
}
export function addPokemon(
  c: Collection,
  p: Pokemon,
  boxID: string,
  context: ChangeContext,
): Collection {
  validateDetails(p);
  if (!p.id || c.records.some((r) => r.id === p.id))
    throw new Error('Pokémon identity must be unique.');
  const box = c.boxes.find((b) => b.id === boxID);
  if (!box) throw new Error('Box not found.');
  const slot = box.slots.indexOf(null);
  if (slot < 0)
    throw new Error('This box is full. Choose or create another box.');
  return append(
    {
      ...c,
      layoutChanged: true,
      selectedID: p.id,
      selectedBoxID: boxID,
      records: [
        ...c.records,
        {
          id: p.id,
          sourceIndex: -1,
          created: true,
          version: { revision: context.id, parentRevision: null },
          pokemon: { ...p, ribbons: [...p.ribbons] },
          changes: {},
        },
      ],
      boxes: c.boxes.map((b) =>
        b.id === boxID
          ? { ...b, slots: b.slots.map((id, i) => (i === slot ? p.id : id)) }
          : b,
      ),
    },
    context,
    'add-pokemon',
    p.id,
  );
}
export function editPokemon(
  c: Collection,
  id: string,
  details: PokemonDetails,
  expectedRevision: string,
  context: ChangeContext,
): Collection {
  const before = c.records.find((r) => r.id === id);
  if (!before) throw new Error('Pokémon not found.');
  if (before.version.revision !== expectedRevision)
    throw new Error(
      'This Pokémon changed while the editor was open. Reopen it before saving.',
    );
  validateDetails(details, before.pokemon);
  const p = { ...before.pokemon },
    changes = { ...before.changes };
  for (const field of editableFields)
    if (details[field] !== p[field]) {
      Object.assign(p, { [field]: details[field] });
      // JSON null is an explicit clear; undefined would disappear from saved patches.
      changes[field] = details[field] ?? null;
    }
  if (
    p.currentgame !== before.pokemon.currentgame ||
    p.origingame !== before.pokemon.origingame
  ) {
    p.visits = recordedVisits(before.pokemon);
    changes.visits = p.visits;
  }
  const after = {
    ...before,
    pokemon: p,
    changes,
    version: { revision: context.id, parentRevision: before.version.revision },
  };
  return append(
    { ...c, records: c.records.map((r) => (r.id === id ? after : r)) },
    context,
    'edit-pokemon',
    id,
    before.version.revision,
  );
}
const boxName = (name: string) => {
  const clean = name.trim();
  if (!clean || clean.length > 40)
    throw new Error('Box name must contain 1 to 40 characters.');
  return clean;
};
export function createBox(
  c: Collection,
  id: string,
  name: string,
  context: ChangeContext,
): Collection {
  if (!id || c.boxes.some((b) => b.id === id))
    throw new Error('Box identity must be unique.');
  return append(
    {
      ...c,
      layoutChanged: true,
      selectedBoxID: id,
      boxes: [
        ...c.boxes,
        { id, name: boxName(name), slots: Array(30).fill(null) },
      ],
    },
    context,
    'create-box',
    id,
  );
}
export function editBox(
  c: Collection,
  id: string,
  details: Pick<Box, 'name' | 'wallpaper'>,
  context: ChangeContext,
): Collection {
  if (!c.boxes.some((b) => b.id === id)) throw new Error('Box not found.');
  if (
    details.wallpaper?.sunMoon &&
    !/^sm(0[1-9]|1[0-6])$/.test(details.wallpaper.sunMoon)
  )
    throw new Error('Choose a bundled box wallpaper.');
  const wallpaper = details.wallpaper
    ? { strength: 0.65, ...details.wallpaper }
    : undefined;
  return append(
    {
      ...c,
      layoutChanged: true,
      boxes: c.boxes.map((b) =>
        b.id === id ? { ...b, name: boxName(details.name), wallpaper } : b,
      ),
    },
    context,
    'edit-box',
    id,
  );
}
// Matches StorageLayout.move(_:toBox:slot:) and moveToParty(_:slot:). Occupied targets swap.
export function movePokemon(
  c: Collection,
  id: string,
  target: { boxID: string; slot: number } | { partySlot: number },
  context: ChangeContext,
): Collection {
  if (!c.records.some((r) => r.id === id))
    throw new Error('Pokémon not found.');
  const competitive = !!c.records.find((r) => r.id === id)!.pokemon.showdownSet;
  const belongs = (recordID: string) =>
    !!c.records.find((r) => r.id === recordID)?.pokemon.showdownSet ===
    competitive;
  const boxes = c.boxes.map((b) => ({ ...b, slots: [...b.slots] })),
    partyIDs = [...c.partyIDs];
  const sourceBox = boxes.find((b) => b.slots.includes(id)),
    sourceSlot = sourceBox?.slots.indexOf(id),
    sourceParty = partyIDs.indexOf(id);
  if (!sourceBox && sourceParty < 0)
    throw new Error('Pokémon has no storage position.');
  let displaced: string | null;
  if ('boxID' in target) {
    const box = boxes.find((b) => b.id === target.boxID);
    if (
      !box ||
      !Number.isInteger(target.slot) ||
      target.slot < 0 ||
      target.slot >= 30
    )
      throw new Error('Choose a valid box slot.');
    if ((box.kind === 'showdown') !== competitive)
      throw new Error('Move this Pokémon within its collection.');
    displaced = box.slots[target.slot]!;
    if (displaced === id) return c;
    if (sourceBox) sourceBox.slots[sourceSlot!] = displaced;
    else if (displaced) partyIDs[sourceParty] = displaced;
    else partyIDs.splice(sourceParty, 1);
    box.slots[target.slot] = id;
  } else {
    if (
      !Number.isInteger(target.partySlot) ||
      target.partySlot < 0 ||
      target.partySlot >= 6
    )
      throw new Error('Choose a valid party slot.');
    const sectionParty = partyIDs.filter(belongs);
    const localSlot = Math.min(target.partySlot, sectionParty.length);
    const slot =
      localSlot < sectionParty.length
        ? partyIDs.indexOf(sectionParty[localSlot]!)
        : partyIDs.length;
    displaced = localSlot < sectionParty.length ? partyIDs[slot]! : null;
    if (displaced === id) return c;
    if (sourceParty >= 0) {
      if (displaced) partyIDs[sourceParty] = displaced;
      else partyIDs.splice(sourceParty, 1);
    } else sourceBox!.slots[sourceSlot!] = displaced;
    if (slot >= partyIDs.length) partyIDs.push(id);
    else partyIDs[slot] = id;
  }
  return append(
    { ...c, boxes, partyIDs, layoutChanged: true },
    context,
    'move-pokemon',
    id,
  );
}
export function restoreCollection(
  c: Collection,
  before: Collection,
  context: ChangeContext,
): Collection {
  const records = before.records.map((r) => {
    const current = c.records.find((old) => old.id === r.id);
    return current &&
      JSON.stringify(current.pokemon) !== JSON.stringify(r.pokemon)
      ? {
          ...r,
          version: {
            revision: context.id,
            parentRevision: current.version.revision,
          },
        }
      : r;
  });
  return append(
    {
      ...before,
      records,
      operations: c.id === before.id ? c.operations : before.operations,
    },
    context,
    'undo',
    before.id,
    c.revision,
  );
}
// Only the ribbon section, shaped as a ribbons.guide backup for exportSource.
export function ribbonMastersGuide(c: Collection): Collection {
  const ids = new Set(
    c.records.filter((r) => !r.pokemon.showdownSet).map((r) => r.id),
  );
  return {
    ...c,
    source: {
      kind: 'guide',
      text: JSON.stringify({ fileVersion: 5, boxes: [], pokemon: [] }),
    },
    records: c.records
      .filter((r) => ids.has(r.id))
      .map((r) => ({ ...r, sourceIndex: -1, created: true, changes: {} })),
    boxes: c.boxes
      .filter((b) => (b.kind ?? 'ribbon') === 'ribbon')
      .map((b) => ({
        ...b,
        slots: b.slots.map((id) => (id && ids.has(id) ? id : null)),
      })),
    partyIDs: c.partyIDs.filter((id) => ids.has(id)),
    layoutChanged: true,
    metadataChanged: false,
    deletedSourceIndexes: [],
    teams: undefined,
  };
}
