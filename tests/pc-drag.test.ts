import test from 'node:test';
import assert from 'node:assert/strict';
import { hitTest, pageIndex, pcFrames } from '../src/ui/pc-drag';
const metrics = {
    width: 208,
    height: 192,
    x: 8,
    y: 36,
    gridWidth: 192,
    gridHeight: 150,
    columns: 6,
    rows: 5,
  },
  art = { x: 50, y: 0, width: 208, height: 192 },
  party = [
    { x: 3, y: 20, width: 37, height: 30 },
    { x: 3, y: 53, width: 37, height: 30 },
  ];
test('hit-testing finds box slots in row-major order', () => {
  const frames = pcFrames(metrics, art, party);
  assert.deepEqual(hitTest({ x: 50 + 8 + 5, y: 36 + 5 }, frames), {
    kind: 'box',
    slot: 0,
  });
  assert.deepEqual(
    hitTest({ x: 50 + 8 + 32 * 5 + 5, y: 36 + 30 * 4 + 5 }, frames),
    {
      kind: 'box',
      slot: 29,
    },
  );
  assert.deepEqual(hitTest({ x: 50 + 8 + 32 + 5, y: 36 + 30 + 5 }, frames), {
    kind: 'box',
    slot: 7,
  });
});
test('hit-testing finds party slots and box arrows, and misses outside', () => {
  const frames = pcFrames(metrics, art, party);
  assert.deepEqual(hitTest({ x: 10, y: 60 }, frames), {
    kind: 'party',
    slot: 1,
  });
  assert.deepEqual(hitTest({ x: 50 + 40, y: 20 }, frames), {
    kind: 'page',
    direction: -1,
  });
  assert.deepEqual(hitTest({ x: 50 + 164, y: 20 }, frames), {
    kind: 'page',
    direction: 1,
  });
  assert.equal(hitTest({ x: 0, y: 190 }, frames), null);
  assert.equal(hitTest({ x: 50 + 20, y: 10 }, frames), null);
  assert.equal(hitTest({ x: 50 + 8 + 192, y: 40 }, frames), null);
});
test('empty rects never match and pages wrap', () => {
  assert.equal(
    hitTest({ x: 1, y: 1 }, [
      {
        target: { kind: 'party', slot: 0 },
        rect: { x: 0, y: 0, width: 0, height: 5 },
      },
    ]),
    null,
  );
  assert.equal(pageIndex(0, 3, -1), 2);
  assert.equal(pageIndex(2, 3, 1), 0);
});
