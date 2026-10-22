import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  addPokemon,
  blankPokemon,
  editPokemon,
  emptyCollection,
  movePokemon,
  type PokemonDetails,
} from '../src/domain/organisation';
import { deletePokemon, updateMetadata } from '../src/domain/passport';
import { changeRibbon } from '../src/domain/collection';
import { exportSource, importBackup } from '../src/backup/codec';
import {
  captureRecovery,
  containsItem,
  matchesVersion,
  mergeRecovery,
  recoveryChanges,
  restoreEntry,
  totalLimit,
  versionsPerItem,
  type RecoveryEntry,
} from '../src/domain/recovery';
import type { Collection } from '../src/domain/model';

let n = 0;
const id = () => `id-${++n}`;
const ctx = (name: string) => ({ id: name, at: '2026-10-21T12:00:00Z' });
const mon = (pid: string, nickname = '') => ({
  ...blankPokemon(pid),
  species: 'metagross',
  nickname,
  currentlevel: 100,
  origingame: 'emerald',
  currentgame: 'bd',
});
const base = () => {
  let c = emptyCollection('c', 'r0', 'box', '2026-10-21T12:00:00Z');
  for (const p of ['a', 'b', 'c'])
    c = addPokemon(c, mon(p, p), 'box', ctx(`add-${p}`));
  return c;
};
const details = (
  c: Collection,
  pid: string,
  patch: Partial<PokemonDetails>,
) => {
  const p = c.records.find((r) => r.id === pid)!.pokemon;
  return { ...(p as PokemonDetails), ...patch };
};
const edit = (c: Collection, pid: string, nickname: string, name: string) =>
  editPokemon(
    c,
    pid,
    details(c, pid, { nickname }),
    c.records.find((r) => r.id === pid)!.version.revision,
    ctx(name),
  );
const capture = (
  before: Collection,
  next: Collection,
  action: RecoveryEntry['action'] = 'edited',
) => captureRecovery(before, next, action, '2026-10-21T12:00:00Z', id);

test('saved edits capture the complete previous record; unchanged saves capture nothing', () => {
  const c = base();
  const next = edit(c, 'a', 'Renamed', 'e1');
  const entries = capture(c, next);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.snapshot.id, 'a');
  assert.deepEqual(entries[0]!.snapshot, c.records[0]);
  assert.equal(entries[0]!.action, 'edited');
  assert.deepEqual(capture(c, { ...c, selectedID: 'b', revision: 'sel' }), []);
  assert.deepEqual(
    capture(c, movePokemon(c, 'a', { boxID: 'box', slot: 10 }, ctx('mv'))),
    [],
  );
});

test('limits keep the newest 20 versions per item and 500 overall', () => {
  let c = base(),
    history: RecoveryEntry[] = [];
  for (let i = 0; i < 25; i++) {
    const next = edit(c, 'a', `n${i}`, `e${i}`);
    history = mergeRecovery(history, capture(c, next));
    c = next;
  }
  assert.equal(history.length, versionsPerItem);
  assert.equal(
    history[0]!.kind === 'pokemon' && history[0]!.snapshot.pokemon.nickname,
    'n23',
  );
  const many = Array.from({ length: 600 }, (_, i) => ({
    ...history[0]!,
    id: `m${i}`,
    objectID: `item-${i}`,
  })) as RecoveryEntry[];
  const merged = mergeRecovery([], many);
  assert.equal(merged.length, totalLimit);
  assert.equal(merged[0]!.id, 'm0');
});

test('deleted Pokémon return with the same ID, ribbons, original slot and team membership', () => {
  let c = base();
  c = changeRibbon(c, 'b', 'effort-ribbon', 'bd', ctx('rib')).collection;
  c = movePokemon(c, 'b', { boxID: 'box', slot: 7 }, ctx('mv'));
  c = updateMetadata(
    c,
    { teams: [{ id: 't', name: 'Team', memberIDs: ['a', 'b'] }] },
    ctx('team'),
  );
  const original = c.records.find((r) => r.id === 'b')!;
  const deleted = deletePokemon(c, 'b', ctx('del'));
  const [entry] = capture(c, deleted, 'edited').filter(
    (e) => e.kind === 'pokemon',
  );
  assert.equal(entry!.action, 'deleted');
  assert.equal(containsItem(deleted, entry!), false);
  assert.deepEqual(recoveryChanges(deleted, entry!), [
    'Return this Pokémon to your collection.',
  ]);
  const back = restoreEntry(deleted, entry!, ctx('res'), id);
  const restored = back.records.find((r) => r.id === 'b')!;
  assert.deepEqual(restored.pokemon, original.pokemon);
  assert.ok(restored.pokemon.ribbons.includes('effort-ribbon'));
  assert.equal(back.boxes[0]!.slots[7], 'b');
  assert.equal(back.records.filter((r) => r.id === 'b').length, 1);
  assert.deepEqual(back.teams![0]!.memberIDs, ['a', 'b']);
  assert.equal(matchesVersion(back, entry!), true);
});

