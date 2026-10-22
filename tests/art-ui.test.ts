import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { normaliseName, itemKey, consoleKey, tintHex, tierColour } from '../src/domain/art-ui';

test('item names normalise like the iPhone catalogue', () => {
  assert.equal(normaliseName('Choice Scarf'), 'choicescarf');
  assert.equal(normaliseName('Poké Ball'), 'pokeball');
  assert.equal(itemKey('Life Orb'), 'item-lifeorb');
});

test('common held items resolve to bundled images', () => {
  for (const item of ['Choice Scarf', 'Leftovers', 'Life Orb', 'Focus Sash'])
    assert.ok(existsSync(`assets/art/${itemKey(item)}.png`), item);
});

test('origin consoles resolve to bundled images in both appearances', () => {
  const key = consoleKey('emerald');
  assert.equal(key, 'console-gba');
  for (const mode of ['light', 'dark'])
    assert.ok(existsSync(`assets/art/${key}-${mode}.png`));
  assert.equal(consoleKey('not-a-game'), undefined);
});

test('tints and rarity tiers come from the original data', () => {
  assert.match(tintHex('award-alert-ribbon', true)!, /^#[0-9A-F]{6}$/i);
  assert.equal(tintHex('award-nope', true), undefined);
  assert.match(tierColour('cool-ribbon-hoenn'), /^#/);
  assert.equal(tierColour('missing'), '#ABB6BF');
});
