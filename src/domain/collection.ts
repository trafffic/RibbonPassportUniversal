import type { Collection, Operation, PassportRecord, Pokemon } from './model';
import { recordRibbon, removeRibbon } from './rules';

export interface ChangeContext { id: string; at: string }
export interface UndoToken { before: PassportRecord; afterRevision: string; award: string }
export function changeRibbon(collection: Collection, recordID: string, award: string, game: string | undefined, context: ChangeContext): { collection: Collection; undo: UndoToken } {
  const before = collection.records.find(r => r.id === recordID);
  if (!before) throw new Error('Pokémon not found.');
  const pokemon = game ? recordRibbon(before.pokemon, award, game) : removeRibbon(before.pokemon, award);
  if (!game && !before.pokemon.ribbons.includes(award)) throw new Error('This ribbon is not owned.');
  const fields: (keyof Pokemon)[] = game ? ['ribbons', 'earnedGames', 'earnedGenerations', 'visits'] : ['ribbons', 'earnedGames', 'earnedGenerations', ...(before.pokemon.title === award ? ['title', 'titleText'] as const : [])];
  const changes = { ...before.changes };
  for (const key of fields) changes[key] = pokemon[key];
  const after: PassportRecord = { ...before, pokemon, changes, version: { revision: context.id, parentRevision: before.version.revision } };
  const operation: Operation = { id: context.id, recordID, parentRevision: before.version.revision, revision: context.id, at: context.at, kind: game ? 'record-ribbon' : 'remove-ribbon', award, ...(game ? { game } : {}) };
  return { collection: { ...collection, revision: context.id, records: collection.records.map(r => r.id === recordID ? after : r), operations: [...collection.operations, operation] }, undo: { before, afterRevision: context.id, award } };
}
export function undoChange(collection: Collection, token: UndoToken, context: ChangeContext): Collection {
  const current = collection.records.find(r => r.id === token.before.id);
  if (current?.version.revision !== token.afterRevision) throw new Error('This record changed after the action. Undo cannot overwrite a newer version.');
  const restored = { ...token.before, version: { revision: context.id, parentRevision: current.version.revision } };
  return { ...collection, revision: context.id, records: collection.records.map(r => r.id === restored.id ? restored : r), operations: [...collection.operations, { id: context.id, recordID: restored.id, parentRevision: current.version.revision, revision: context.id, at: context.at, kind: 'undo', award: token.award }] };
}
