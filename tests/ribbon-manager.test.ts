import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importBackup, exportSource } from '../src/backup/codec';
import { assignGame } from '../src/domain/collection';
import { assignableGames } from '../src/domain/rules';
import { nextPageSize, validPageSize } from '../src/domain/ribbon-view';
import { restoreCollection } from '../src/domain/organisation';

const backup = (extra: object = {}) =>
  JSON.stringify({
    format: 'ribbon-passport',
    version: 1,
    collection: {
      pokemon: [
        {
          id: 'p1',
          species: 'metagross',
          ribbons: ['effort-ribbon'],
          currentgame: 'bd',
          origingame: 'emerald',
          currentlevel: 100,
          shiny: false,
          metLevel: 50,
          earnedGenerations: { 'effort-ribbon': 8 },
          visits: [
            { id: 'v1', game: 'emerald' },
            { id: 'v2', game: 'bd' },
          ],
          ...extra,
        },
      ],
      teams: [],
      selectedID: 'p1',
    },
  });
const stamp = (id: string) => ({ id, at: '2026-10-21T12:00:00Z' });

test('Set game offers only visited, compatible games of the recorded generation', () => {
  const p = importBackup(backup(), 'i', 'r').records[0]!.pokemon;
  assert.deepEqual(assignableGames(p, 'effort-ribbon'), ['bd']);
  assert.deepEqual(
    assignableGames(
      { ...p, earnedGames: { 'effort-ribbon': 'bd' } },
      'effort-ribbon',
    ),
    [],
  );
  assert.deepEqual(assignableGames(p, 'alert-ribbon'), []);
});
test('Set game assigns the earning game, keeps other fields and is undoable', () => {
  const c = importBackup(backup(), 'i', 'r');
  const next = assignGame(c, 'p1', 'effort-ribbon', 'bd', stamp('op'));
  const p = next.records[0]!.pokemon;
  assert.equal(p.earnedGames?.['effort-ribbon'], 'bd');
  assert.equal(p.earnedGenerations?.['effort-ribbon'], 8);
  assert.equal(next.operations.at(-1)!.kind, 'assign-game');
  assert.equal(
    JSON.parse(exportSource(next)).collection.pokemon[0].earnedGames[
      'effort-ribbon'
    ],
    'bd',
  );
  assert.throws(
    () => assignGame(c, 'p1', 'effort-ribbon', 'emerald', stamp('x')),
    /cannot be assigned/,
  );
  const undone = restoreCollection(next, c, stamp('undo'));
  assert.equal(
    undone.records[0]!.pokemon.earnedGames?.['effort-ribbon'],
    undefined,
  );
});
test('ribbon page size cycles 12, 24, 6 and normalises stored values like Swift', () => {
  assert.deepEqual([12, 24, 6].map(nextPageSize), [24, 6, 12]);
  assert.deepEqual(
    [8, 16, 32, 24, 6, null, 'x'].map(validPageSize),
    [12, 12, 24, 24, 6, 12, 12],
  );
});
test('page size persists through the web preference store and survives storage failures', async () => {
  const data = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
  const { loadPageSize, savePageSize } =
    await import('../src/state/pagePreference.web');
  assert.equal(await loadPageSize(), 12);
  await savePageSize(24);
  assert.equal(await loadPageSize(), 24);
  (globalThis as any).localStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  assert.equal(await loadPageSize(), 12);
  await savePageSize(6);
  delete (globalThis as any).localStorage;
});
