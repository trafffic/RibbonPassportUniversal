import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { createWebStore } from '../src/storage/index.web';
import { createSample } from '../src/domain/sample';
import { changeRibbon } from '../src/domain/collection';
import { exportSource } from '../src/backup/codec';
import { StorageConflict } from '../src/storage/types';

test('IndexedDB restores saved ribbons, visits, identities and raw source after reopening', async () => {
  const name = `restore-${crypto.randomUUID()}`, store = createWebStore(name), sample = createSample();
  assert.equal(await store.load(), null);
  await store.commit(sample, null);
  const next = changeRibbon(sample, sample.records[0]!.id, 'galar-champion-ribbon', undefined, { id: 'op', at: '' }).collection;
  await store.commit(next, sample.revision);
  const restored = await createWebStore(name).load();
  assert.deepEqual(restored, next); assert.equal(exportSource(restored!), exportSource(next));
});
test('concurrent local writes keep both branches and require explicit resolution', async () => {
  const name = `conflict-${crypto.randomUUID()}`, one = createWebStore(name), two = createWebStore(name), sample = createSample();
  await one.commit(sample, null);
  const a = changeRibbon(sample, sample.records[0]!.id, 'galar-champion-ribbon', undefined, { id: 'branch-a', at: '' }).collection;
  const b = changeRibbon(sample, sample.records[0]!.id, 'effort-ribbon', undefined, { id: 'branch-b', at: '' }).collection;
  await one.commit(a, sample.revision);
  await assert.rejects(two.commit(b, sample.revision), e => e instanceof StorageConflict && e.ours.revision === b.revision && e.theirs.revision === a.revision);
  assert.equal((await two.load())!.revision, a.revision);
  const pending = await createWebStore(name).pendingConflict();
  assert.equal(pending!.ours.revision, b.revision);
  assert.equal(pending!.theirs.revision, a.revision);
  const resolved = { ...b, revision: 'explicit-resolution' };
  await two.commit(resolved, a.revision, true);
  assert.equal((await one.load())!.revision, 'explicit-resolution');
  assert.equal(await one.pendingConflict(), null);
});
