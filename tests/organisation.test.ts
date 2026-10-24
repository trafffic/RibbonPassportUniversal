import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { addPokemon, blankPokemon, createBox, editBox, editPokemon, movePokemon, restoreCollection, emptyCollection, ensureDefaultBoxes } from '../src/domain/organisation';
import { importBackup, exportSource, exportUniversal } from '../src/backup/codec';
import { changeRibbon } from '../src/domain/collection';
import { recordedVisits } from '../src/domain/catalog';
import { generationEarningGames } from '../src/domain/rules';

const context = (id: string) => ({ id, at: '2026-10-21T12:00:00Z' });
const empty = () => importBackup('{"fileVersion":5,"boxes":["Home"],"pokemon":[],"future":{"keep":true}}', 'test', 'initial');
const companion = (id: string) => ({ ...blankPokemon(id), species: 'metagross', currentlevel: 100, origingame: 'emerald', currentgame: 'bd' });
const fixture = fs.readFileSync(new URL('./fixtures/native-app-v1.json', import.meta.url), 'utf8');

test('new collections start with three independent empty boxes and round-trip their identities', () => {
  const c = emptyCollection('new', 'r', 'box');
  assert.equal(c.boxes.length, 3);
  assert.equal(new Set(c.boxes.map(b => b.id)).size, 3);
  assert.equal(c.boxes[0]!.id, c.selectedBoxID);
  assert.deepEqual(c.boxes.map(b => b.name), Array.from({ length: 3 }, (_, i) => `Box ${String(i + 1).padStart(2, '0')}`));
  assert.ok(c.boxes.every(b => b.slots.length === 30 && b.slots.every(id => id === null)));
  assert.notEqual(c.boxes[0]!.slots, c.boxes[1]!.slots);
  assert.deepEqual(importBackup(exportSource(c), 'other', 'other').boxes, c.boxes);
});

test('older collections gain empty ribbon boxes once, preserving contents, selection and competitive storage', () => {
  let c = addPokemon(empty(), companion('p'), empty().boxes[0]!.id, context('add'));
  c = createBox(c, 'competitive', 'Box 02', context('competitive'));
  c = { ...c, boxes: c.boxes.map(b => b.id === 'competitive' ? { ...b, kind: 'showdown' } : b) };
  const next = ensureDefaultBoxes(c, context('defaults'));
  assert.equal(next.boxes.length, 4);
  assert.equal(next.boxes.filter(b => b.kind !== 'showdown').length, 3);
  assert.deepEqual(next.boxes.slice(0, 2), c.boxes);
  assert.deepEqual(next.records, c.records);
  assert.deepEqual(next.partyIDs, c.partyIDs);
  assert.equal(next.selectedID, c.selectedID);
  assert.equal(next.selectedBoxID, c.selectedBoxID);
  assert.equal(next.source, c.source);
  assert.equal(new Set(next.boxes.filter(b => b.kind !== 'showdown').map(b => b.name)).size, 3);
  assert.equal(ensureDefaultBoxes(next, context('again')), next);
  assert.deepEqual(importBackup(exportSource(next), 'other', 'other').boxes, next.boxes);
  const larger = createBox(next, 'extra', 'Extra', context('extra'));
  assert.equal(ensureDefaultBoxes(larger, context('again')), larger);
});

