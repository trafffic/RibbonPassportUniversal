import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSource, exportUniversal, importBackup, parseJSON, serializeJSON, validateCollection } from '../src/backup/codec';
import { changeRibbon, undoChange } from '../src/domain/collection';
import { createSample } from '../src/domain/sample';

const fixture = `{
  "format":"ribbon-passport", "version":1, "futureRoot":{"counter":9123372036854000123,"decimal":2.370},
  "collection": {
    "pokemon":[{"id":"swift-uuid","species":"metagross","ribbons":[],"currentgame":"bd","origingame":"emerald","currentlevel":100,"shiny":false,
      "metLevel":50,"journal":[{"id":"journal-1","text":"Hello 🌱","photos":["data:image/png;base64,AA=="]}],
      "visits":[{"id":"visit-uuid","game":"emerald","futureDate":123.450}],"savedBuilds":[{"moves":["Protect"]}],"futurePokemon":{"anything":[null,true,42]}}],
    "teams":[{"id":"team-id","name":"My team","memberIDs":["swift-uuid"],"futureTeam":true}],
    "selectedID":"swift-uuid","updatedAt":812345678.123456,"appearance":"dark",
    "widgetPresets":[{"id":"widget-1","unknown":"keep"}],"recoveryHistory":[{"unknown":"keep"}],"sourceNotes":{"x":"keep"},
    "storage":{"boxes":[{"id":"box-uuid","name":"Old box","slots":["swift-uuid"],"wallpaper":{"future":"keep"}}],"partyIDs":[]},
    "futureCollection":{"retained":true}
  }
}`;
const changed = (text: string) => {
  const c = importBackup(text, 'import-id', 'revision-0');
  return changeRibbon(c, c.records[0]!.id, 'effort-ribbon', 'bd', { id: 'operation-1', at: '2026-10-21T12:00:00Z' });
};
test('untouched Swift app backup exports byte-for-byte, including dates, fields, attachments and large numbers', () => {
  const c = importBackup(fixture, 'import-id', 'revision-0');
  assert.equal(exportSource(c), fixture);
  assert.equal(c.records[0]!.id, 'swift-uuid');
  assert.equal(c.boxes[0]!.id, 'box-uuid');
});
test('editing overlays only intentional ribbon/history fields on an app backup', () => {
  const result = changed(fixture), source = exportSource(result.collection);
  assert.ok(source.includes('9123372036854000123')); assert.ok(source.includes('2.370')); assert.ok(source.includes('123.450'));
  const actual = JSON.parse(source), original = JSON.parse(fixture);
  const record = actual.collection.pokemon[0];
  assert.deepEqual(record.ribbons, ['effort-ribbon']);
  assert.deepEqual(record.earnedGames, { 'effort-ribbon': 'bd' });
  assert.deepEqual(record.earnedGenerations, { 'effort-ribbon': 8 });
  for (const key of ['ribbons', 'earnedGames', 'earnedGenerations', 'visits']) delete record[key];
  for (const key of ['ribbons', 'earnedGames', 'earnedGenerations', 'visits']) delete original.collection.pokemon[0][key];
  assert.deepEqual(actual, original);
});
test('removal clears earning metadata and title without damaging other unknown entries', () => {
  const initial = JSON.parse(fixture);
  Object.assign(initial.collection.pokemon[0], { ribbons: ['effort-ribbon', 'future-ribbon'], title: 'effort-ribbon', titleText: 'my title', earnedGames: { 'effort-ribbon': 'bd', 'future-ribbon': 'future-game' }, earnedGenerations: { 'effort-ribbon': 8, 'future-ribbon': 42 } });
  const c = importBackup(JSON.stringify(initial), 'id', 'r');
  const after = changeRibbon(c, 'swift-uuid', 'effort-ribbon', undefined, { id: 'remove', at: '' }).collection;
  const result = JSON.parse(exportSource(after)).collection.pokemon[0];
  assert.equal(result.title, 'None'); assert.equal(result.titleText, '');
  assert.deepEqual(result.earnedGames, { 'future-ribbon': 'future-game' });
  assert.deepEqual(result.earnedGenerations, { 'future-ribbon': 42 });
});
test('universal backup survives local JSON serialization, restore, source export, and undo', () => {
  const result = changed(fixture);
  const restored = importBackup(exportUniversal(result.collection), 'ignored-id', 'ignored-r');
  assert.deepEqual(restored, result.collection);
  assert.equal(exportSource(restored), exportSource(result.collection));
  const undone = undoChange(restored, result.undo, { id: 'undo', at: '' });
  assert.equal(exportSource(undone), fixture);
});
test('website v5 retains square shiny, string levels, boxes, settings and arbitrary nested fields', () => {
  const text = '\uFEFF' + JSON.stringify({ fileVersion: 5, lastModified: 1728000123456, boxes: ['Travellers'], settings: { keep: ['all'] }, futureRoot: true, pokemon: [{ species: 'metagross', shiny: 'square', currentlevel: '100', currentgame: 'bd', origingame: 'emerald', metlevel: '50', ribbons: ['unknown-future-ribbon'], box: 0, notes: { nested: 'keep' }, trainerid: '000042', future: ['keep'] }] });
  const c = importBackup(text, 'web-id', 'r');
  assert.equal(c.records[0]!.pokemon.shiny, true); assert.equal(c.records[0]!.pokemon.metLevel, 50);
  assert.equal(c.boxes[0]!.name, 'Travellers'); assert.equal(exportSource(c), text);
  const result = changed(text).collection, exported = JSON.parse(exportSource(result));
  const record = exported.pokemon[0];
  assert.equal(record.shiny, 'square'); assert.equal(record.currentlevel, '100'); assert.equal(record.trainerid, '000042');
  assert.deepEqual(record.notes, { nested: 'keep' }); assert.deepEqual(record.future, ['keep']);
  assert.deepEqual(exported.settings, { keep: ['all'] }); assert.ok(record.ribbons.includes('unknown-future-ribbon'));
  const restored = importBackup(exportUniversal(result), 'another', 'another');
  assert.equal(restored.records[0]!.id, result.records[0]!.id);
});
test('unknown species and awards are retained but cannot acquire guessed eligibility', () => {
  const c = importBackup(JSON.stringify({ fileVersion: 5, pokemon: [{ species: 'future-species', ribbons: ['future-award'] }] }), 'id', 'r');
  assert.equal(c.records[0]!.pokemon.species, 'future-species');
  assert.throws(() => changeRibbon(c, c.records[0]!.id, 'effort-ribbon', 'bd', { id: 'op', at: '' }));
});
test('invalid versions, duplicate identities, invalid JSON and malformed records fail before mutation', () => {
  for (const text of ['{', '{"fileVersion":6,"pokemon":[]}', '{"format":"ribbon-passport","version":2,"collection":{}}', '{"format":"ribbon-passport-universal","version":2,"collection":{}}', '{"fileVersion":5,"pokemon":[{"species":"mew","ribbons":"oops"}]}', '{"fileVersion":5,"pokemon":[{"species":"mew","currentlevel":101,"ribbons":[]}]}', '{"fileVersion":5,"fileVersion":6,"pokemon":[]}']) assert.throws(() => importBackup(text, 'id', 'r'));
  const root = JSON.parse(fixture); root.collection.pokemon.push(root.collection.pokemon[0]);
  assert.throws(() => importBackup(JSON.stringify(root), 'id', 'r'), /repeated/);
});
test('raw snapshot backups work and newer local envelopes are never seeded over', () => {
  const root = JSON.parse(fixture), c = importBackup(JSON.stringify(root.collection), 'id', 'r');
  assert.equal(c.source.kind, 'snapshot');
  assert.throws(() => validateCollection({ ...c, schemaVersion: 2 } as never), /newer/);
});
test('sample generation-only history is never converted into inferred earning games', () => {
  const sample = createSample(), ray = sample.records.find(r => r.pokemon.species === 'rayquaza')!;
  assert.equal(ray.pokemon.earnedGames, undefined);
  const restored = importBackup(exportUniversal(sample), 'id', 'r');
  assert.deepEqual(restored, sample);
  assert.ok(serializeJSON(parseJSON(exportSource(restored))).includes('earnedGenerations'));
});
test('unrelated history numbers and opaque visit records survive an edited export', () => {
  const text = fixture.replace('"futurePokemon":', '"earnedGenerations":{"future-award":9123372036854000123},"futurePokemon":').replace('"futureDate":123.450}', '"futureDate":123.450},{"futureVisit":{"opaque":true}}');
  const source = exportSource(changed(text).collection);
  assert.ok(source.includes('"future-award": 9123372036854000123'));
  assert.ok(source.includes('"futureDate": 123.450'));
  assert.deepEqual(JSON.parse(source).collection.pokemon[0].visits[1], { futureVisit: { opaque: true } });
});
test('oversized imported party remains fully represented without rewriting the source layout', () => {
  const root = JSON.parse(fixture);
  root.collection.pokemon = Array.from({ length: 8 }, (_, i) => ({ ...root.collection.pokemon[0], id: `pokemon-${i}` }));
  root.collection.storage.partyIDs = root.collection.pokemon.map((p: any) => p.id);
  root.collection.storage.boxes[0].slots = [];
  const text = JSON.stringify(root), c = importBackup(text, 'id', 'r');
  const shown = [...c.partyIDs, ...c.boxes.flatMap(b => b.slots.filter(Boolean))];
  assert.equal(shown.length, 8); assert.equal(new Set(shown).size, 8);
  assert.equal(exportSource(c), text);
});
