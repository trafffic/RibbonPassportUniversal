import test from 'node:test';
import assert from 'node:assert/strict';
import { bubblePlacement } from '../src/ui/bubble-placement';
import { journeyGameChoices } from '../src/domain/rules';
import { ruleData } from '../src/domain/catalog';
import type { Pokemon } from '../src/domain/model';

test('bubble stays inside compact screens and points at edge columns', () => {
  for (const width of [320, 390]) {
    for (const x of [16, width - 60]) {
      const anchor = { x, y: 360, width: 44, height: 44 },
        p = bubblePlacement({ width, height: 650 }, anchor, 110);
      assert.ok(p.above);
      assert.ok(p.frame.x >= 12);
      assert.ok(p.frame.x + p.frame.width <= width - 12);
      assert.ok(p.frame.y + p.frame.height < anchor.y);
      assert.ok(Math.abs(p.frame.x + p.tipX - (anchor.x + 22)) <= 0.5);
    }
  }
});
test('bubble moves below high ribbons and limits tall content', () => {
  const top = { x: 100, y: 30, width: 44, height: 44 },
    below = bubblePlacement({ width: 320, height: 600 }, top, 120);
  assert.equal(below.above, false);
  assert.ok(below.frame.y > top.y + top.height);
  const middle = { x: 240, y: 330, width: 44, height: 44 },
    tall = bubblePlacement({ width: 320, height: 600 }, middle, 800);
  assert.ok(tall.above);
  assert.ok(tall.frame.y >= 12);
  assert.ok(tall.frame.y + tall.frame.height <= middle.y - 12);
  assert.ok(tall.frame.height < 800);
});
test('journey visit choices are limited to games between origin and current', () => {
  const choices = (origingame: string) =>
    journeyGameChoices({
      species: 'bulbasaur',
      origingame,
      currentgame: 'sh',
    } as Pokemon);
  const fromSwitch = choices('sw');
  assert.ok(fromSwitch.includes('sw') && fromSwitch.includes('sh'));
  assert.ok(!fromSwitch.includes('red') && !fromSwitch.includes('gold'));
  assert.ok(choices('red').includes('gold'));
  assert.ok(choices('red').length > fromSwitch.length);
  assert.ok(fromSwitch.length < Object.keys(ruleData.games).length);
});