test('the old demo placeholder becomes Box 02 and untouched automatic extras shrink to three', () => {
  for (const expanded of [false, true]) {
    let c = emptyCollection('demo', 'initial', 'first');
    c = { ...c, boxes: [c.boxes[0]!, { id: 'sample-box-2', name: 'Next adventure', slots: Array(30).fill(null) }] };
    const source = JSON.parse(c.source.text);
    source.collection.storage.boxes = c.boxes;
    c = { ...c, source: { ...c.source, text: JSON.stringify(source) } };
    c = addPokemon(c, companion('p'), 'sample-box-2', context('add'));
    if (expanded) {
      c = createBox(c, 'old-defaults-box-2', 'Box 02', context('old-defaults'));
      c = { ...c, boxes: [...c.boxes, ...Array.from({ length: 13 }, (_, i) => ({
        id: `old-defaults-box-${i + 3}`,
        name: `Box ${String(i + 3).padStart(2, '0')}`,
        slots: Array(30).fill(null),
      }))] };
    }
    c = { ...c, selectedBoxID: 'sample-box-2' };
    const next = ensureDefaultBoxes(c, context('repair'));
    assert.deepEqual(next.boxes.map(b => b.name), Array.from({ length: 3 }, (_, i) => `Box ${String(i + 1).padStart(2, '0')}`));
    assert.deepEqual(next.boxes.slice(0, c.boxes.length).map(b => b.id), c.boxes.slice(0, 3).map(b => b.id));
    assert.deepEqual(next.boxes[1]!.slots, c.boxes[1]!.slots);
    assert.deepEqual(next.records, c.records);
    assert.equal(next.selectedBoxID, 'sample-box-2');
    assert.equal(ensureDefaultBoxes(next, context('again')), next);
    assert.deepEqual(importBackup(exportSource(next), 'other', 'other').boxes, next.boxes);
  }
});

test('reducing defaults keeps occupied, renamed, decorated and manually created boxes', () => {
  let c = emptyCollection('new', 'r', 'box');
  c = { ...c, boxes: Array.from({ length: 16 }, (_, i) => ({
    id: i ? `box-${i + 1}` : 'box', name: `Box ${String(i + 1).padStart(2, '0')}`, slots: Array(30).fill(null),
  })) };
  c = addPokemon(c, companion('p'), 'box', context('add'));
  c = movePokemon(c, 'p', { boxID: 'box-5', slot: 0 }, context('move'));
  c = editBox(c, 'box-6', { name: 'Favorites' }, context('rename'));
  c = editBox(c, 'box-7', { name: 'Box 07', wallpaper: { sunMoon: 'sm09' } }, context('decorate'));
  c = createBox(c, 'user-added', 'Box 17', context('manual'));
  c = importBackup(exportSource(c), 'restored', 'r');
  const next = ensureDefaultBoxes(c, context('shrink'));
  assert.deepEqual(next.boxes.map(b => b.id), ['box', 'box-2', 'box-3', 'box-5', 'box-6', 'box-7', 'user-added']);
  assert.equal(next.boxes.find(b => b.id === 'box-5')!.slots[0], 'p');
  assert.deepEqual(next.records, c.records);
  assert.deepEqual(importBackup(exportSource(next), 'again', 'r').boxes, next.boxes);
  assert.equal(ensureDefaultBoxes(next, context('again')), next);
});

test('competitive defaults have three independent boxes and preserve ribbon storage', () => {
  const c = emptyCollection('new', 'r', 'box');
  const next = ensureDefaultBoxes(c, context('competitive'), 'showdown');
  assert.deepEqual(next.boxes.slice(0, 3), c.boxes);
  assert.equal(next.boxes.filter(b => b.kind === 'showdown').length, 3);
  assert.deepEqual(importBackup(exportSource(next), 'again', 'r').boxes, next.boxes);
  assert.equal(ensureDefaultBoxes(next, context('again'), 'showdown'), next);
});

test('an automatic box explicitly renamed to another numbered name is preserved', () => {
  const c = emptyCollection('new', 'r', 'box');
  const expanded = { ...c, boxes: [...c.boxes, { id: 'box-4', name: 'Box 04', slots: Array(30).fill(null) }] };
  const renamed = editBox(expanded, 'box-4', { name: 'Box 09' }, context('rename'));
  assert.equal(ensureDefaultBoxes(renamed, context('defaults')), renamed);
});

test('empty-looking default boxes with opaque metadata or overflow slots are preserved', () => {
  for (const extra of [{ futureBoxNotes: 'Keep me' }, { slots: [...Array(30).fill(null), { futureSlot: true }] }]) {
    const base = emptyCollection('new', 'r', 'box');
    const source = JSON.parse(base.source.text);
    source.collection.storage.boxes.push({ id: 'box-4', name: 'Box 04', slots: Array(30).fill(null), ...extra });
    const c = importBackup(JSON.stringify(source), 'new', 'r');
    assert.equal(ensureDefaultBoxes(c, context('defaults')), c);
  }
});

