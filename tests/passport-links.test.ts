import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passportLink, passportRouteID, resolvePassportID } from '../src/navigation/passport';

const id = '86895c85-0ed8-43d9-ae69-c900093925e5-pokemon-2';
const records = [{ id }, { id: 'another-pokemon' }];

test('passport links use stable short aliases and omit the default tab', () => {
  const link = passportLink(id, records, 'overview');
  assert.match(link.params.id, /^[a-z0-9]{7}$/);
  assert.equal('tab' in link.params, false);
  assert.equal(resolvePassportID(link.params.id, records), id);
  assert.equal(passportRouteID(id, [...records].reverse()), link.params.id);
  assert.equal(passportRouteID(id, [...records, { id: 'new-pokemon' }]), link.params.id);
  assert.equal(passportLink(id, records, 'ribbons').params.tab, 'ribbons');
  assert.equal(passportLink(id, records, 'journey').params.tab, 'journey');
});

test('old full-ID links still resolve and unknown or deleted aliases stay missing', () => {
  assert.equal(resolvePassportID(id, records), id);
  assert.equal(resolvePassportID('does-not-exist', records), undefined);
  assert.equal(resolvePassportID(passportRouteID(id, records), records.slice(1)), undefined);
});

test('hash collisions never resolve to the wrong Pokémon', () => {
  const ids = ['collision-1coz09e-4530', 'collision-114lu2t-40943'];
  const collisions = ids.map((id) => ({ id }));
  for (const id of ids) {
    assert.equal(passportRouteID(id, collisions), id);
    assert.equal(resolvePassportID(id, collisions), id);
  }
  assert.equal(resolvePassportID('09kpaku', collisions), undefined);
});

test('an existing record ID takes priority over a matching generated alias', () => {
  const alias = passportRouteID(id, records);
  const reserved = [...records, { id: alias }];
  assert.equal(passportRouteID(id, reserved), id);
  assert.equal(resolvePassportID(alias, reserved), alias);
  assert.equal(resolvePassportID(id, reserved), id);
});
