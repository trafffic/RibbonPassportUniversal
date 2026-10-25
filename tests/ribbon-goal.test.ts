import test from 'node:test';
import assert from 'node:assert/strict';
import { createSample } from '../src/domain/sample';
import { patchPassport } from '../src/domain/passport';
import { earningGames, managedAwardIDs } from '../src/domain/rules';
import { exportSource, exportUniversal, importBackup, exportRibbonsGuide } from '../src/backup/codec';
import { captureRecovery, recoveryChanges, restoreEntry } from '../src/domain/recovery';
import { changeRibbon, undoChange } from '../src/domain/collection';

const ctx = { id: 'pin-goal', at: '2026-10-25T12:00:00Z' };
test('ribbon goals survive all backup formats and can be explicitly cleared', () => {
  const c = createSample(), r = c.records[0]!;
  const award = managedAwardIDs.find(id => earningGames(id, r.pokemon).length)!;
  const goal = { award, game: earningGames(award, r.pokemon)[0]! };
  const next = patchPassport(c, r.id, { ribbonGoal: goal }, r.version.revision, ctx);
  for (const text of [exportSource(next), exportUniversal(next), exportRibbonsGuide(next)]) {
    const imported = importBackup(text, 'reimport', 'revision');
    assert.deepEqual(imported.records[0]!.pokemon.ribbonGoal, goal);
  }
  const cleared = patchPassport(next, r.id, { ribbonGoal: null }, ctx.id, { ...ctx, id: 'clear-goal' });
  assert.equal(importBackup(exportUniversal(cleared), 'i', 'r').records[0]!.pokemon.ribbonGoal, null);
  assert.equal(importBackup(exportSource(cleared), 'i', 'r').records[0]!.pokemon.ribbonGoal, null);
  const entry = captureRecovery(next, cleared, 'edited', ctx.at, () => 'recovery')[0]!;
  assert.ok(recoveryChanges(cleared, entry).includes('Restore the saved ribbon goal.'));
  assert.deepEqual(restoreEntry(cleared, entry, { ...ctx, id: 'restore-goal' }, () => 'new-id').records[0]!.pokemon.ribbonGoal, goal);
});

test('goal validation rejects impossible games, owned awards, capture-only marks, and stale edits', () => {
  const c = createSample(), r = c.records[0]!;
  for (const goal of [{ award: 'effort-ribbon', game: 'not-a-game' }, { award: 'world-ribbon', game: 'as' }, { award: 'rare-mark', game: 'sw' }]) {
    assert.throws(() => patchPassport(c, r.id, { ribbonGoal: goal }, r.version.revision, ctx));
  }
  assert.throws(() => patchPassport(c, r.id, { ribbonGoal: null }, 'stale', ctx));
  const owned = { ...c, records: c.records.map(row => row.id === r.id ? { ...row, pokemon: { ...row.pokemon, ribbons: [...row.pokemon.ribbons, 'effort-ribbon'] } } : row) };
  assert.throws(() => patchPassport(owned, r.id, { ribbonGoal: { award: 'effort-ribbon', game: 'as' } }, r.version.revision, ctx));
});

test('goals support marks earned after capture', () => {
  const c = createSample(), r = c.records.find(row => row.pokemon.species === 'metagross')!;
  const next = patchPassport(c, r.id, { ribbonGoal: { award: 'partner-mark', game: 'scar' } }, r.version.revision, ctx);
  assert.equal(next.records.find(row => row.id === r.id)!.pokemon.ribbonGoal?.award, 'partner-mark');
  const earned = changeRibbon(next, r.id, 'partner-mark', 'scar', { ...ctx, id: 'earn-mark' });
  const pokemon = earned.collection.records.find(row => row.id === r.id)!.pokemon;
  assert.ok(pokemon.ribbons.includes(pokemon.ribbonGoal!.award));
  const undone = undoChange(earned.collection, earned.undo, { ...ctx, id: 'undo-mark' });
  assert.equal(undone.records.find(row => row.id === r.id)!.pokemon.ribbonGoal?.award, 'partner-mark');
  assert.ok(!undone.records.find(row => row.id === r.id)!.pokemon.ribbons.includes('partner-mark'));
});
