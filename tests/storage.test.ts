import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { createWebStore } from '../src/storage/index.web';
import { createSample } from '../src/domain/sample';
import { changeRibbon } from '../src/domain/collection';
import { exportSource } from '../src/backup/codec';
import { StorageConflict } from '../src/storage/types';
import { captureRecovery } from '../src/domain/recovery';
test('recovery history is chronological and selection-only saves do not create recovery copies', async () => {
  const store = createWebStore(`history-${crypto.randomUUID()}`),
    sample = createSample();
  await store.commit(sample, null);
  const selected = {
    ...sample,
    selectedID: sample.records[1]!.id,
    revision: 'selection',
  };
  await store.commit(selected, sample.revision);
  assert.equal((await store.history()).length, 0);
  const first = changeRibbon(
    selected,
    selected.records[0]!.id,
    'galar-champion-ribbon',
    undefined,
    { id: 'z-first', at: '2026-10-21T12:00:00Z' },
  ).collection;
  await store.commit(first, selected.revision);
  const second = changeRibbon(
    first,
    first.records[0]!.id,
    'effort-ribbon',
    undefined,
    { id: 'a-second', at: '2026-10-21T12:00:01Z' },
  ).collection;
  await store.commit(second, first.revision);
  const history = await store.history();
  assert.equal(history[0]!.revision, 'z-first');
  assert.equal(history.length, 2);
});

test('IndexedDB restores saved ribbons, visits, identities and raw source after reopening', async () => {
  const name = `restore-${crypto.randomUUID()}`,
    store = createWebStore(name),
    sample = createSample();
  assert.equal(await store.load(), null);
  await store.commit(sample, null);
  const next = changeRibbon(
    sample,
    sample.records[0]!.id,
    'galar-champion-ribbon',
    undefined,
    { id: 'op', at: '' },
  ).collection;
  await store.commit(next, sample.revision);
  const restored = await createWebStore(name).load();
  assert.deepEqual(restored, next);
  assert.equal(exportSource(restored!), exportSource(next));
});
test('concurrent local writes keep both branches and require explicit resolution', async () => {
  const name = `conflict-${crypto.randomUUID()}`,
    one = createWebStore(name),
    two = createWebStore(name),
    sample = createSample();
  await one.commit(sample, null);
  const a = changeRibbon(
    sample,
    sample.records[0]!.id,
    'galar-champion-ribbon',
    undefined,
    { id: 'branch-a', at: '' },
  ).collection;
  const b = changeRibbon(
    sample,
    sample.records[0]!.id,
    'effort-ribbon',
    undefined,
    { id: 'branch-b', at: '' },
  ).collection;
  await one.commit(a, sample.revision);
  await assert.rejects(
    two.commit(b, sample.revision),
    (e) =>
      e instanceof StorageConflict &&
      e.ours.revision === b.revision &&
      e.theirs.revision === a.revision,
  );
  assert.equal((await two.load())!.revision, a.revision);
  const pending = await createWebStore(name).pendingConflict();
  assert.equal(pending!.ours.revision, b.revision);
  assert.equal(pending!.theirs.revision, a.revision);
  const resolved = { ...b, revision: 'explicit-resolution' };
  await two.commit(resolved, a.revision, true);
  assert.equal((await one.load())!.revision, 'explicit-resolution');
  assert.equal(await one.pendingConflict(), null);
});

test('recovery entries commit atomically with the collection and a failed save leaves both unchanged', async () => {
  const store = createWebStore(`recovery-${crypto.randomUUID()}`),
    sample = createSample();
  await store.commit(sample, null);
  assert.deepEqual(await store.recovery(), []);
  const next = changeRibbon(
    sample,
    sample.records[0]!.id,
    'galar-champion-ribbon',
    undefined,
    { id: 'edit-1', at: '2026-10-21T12:00:00Z' },
  ).collection;
  const entries = captureRecovery(sample, next, 'edited', '2026-10-21T12:00:00Z', () =>
    crypto.randomUUID(),
  );
  assert.equal(entries.length, 1);
  await store.commit(next, sample.revision, false, entries);
  assert.equal((await store.recovery()).length, 1);
  const stale = { ...next, revision: 'stale-write' };
  await assert.rejects(
    store.commit(stale, sample.revision, false, [{ ...entries[0]!, id: 'lost' }]),
    StorageConflict,
  );
  assert.deepEqual(
    (await store.recovery()).map((e) => e.id),
    entries.map((e) => e.id),
  );
  assert.equal((await store.load())!.revision, next.revision);
});
