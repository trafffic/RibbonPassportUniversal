import test from 'node:test';
import assert from 'node:assert/strict';
import { spriteBounds } from '../src/ui/sprite-bounds';

test('remote sprite padding trims to every visible extremity, including wide and tall silhouettes', () => {
  for (const [width, height] of [
    [68, 56],
    [96, 96],
    [20, 80],
  ]) {
    const pixels = new Uint8ClampedArray(width! * height! * 4);
    const mark = (x: number, y: number, alpha: number) => {
      pixels[(y * width! + x) * 4 + 3] = alpha;
    };
    mark(2, 3, 255);
    mark(width! - 2, height! - 4, 9);
    mark(0, 0, 8); // Near-transparent padding matches the bundled artwork threshold.
    assert.deepEqual(spriteBounds(pixels, width!, height!), {
      left: 2,
      top: 3,
      width: width! - 3,
      height: height! - 6,
    });
  }
});

test('single-pixel sprites retain their pixel and empty sources can fall back', () => {
  assert.deepEqual(spriteBounds([0, 0, 0, 255], 1, 1), {
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  });
  assert.throws(() => spriteBounds([0, 0, 0, 0], 1, 1), /Empty sprite/);
});