test('recovered source records clear their tombstone and export the original entry', () => {
  const text = fs.readFileSync(
    new URL('./fixtures/native-app-v1.json', import.meta.url),
    'utf8',
  );
  const c = importBackup(text, 'test', 'initial');
  const target = c.records[0]!;
  const deleted = deletePokemon(c, target.id, ctx('del'));
  assert.deepEqual(deleted.deletedSourceIndexes, [target.sourceIndex]);
  const [entry] = capture(c, deleted);
  const back = restoreEntry(deleted, entry!, ctx('res'), id);
  assert.deepEqual(back.deletedSourceIndexes, []);
  assert.deepEqual(
    back.records.find((r) => r.id === target.id)!.pokemon,
    target.pokemon,
  );
  assert.equal(
    importBackup(exportSource(back), 'x', 'y').records.length,
    c.records.length,
  );
});

test('an occupied original slot is never displaced; the first free slot is used', () => {
  let c = base();
  const deleted = deletePokemon(c, 'a', ctx('del'));
  const [entry] = capture(c, deleted);
  const occupied = addPokemon(deleted, mon('x'), 'box', ctx('addx'));
  const taken = movePokemon(
    occupied,
    'x',
    { boxID: 'box', slot: 0 },
    ctx('mvx'),
  );
  const back = restoreEntry(taken, entry!, ctx('res'), id);
  assert.equal(back.boxes[0]!.slots[0], 'x');
  assert.equal(back.boxes[0]!.slots.filter((s) => s === 'a').length, 1);
  assert.ok(back.boxes[0]!.slots.indexOf('a') > 0);
  assert.equal(back.records.length, 4);
});

test('restoring an existing version keeps placement and can itself be reversed', () => {
  let c = base();
  const edited = edit(c, 'a', 'Changed', 'e1');
  const [entry] = capture(c, edited);
  assert.ok(
    recoveryChanges(edited, entry!).some((l) => l.startsWith('Nickname:')),
  );
  const back = restoreEntry(edited, entry!, ctx('res'), id);
  assert.equal(back.records[0]!.pokemon.nickname, 'a');
  assert.deepEqual(back.boxes, edited.boxes);
  const [reverse] = capture(edited, back, 'restored');
  assert.equal(
    reverse!.kind === 'pokemon' && reverse!.snapshot.pokemon.nickname,
    'Changed',
  );
  const again = restoreEntry(back, reverse!, ctx('res2'), id);
  assert.equal(again.records[0]!.pokemon.nickname, 'Changed');
  assert.equal(
    new Set(again.operations.map((o) => o.id)).size,
    again.operations.length,
  );
});

test('deleted teams restore only members still in the collection', () => {
  let c = base();
  c = updateMetadata(
    c,
    { teams: [{ id: 't', name: 'Team', memberIDs: ['a', 'b', 'c'] }] },
    ctx('team'),
  );
  const without = deletePokemon(c, 'b', ctx('del'));
  const gone = updateMetadata(without, { teams: [] }, ctx('rm'));
  const entry = capture(without, gone).find((e) => e.kind === 'team')!;
  assert.equal(entry.action, 'deleted');
  const back = restoreEntry(gone, entry, ctx('res'), id);
  assert.deepEqual(back.teams![0]!.memberIDs, ['a', 'c']);
  const none = updateMetadata(
    deletePokemon(deletePokemon(gone, 'a', ctx('d1')), 'c', ctx('d2')),
    { teams: [] },
    ctx('rm2'),
  );
  assert.throws(
    () => restoreEntry(none, entry, ctx('res2'), id),
    /at least one/,
  );
});