test('empty collection: add three stable identities, move across two boxes, undo and round-trip all positions', () => {
  let c = empty();
  for (const id of ['one', 'two', 'three']) c = addPokemon(c, companion(id), c.boxes[0]!.id, context(`add-${id}`));
  c = createBox(c, 'second', 'Travellers', context('box'));
  const before = c;
  c = movePokemon(c, 'one', { boxID: 'second', slot: 29 }, context('move'));
  assert.equal(c.boxes[1]!.slots[29], 'one'); assert.equal(c.boxes[0]!.slots[0], null);
  const undone = restoreCollection(c, before, context('undo'));
  assert.deepEqual(undone.boxes, before.boxes); assert.equal(undone.operations.at(-1)!.kind, 'undo');
  const universal = importBackup(exportUniversal(c), 'other', 'other');
  assert.deepEqual(universal, c);
  const source = importBackup(exportSource(c), 'other', 'other');
  assert.deepEqual(source.boxes, c.boxes); assert.deepEqual(source.records.map(r => r.id), ['one', 'two', 'three']);
  assert.deepEqual(JSON.parse(exportSource(c)).future, { keep: true });
});
test('new app-format collections include fields required by Swift synthesised Codable decoders', () => {
  let c = emptyCollection('new', 'r', 'box', '2026-10-21T12:00:00Z');
  c = addPokemon(c, companion('p'), 'box', context('add'));
  c = editBox(c, 'box', { name: 'Home', wallpaper: { sunMoon: 'sm09' } }, context('wallpaper'));
  const raw = JSON.parse(exportSource(c)).collection;
  for (const key of ['pokemon', 'teams', 'selectedID', 'selectedTeamID', 'appearance', 'updatedAt']) assert.notEqual(raw[key], undefined, key);
  for (const key of ['id', 'species', 'nickname', 'gender', 'shiny', 'currentgame', 'origingame', 'shadow', 'gmax', 'currentlevel', 'title', 'titleText', 'ribbons', 'source']) assert.notEqual(raw.pokemon[0][key], undefined, key);
  assert.equal(raw.updatedAt, (Date.parse('2026-10-21T12:00:00Z') - Date.UTC(2001, 0, 1)) / 1000);
  assert.equal(raw.storage.boxes[0].wallpaper.design, 'classic'); assert.equal(raw.storage.boxes[0].wallpaper.strength, 0.65);
  assert.deepEqual(importBackup(exportSource(c), 'other', 'other').boxes, c.boxes);
});
test('occupied slots swap between boxes and party, including a full party, without duplicating or dropping identities', () => {
  let c = empty();
  for (let i = 0; i < 8; i++) c = addPokemon(c, companion(`p${i}`), c.boxes[0]!.id, context(`add${i}`));
  c = movePokemon(c, 'p0', { boxID: c.boxes[0]!.id, slot: 1 }, context('swap'));
  assert.deepEqual(c.boxes[0]!.slots.slice(0, 2), ['p1', 'p0']);
  for (let i = 0; i < 6; i++) c = movePokemon(c, `p${i}`, { partySlot: i }, context(`party${i}`));
  c = movePokemon(c, 'p6', { partySlot: 2 }, context('full-swap'));
  assert.equal(c.partyIDs[2], 'p6'); assert.equal(c.boxes[0]!.slots[6], 'p2');
  c = movePokemon(c, 'p6', { boxID: c.boxes[0]!.id, slot: 7 }, context('back-swap'));
  assert.equal(c.partyIDs[2], 'p7'); assert.equal(c.boxes[0]!.slots[7], 'p6');
  const positions = [...c.partyIDs, ...c.boxes.flatMap(b => b.slots.filter(Boolean))];
  assert.equal(positions.length, 8); assert.equal(new Set(positions).size, 8);
  assert.throws(() => movePokemon(c, 'missing', { partySlot: 0 }, context('bad')), /not found/);
  assert.throws(() => movePokemon(c, 'p0', { partySlot: 6 }, context('bad')), /valid party/);
});
test('detail edits recalculate eligibility and retain owned ribbons, earning history and former Journey endpoints', () => {
  let c = importBackup(fixture, 'native', 'r');
  const id = c.records[0]!.id;
  c = changeRibbon(c, id, 'effort-ribbon', 'bd', context('earn')).collection;
  const before = c, record = c.records[0]!;
  const details = { ...record.pokemon, nickname: 'Ribbon master', currentgame: 'scar', metLevel: 70, currentlevel: 100, sizeScale: 255 };
  c = editPokemon(c, id, details, record.version.revision, context('edit'));
  const p = c.records[0]!.pokemon;
  assert.equal(p.id, id); assert.deepEqual(p.ribbons, record.pokemon.ribbons); assert.deepEqual(p.earnedGames, { 'effort-ribbon': 'bd' });
  assert.ok(recordedVisits(p).some(v => v.game === 'bd'));
  assert.ok(generationEarningGames('jumbo-mark', 'scar', p).includes('scar'));
  assert.throws(() => editPokemon(c, id, details, record.version.revision, context('stale')), /changed while/);
  const restored = restoreCollection(c, before, context('undo'));
  assert.deepEqual(restored.records[0]!.pokemon, record.pokemon);
  assert.equal(restored.records[0]!.version.parentRevision, 'edit');
});
test('editing an app backup preserves unsupported numbers, attachments, storage fields and wallpaper fields', () => {
  let c = importBackup(fixture, 'native', 'r');
  const record = c.records[0]!, box = c.boxes[0]!;
  c = editPokemon(c, record.id, { ...record.pokemon, nickname: 'A new name', shiny: true, metLevel: undefined }, record.version.revision, context('edit'));
  c = editBox(c, box.id, { name: 'Ribbon masters', wallpaper: { ...box.wallpaper, sunMoon: 'sm09' } }, context('wallpaper'));
  c = addPokemon(c, companion('new'), box.id, context('add'));
  c = movePokemon(c, record.id, { boxID: box.id, slot: 15 }, context('move'));
  const text = exportSource(c), root = JSON.parse(text), raw = root.collection;
  assert.ok(text.includes('9123372036854000123')); assert.ok(text.includes('2.370'));
  assert.deepEqual(raw.pokemon[0].futurePokemon, JSON.parse(fixture).collection.pokemon[0].futurePokemon);
  assert.equal(raw.pokemon[0].metLevel, undefined); assert.equal(raw.pokemon[0].shiny, true);
  assert.equal(raw.storage.boxes[0].wallpaper.futureWallpaper, true); assert.equal(raw.storage.boxes[0].wallpaper.sunMoon, 'sm09');
  assert.deepEqual(importBackup(text, 'again', 'r').boxes, c.boxes);
  assert.equal(raw.pokemon[1].id, 'new'); assert.deepEqual(raw.futureCollection, { retained: true });
});
test('guide edits keep untouched square shinies/string levels and explicitly clear canonical and aliased values', () => {
  let c = importBackup(JSON.stringify({ fileVersion: 5, boxes: ['Home'], pokemon: [{ species: 'metagross', shiny: 'square', ribbons: [], currentlevel: '100', metlevel: '50', scale: '0', box: 0, future: true }] }), 'guide', 'r');
  let r = c.records[0]!;
  c = editPokemon(c, r.id, { ...r.pokemon, nickname: 'Edited' }, r.version.revision, context('name'));
  let raw = JSON.parse(exportSource(c)).pokemon[0];
  assert.equal(raw.shiny, 'square'); assert.equal(raw.currentlevel, '100'); assert.equal(raw.metlevel, '50');
  r = c.records[0]!;
  c = editPokemon(c, r.id, { ...r.pokemon, shiny: false, metLevel: undefined, sizeScale: undefined, currentlevel: 99 }, r.version.revision, context('details'));
  raw = JSON.parse(exportSource(c)).pokemon[0];
  assert.equal(raw.shiny, ''); assert.equal(raw.currentlevel, '99'); assert.equal(raw.metlevel, undefined); assert.equal(raw.scale, undefined); assert.equal(raw.future, true);
  const restored = importBackup(exportUniversal(c), 'x', 'x').records[0]!.pokemon;
  assert.equal(restored.metLevel, undefined); assert.equal(restored.sizeScale, undefined);
});
test('invalid edits, full boxes and corrupted universal layouts fail without changing the collection', () => {
  const c = empty(), original = JSON.stringify(c);
  for (const p of [{ ...companion('x'), currentlevel: 0 }, { ...companion('x'), metLevel: 1.5 }, { ...companion('x'), sizeScale: 256 }, { ...companion('x'), species: 'future' }]) assert.throws(() => addPokemon(c, p, c.boxes[0]!.id, context('bad')));
  assert.equal(JSON.stringify(c), original);
  let filled = c;
  for (let i = 0; i < 30; i++) filled = addPokemon(filled, companion(`p${i}`), c.boxes[0]!.id, context(`add${i}`));
  assert.throws(() => addPokemon(filled, companion('overflow'), c.boxes[0]!.id, context('extra')), /full/);
  const broken = structuredClone(filled); broken.boxes[0]!.slots[1] = broken.boxes[0]!.slots[0]!;
  assert.throws(() => importBackup(exportUniversal(broken), 'x', 'x'), /positions/);
});
test('guide layout extensions retain future fields and reject a conflicting unsupported namespace', () => {
  let c = addPokemon(empty(), companion('new'), 'test-box-0', context('add'));
  const source = JSON.parse(exportSource(c));
  source.ribbonPassportLayout.future = { keep: true };
  source.ribbonPassportLayout.boxes[0].futureBox = 123;
  source.ribbonPassportLayout.boxes[0].wallpaper = { sunMoon: 'sm01', futureWallpaper: true };
  c = importBackup(JSON.stringify(source), 'again', 'r');
  c = editBox(c, c.boxes[0]!.id, { name: 'New name', wallpaper: { sunMoon: 'sm09' } }, context('box'));
  const output = JSON.parse(exportSource(c)).ribbonPassportLayout;
  assert.deepEqual(output.future, { keep: true }); assert.equal(output.boxes[0].futureBox, 123); assert.equal(output.boxes[0].wallpaper.futureWallpaper, true);
  const unknown = JSON.parse(empty().source.text); unknown.ribbonPassportLayout = { version: 99, future: true };
  c = importBackup(JSON.stringify(unknown), 'unknown', 'r');
  c = createBox(c, 'another', 'Another', context('box'));
  assert.throws(() => exportSource(c), /unsupported ribbonPassportLayout/);
  assert.equal(importBackup(exportUniversal(c), 'x', 'x').boxes.length, 2);
});
test('original iPhone sprites retain every visible pixel and colour when prepared for scaling', () => {
  const require = createRequire(import.meta.url);
  const { PNG } = require('pngjs');
  const originals = fs.readdirSync('assets/art').filter(f => f.startsWith('sprite-') && f.endsWith('.png'));
  const colours = (png: { data: Buffer }) => {
    const counts = new Map<number, number>();
    for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3]! > 8) {
      const rgba = png.data.readUInt32BE(i); counts.set(rgba, (counts.get(rgba) ?? 0) + 1);
    }
    return counts;
  };
  for (const file of originals) {
    const key = file.slice(0, -4), original = PNG.sync.read(fs.readFileSync(`assets/art/${file}`));
    const prepared = PNG.sync.read(fs.readFileSync(`assets/prepared/${key}.png`));
    const expected = new Map([...colours(original)].map(([colour, count]) => [colour, count * 64]));
    assert.deepEqual(colours(prepared), expected, `${key}: all original visible pixels and colours retained at 8x`);
    assert.ok(prepared.width <= original.width * 8 && prepared.height <= original.height * 8);
  }
  assert.equal(fs.readdirSync('assets/prepared').some(f => f.startsWith('portrait-')), false, 'Replacement sprite set must not be bundled');
});
