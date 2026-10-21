import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, displayedAwards, earningLocation, recordedVisits, ruleData } from '../src/domain/catalog';
import { compatibleGames, earningGames, generationEarningGames, laterGames, recordRibbon, removeRibbon, ribbonIDs, transferCheck, unavailableReason } from '../src/domain/rules';
import { changeRibbon, undoChange } from '../src/domain/collection';
import { createSample } from '../src/domain/sample';
import type { Pokemon } from '../src/domain/model';

export function pokemon(patch: Partial<Pokemon> = {}): Pokemon {
  return { id: 'test-pokemon', species: 'metagross', nickname: '', gender: '', shiny: false, currentgame: 'as', origingame: 'emerald', shadow: false, gmax: false, currentlevel: 100, title: 'None', titleText: '', ribbons: [], ...patch };
}
test('bundled catalogue and six authored samples load without network', () => {
  assert.equal(Object.keys(ruleData.species).length, 1549);
  assert.equal(Object.keys(ruleData.awards).length, 159);
  assert.equal(createSample().records.length, 6);
  assert.deepEqual(createSample().boxes.map(box => box.name), ['Box 01']);
  assert.equal(new Set(createSample().records.map(r => r.id)).size, 6);
});
test('eligibility: level-50 winning limit, event and automatic awards', () => {
  const p = pokemon({ currentgame: 'emerald', currentlevel: 51, origingame: 'colosseum' });
  assert.ok(unavailableReason('winning-ribbon', 'emerald', p));
  assert.equal(unavailableReason('winning-ribbon', 'emerald', { ...p, currentlevel: 50 }), null);
  assert.throws(() => recordRibbon(p, 'contest-memory-ribbon', 'as'));
  assert.throws(() => recordRibbon(p, 'world-ribbon', 'emerald'));
});
test('National Ribbon requires a valid shadow species and origin', () => {
  const p = pokemon({ currentgame: 'emerald', origingame: 'colosseum' });
  assert.ok(unavailableReason('national-ribbon', 'colosseum', p));
  assert.equal(unavailableReason('national-ribbon', 'colosseum', { ...p, shadow: true }), null);
  assert.ok(unavailableReason('national-ribbon', 'colosseum', { ...p, shadow: true, origingame: 'ruby' }));
});
test('Battle Tree mythical restriction differs between Sun and Ultra Sun', () => {
  const p = pokemon({ species: 'mew', currentgame: 'sun' });
  assert.ok(unavailableReason('battle-tree-great-ribbon', 'sun', p));
  assert.equal(unavailableReason('battle-tree-great-ribbon', 'usun', p), null);
});
test('transfer check covers other games in the whole departure generation', () => {
  let p = pokemon({ metLevel: 5, ribbons: ribbonIDs.filter(id => id !== 'kalos-champion-ribbon') });
  let check = transferCheck('as', p);
  assert.deepEqual(check.lastChance, ['kalos-champion-ribbon']);
  assert.equal(check.nextGeneration, 7); assert.equal(check.isSafe, false);
  assert.deepEqual(generationEarningGames('kalos-champion-ribbon', 'as', p), ['x', 'y']);
  p = recordRibbon(p, 'kalos-champion-ribbon', 'x');
  check = transferCheck('as', p);
  assert.equal(check.isSafe, true);
  assert.equal(p.currentgame, 'as');
  assert.equal(p.earnedGames?.['kalos-champion-ribbon'], 'x');
});
test('Footprint transfer boundary at 70/71 overrides old met-level data', () => {
  const p = pokemon({ currentgame: 'platinum', currentlevel: 70, metLevel: 5, ribbons: ribbonIDs.filter(id => id !== 'footprint-ribbon') });
  assert.equal(transferCheck('platinum', p).isSafe, true);
  assert.ok(laterGames('footprint-ribbon', 'platinum', p).includes('bd'));
  assert.deepEqual(transferCheck('platinum', { ...p, currentlevel: 71 }).lastChance, ['footprint-ribbon']);
  assert.ok(unavailableReason('footprint-ribbon', 'bd', { ...p, currentlevel: 71 }));
});
test('voiceless BDSP exception and unknown met level remain distinct', () => {
  const voiced = pokemon({ species: 'mew', currentgame: 'bd' });
  assert.ok(unavailableReason('footprint-ribbon', 'bd', voiced));
  assert.equal(unavailableReason('footprint-ribbon', 'bd', { ...voiced, metLevel: 70 }), null);
  assert.ok(unavailableReason('footprint-ribbon', 'bd', { ...voiced, metLevel: 71 }));
  assert.equal(unavailableReason('footprint-ribbon', 'bd', { ...voiced, species: 'regigigas', metLevel: 100 }), null);
});
test('unresolved Footprint warning blocks an otherwise safe transfer', () => {
  const p = pokemon({ species: 'mew', ribbons: ribbonIDs.filter(id => !['footprint-ribbon', 'skillful-battler-ribbon', 'expert-battler-ribbon'].includes(id)) });
  assert.equal(transferCheck('as', p).isSafe, false);
  assert.equal(transferCheck('as', p).warnings.length, 1);
  assert.equal(transferCheck('as', { ...p, metLevel: 70 }).isSafe, true);
});
test('no later destination and incompatible current game are never marked safe', () => {
  assert.equal(transferCheck('', pokemon()).canAssess, false);
  assert.equal(transferCheck('red', pokemon()).canAssess, false);
  const p = pokemon({ species: 'pikachu-cosplay', ribbons: ribbonIDs });
  assert.equal(transferCheck('as', p).canAssess, true);
  assert.equal(transferCheck('as', p).nextGeneration, undefined);
  assert.equal(transferCheck('as', p).isSafe, false);
  assert.deepEqual(generationEarningGames('effort-ribbon', 'rse', pokemon()), []);
});
test('species-specific later destinations change last-chance contest availability', () => {
  assert.ok(laterGames('coolness-master-ribbon', 'as', pokemon({ species: 'mew' })).includes('bd'));
  assert.deepEqual(laterGames('coolness-master-ribbon', 'as', pokemon({ species: 'victini', origingame: 'black' })), []);
});
test('Gmax, GO Safari, Spinda and Nincada transfer restrictions', () => {
  assert.deepEqual(compatibleGames(pokemon({ species: 'pikachu', currentgame: 'sw', gmax: true })), ['sw', 'sh']);
  // The reference treats GO as a service; no ordinary earning game is reachable with this ball.
  assert.deepEqual(compatibleGames(pokemon({ species: 'pikachu', currentgame: 'go', ball: 'go-safari' })), []);
  assert.ok(!compatibleGames(pokemon({ species: 'spinda', currentgame: 'as' })).includes('bd'));
  assert.deepEqual(compatibleGames(pokemon({ species: 'spinda', currentgame: 'bd' })), ['bd', 'sp']);
  assert.ok(!compatibleGames(pokemon({ species: 'nincada', currentgame: 'sw', origingame: 'ruby' })).includes('bd'));
});
test('post-capture marks are managed, size marks require confirmed endpoints', () => {
  const p = pokemon({ species: 'sylveon', currentgame: 'scar', origingame: 'scar' });
  for (const id of ['partner-mark', 'gourmand-mark', 'itemfinder-mark']) assert.ok(recordRibbon(p, id, 'scar').ribbons.includes(id));
  assert.throws(() => recordRibbon(p, 'mini-mark', 'scar'));
  assert.ok(recordRibbon({ ...p, sizeScale: 0 }, 'mini-mark', 'scar').ribbons.includes('mini-mark'));
  assert.ok(recordRibbon({ ...p, sizeScale: 255 }, 'jumbo-mark', 'scar').ribbons.includes('jumbo-mark'));
  const check = transferCheck('scar', p);
  assert.ok(!check.lastChance.includes('mini-mark')); assert.ok(!check.lastChance.includes('jumbo-mark'));
});
test('Memory Ribbons consolidate 40 contest originals without changing their history', () => {
  const originals = Object.keys(catalog.merges).filter(id => catalog.merges[id] === 'contest');
  assert.equal(originals.length, 40);
  const p = pokemon({ ribbons: originals, earnedGames: { [originals[0]!]: 'ruby' } });
  const before = JSON.stringify(p);
  assert.deepEqual(displayedAwards({ ...p, currentgame: 'platinum' }).sort(), [...originals].sort());
  assert.deepEqual(displayedAwards(p), ['contest-memory-ribbon-gold']);
  assert.equal(JSON.stringify(p), before);
  assert.deepEqual(displayedAwards({ ...p, ribbons: originals.slice(1) }), ['contest-memory-ribbon']);
  assert.equal(earningLocation(p, originals[0]!), 'Ruby');
});
test('Battle Memory gold threshold changes from eight to seven in Gen IX and HOME', () => {
  const originals = Object.keys(catalog.merges).filter(id => catalog.merges[id] === 'battle').slice(0, 7);
  const p = pokemon({ ribbons: originals });
  assert.deepEqual(displayedAwards(p), ['battle-memory-ribbon']);
  for (const game of ['scar', 'vio', 'home', 'homeza']) assert.deepEqual(displayedAwards({ ...p, currentgame: game }), ['battle-memory-ribbon-gold']);
});
test('explicit Memory imports and marks survive without duplicate icons', () => {
  const p = pokemon({ ribbons: ['contest-memory-ribbon-gold', 'contest-memory-ribbon', 'cool-ribbon-hoenn', 'rare-mark'] });
  assert.deepEqual(new Set(displayedAwards(p)), new Set(['contest-memory-ribbon-gold', 'rare-mark']));
  assert.deepEqual(displayedAwards(pokemon({ ribbons: ['battle-memory-ribbon'] })), ['battle-memory-ribbon']);
});
test('recording is specific to one game and cannot overwrite owned history', () => {
  const p = pokemon({ currentgame: 'bd', metLevel: 50 });
  const recorded = recordRibbon(p, 'effort-ribbon', 'bd');
  assert.equal(recorded.earnedGames?.['effort-ribbon'], 'bd');
  assert.equal(recorded.earnedGenerations?.['effort-ribbon'], 8);
  assert.throws(() => recordRibbon(recorded, 'effort-ribbon', 'sp'));
  assert.deepEqual(earningGames('effort-ribbon', recorded), []);
  assert.deepEqual(p.ribbons, []);
  const removed = removeRibbon({ ...recorded, title: 'effort-ribbon', titleText: 'the Once Well-Trained' }, 'effort-ribbon');
  assert.equal(removed.title, 'None'); assert.equal(removed.titleText, '');
  assert.equal(removed.earnedGames?.['effort-ribbon'], undefined);
  assert.equal(recordRibbon(removed, 'effort-ribbon', 'sp').earnedGames?.['effort-ribbon'], 'sp');
});
test('Journey contains recorded games and endpoints, never intermediate guesses', () => {
  const p = pokemon({ currentgame: 'scar', origingame: 'ruby', visits: [{ id: 'old', game: 'as' }, { id: 'duplicate', game: 'as' }], earnedGames: { 'kalos-champion-ribbon': 'x' } });
  assert.deepEqual(recordedVisits(p).map(v => v.game), ['ruby', 'x', 'as', 'scar']);
  assert.equal(recordedVisits(p).find(v => v.game === 'as')!.id, 'old');
  assert.equal(earningLocation({ ...p, earnedGenerations: { 'effort-ribbon': 3 } }, 'effort-ribbon'), 'Gen 3 · Game not set');
});
test('undo restores exact history and rejects a stale record version', () => {
  const c = createSample(), id = c.records[0]!.id;
  const result = changeRibbon(c, id, 'galar-champion-ribbon', undefined, { id: 'operation-1', at: '2026-10-21T12:00:00Z' });
  const restored = undoChange(result.collection, result.undo, { id: 'operation-2', at: '2026-10-21T12:01:00Z' });
  assert.deepEqual(restored.records[0]!.pokemon, c.records[0]!.pokemon);
  assert.deepEqual(restored.records[0]!.changes, c.records[0]!.changes);
  assert.equal(restored.records[0]!.version.parentRevision, 'operation-1');
  const changed = changeRibbon(result.collection, id, 'effort-ribbon', undefined, { id: 'operation-3', at: '2026-10-21T12:02:00Z' });
  assert.throws(() => undoChange(changed.collection, result.undo, { id: 'bad-undo', at: '' }));
});
