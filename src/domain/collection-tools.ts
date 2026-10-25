import type { Collection, Pokemon } from './model';
import type { ChangeContext } from './collection';
import { gameName } from './catalog';
import { baseSpeciesID, dexNumber, speciesLabel } from './species';

export interface CollectionFilter { query: string; shiny: boolean; game: string; species: string }
const searchable = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchesPokemon(p: Pokemon, filter: CollectionFilter): boolean {
  if (filter.shiny && !p.shiny || filter.game && p.currentgame !== filter.game ||
    filter.species && baseSpeciesID(p.species) !== filter.species) return false;
  const query = filter.query.trim().replace(/^#/, '');
  if (/^\d+$/.test(query)) return dexNumber(p.species) === Number(query);
  const text = searchable(`${p.nickname} ${speciesLabel(p)} ${p.species} ${gameName(p.currentgame)}`);
  return searchable(query).split(/\s+/).every(word => text.includes(word));
}
export function sortBoxByDex(c: Collection, boxID: string, ctx: ChangeContext): Collection {
  const box = c.boxes.find(b => b.id === boxID);
  if (!box) throw new Error('Box not found.');
  const byID = new Map(c.records.map(r => [r.id, r.pokemon]));
  const slots = box.slots.filter((id): id is string => id !== null);
  if (slots.some(id => !byID.has(id))) throw new Error('This box contains an unknown Pokémon.');
  slots.sort((a, b) => (dexNumber(byID.get(a)!.species) || Infinity) - (dexNumber(byID.get(b)!.species) || Infinity));
  const next = [...slots, ...Array<null>(30 - slots.length).fill(null)];
  if (next.every((id, i) => id === box.slots[i])) return c;
  return { ...c, revision: ctx.id, layoutChanged: true,
    boxes: c.boxes.map(b => b.id === boxID ? { ...b, slots: next } : b),
    operations: [...c.operations, { ...ctx, recordID: boxID, parentRevision: c.revision, revision: ctx.id, kind: 'edit-box' }],
  };
}

// Selection and revision tokens do not mean the user's collection content changed.
export function backupContent(c: Collection): string {
  return JSON.stringify({ source: c.source, records: c.records.map(r => ({ id: r.id, pokemon: r.pokemon, changes: r.changes })),
    boxes: c.boxes, partyIDs: c.partyIDs, teams: c.teams, sourceNotes: c.sourceNotes,
    appearance: c.appearance ?? 'automatic', deletedSourceIndexes: c.deletedSourceIndexes }, (_, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
}
