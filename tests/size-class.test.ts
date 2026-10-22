import test from 'node:test';
import assert from 'node:assert/strict';
import { sizeName, sizeChoices } from '../src/domain/size-class';

test('size names follow the iPhone selector', () => {
  assert.equal(sizeName(0), 'Mini');
  assert.equal(sizeName(128), 'Standard');
  assert.equal(sizeName(255), 'Jumbo');
  assert.equal(sizeName(undefined), 'Unknown');
  assert.equal(sizeName(77), 'Unknown');
  assert.deepEqual(sizeChoices.map((c) => c.name), ['Unknown', 'Mini', 'Standard', 'Jumbo']);
});
