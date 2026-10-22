import test from 'node:test';
import assert from 'node:assert/strict';
import { clampInt, isoToday, searchChoices } from '../src/ui/form-logic';
import { validDate } from '../src/domain/passport';
test('stepper input clamps like the Swift Level stepper', () => {
  assert.equal(clampInt(0, 1, 100), 1);
  assert.equal(clampInt(101, 1, 100), 100);
});
test('Date known defaults to a valid stored YYYY-MM-DD date', () => {
  assert.equal(isoToday(new Date(2024, 1, 9)), '2024-02-09');
  assert.ok(validDate(isoToday()));
});
test('searchable choices match name or id, case-insensitively', () => {
  const rows = [
    { id: 'gardevoir', name: '#0282 Gardevoir' },
    { id: 'metagross', name: '#0376 Metagross' },
  ];
  assert.equal(searchChoices(rows, '  ').length, 2);
  assert.deepEqual(searchChoices(rows, 'META'), [rows[1]]);
  assert.deepEqual(searchChoices(rows, '0282'), [rows[0]]);
  assert.deepEqual(searchChoices(rows, 'zzz'), []);
});
