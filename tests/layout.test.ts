import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutClass, fitColumns } from '../src/ui/layout-math';

test('layoutClass picks the breakpoint', () => {
  assert.equal(layoutClass(320), 'phone');
  assert.equal(layoutClass(699), 'phone');
  assert.equal(layoutClass(700), 'tablet');
  assert.equal(layoutClass(1099), 'tablet');
  assert.equal(layoutClass(1100), 'desktop');
  assert.equal(layoutClass(1440), 'wide');
});

test('fitColumns fits as many minimum-width columns as possible', () => {
  assert.equal(fitColumns(390, 104, 8), 3);
  assert.equal(fitColumns(1200, 104, 8), 10);
  assert.equal(fitColumns(50, 104), 1);
});
