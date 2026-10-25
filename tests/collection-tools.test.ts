import test from 'node:test';
import assert from 'node:assert/strict';
import { createSample } from '../src/domain/sample';
import { applyDemo } from '../src/domain/sample';
import { matchesPokemon, sortBoxByDex, backupContent } from '../src/domain/collection-tools';
import { dexNumber } from '../src/domain/species';
import { emptyCollection, ensureDefaultBoxes, restoreCollection } from '../src/domain/organisation';
import { importBackup, exportUniversal } from '../src/backup/codec';

const ctx = { id: 'sort-operation', at: '2026-10-25T12:00:00Z' };
test('box sorting is stable, preserves identities and other boxes, and can be undone', () => {
  const c = createSample(), box = c.boxes[0]!;
  const before = structuredClone(c);
  const sorted = sortBoxByDex(c, box.id, ctx);
  assert.deepEqual(c, before);
  const slots = sorted.boxes[0]!.slots.filter((id): id is string => !!id);
  const numbers = slots.map(id => dexNumber(c.records.find(r => r.id === id)!.pokemon.species));
  assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
  assert.deepEqual(new Set(slots), new Set(box.slots.filter(Boolean)));
  assert.equal(sorted.records, c.records);
  assert.equal(sorted.partyIDs, c.partyIDs);
  assert.deepEqual(restoreCollection(sorted, c, { ...ctx, id: 'undo-sort' }).boxes, c.boxes);
  assert.equal(sortBoxByDex(sorted, box.id, { ...ctx, id: 'no-change' }), sorted);
});

test('collection filters combine exact dex, shiny, species, game, and accent-insensitive text', () => {
  const p = { ...createSample().records[0]!.pokemon, species: 'pikachu-alola', nickname: 'Éclair', shiny: true, currentgame: 'us' };
  const filter = { query: '', shiny: false, species: '', game: '' };
  assert.ok(matchesPokemon(p, { ...filter, query: '#0025' }));
  assert.ok(!matchesPokemon(p, { ...filter, query: '2' }));
  assert.ok(matchesPokemon(p, { query: 'eclair alola cap', shiny: true, species: 'pikachu', game: 'us' }));
  assert.ok(!matchesPokemon(p, { ...filter, game: 'as' }));
  assert.ok(!matchesPokemon({ ...p, shiny: false }, { ...filter, shiny: true }));
});

test('backup content ignores navigation while detecting edits, goals, and layout changes', () => {
  const c = createSample(), fingerprint = backupContent(c);
  assert.equal(backupContent({ ...c, revision: 'selection', selectedID: 'other', selectedBoxID: 'other' }), fingerprint);
  assert.equal(backupContent(importBackup(exportUniversal(c), 'i', 'r')), fingerprint);
  assert.notEqual(backupContent(sortBoxByDex(c, c.boxes[0]!.id, ctx)), fingerprint);
  const changed = structuredClone(c);
  changed.records[0]!.pokemon.ribbonGoal = { award: 'effort-ribbon', game: 'as' };
  assert.notEqual(backupContent(changed), fingerprint);
});

test('first-run demo normalization and saved preference defaults do not mark a backup as changed', () => {
  let i = 0;
  const initial = ensureDefaultBoxes(emptyCollection('c', 'r', 'box'), { ...ctx, id: 'default-competitive' }, 'showdown');
  const demo = applyDemo(initial, { ...ctx, id: 'demo' }, () => `new-${++i}`);
  const reopened = importBackup(exportUniversal(demo), 'i', 'r');
  assert.equal(backupContent(reopened), backupContent(demo));
});
