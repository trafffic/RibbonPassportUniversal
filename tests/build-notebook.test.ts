import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importBackup,
  exportSource,
  exportUniversal,
} from '../src/backup/codec';
import {
  applyBuildVersion,
  diffBuild,
  exportBuildVersion,
  removeBuildVersion,
  saveBuildVersion,
  savedBuilds,
} from '../src/domain/build-notebook';
import { patchPassport } from '../src/domain/passport';
import { restoreCollection } from '../src/domain/organisation';

const ctx = (id: string) => ({ id, at: '2026-10-22T10:00:00Z' });
const backup = (extra: object = {}) =>
  JSON.stringify({
    format: 'ribbon-passport',
    version: 1,
    collection: {
      pokemon: [
        {
          id: 'p',
          species: 'metagross',
          ribbons: [],
          currentlevel: 50,
          showdownSet: {
            item: 'Leftovers',
            ability: 'Clear Body',
            nature: 'Adamant',
            evs: '252 Atk',
            ivs: '',
            teraType: 'Steel',
            moves: ['Meteor Mash', 'Protect'],
          },
          ...extra,
        },
      ],
      teams: [],
      selectedID: 'p',
    },
  });
const open = (extra?: object) => importBackup(backup(extra), 'c', 'r');
const rev = (c: ReturnType<typeof open>) => c.records[0]!.version.revision;

test('saving, listing, diffing, applying and exporting a build version', () => {
  let c = open();
  c = saveBuildVersion(
    c,
    'p',
    { id: 'v1', name: ' Lead ', note: 'Hi' },
    rev(c),
    ctx('s1'),
  );
  c = patchPassport(
    c,
    'p',
    {
      showdownSet: {
        ...c.records[0]!.pokemon.showdownSet!,
        item: 'Choice Band',
        moves: ['Meteor Mash'],
      },
    },
    rev(c),
    ctx('e1'),
  );
  const p = () => c.records[0]!.pokemon;
  assert.equal(p().savedBuilds![0]!.name, 'Lead');
  assert.deepEqual(
    diffBuild(p().savedBuilds![0]!.build, p().showdownSet!).map((d) => d.label),
    ['Item', 'Moves'],
  );
  assert.match(exportBuildVersion(p(), 'v1'), /@ Leftovers[\s\S]*- Protect/);
  const before = c;
  c = applyBuildVersion(c, 'p', 'v1', rev(c), ctx('a1'));
  assert.equal(p().showdownSet!.item, 'Leftovers');
  assert.deepEqual(p().showdownSet!.moves, ['Meteor Mash', 'Protect']);
  assert.deepEqual(diffBuild(p().savedBuilds![0]!.build, p().showdownSet!), []);
  c = restoreCollection(c, before, ctx('u1'));
  assert.equal(p().showdownSet!.item, 'Choice Band');
  c = saveBuildVersion(c, 'p', { id: 'v2', name: 'Second' }, rev(c), ctx('s2'));
  assert.deepEqual(
    savedBuilds(p()).map((v) => v.id),
    ['v2', 'v1'],
  );
  c = removeBuildVersion(c, 'p', 'v1', rev(c), ctx('r1'));
  assert.deepEqual(
    savedBuilds(p()).map((v) => v.id),
    ['v2'],
  );
});

test('rejects unnamed versions, duplicates and missing versions', () => {
  const c = open();
  assert.throws(
    () => saveBuildVersion(c, 'p', { id: 'v', name: ' ' }, rev(c), ctx('a')),
    /Name this version/,
  );
  const d = saveBuildVersion(c, 'p', { id: 'v', name: 'A' }, rev(c), ctx('b'));
  assert.throws(() =>
    saveBuildVersion(d, 'p', { id: 'v', name: 'B' }, rev(d), ctx('c')),
  );
  assert.throws(
    () => applyBuildVersion(d, 'p', 'nope', rev(d), ctx('d')),
    /no longer exists/,
  );
  assert.throws(() => exportBuildVersion(d.records[0]!.pokemon, 'nope'));
});

test('saved builds round-trip through the original format keeping unknown fields', () => {
  const original = {
    savedBuilds: [
      {
        id: 'old',
        name: 'Old',
        build: { item: 'Sash', moves: ['Protect'], future: 1 },
        note: '',
        sourceIDs: ['s'],
        futureRow: true,
      },
      { moves: ['Protect'] },
      { id: 'broken', name: 'No build' },
    ],
  };
  let c = open(original);
  assert.equal(exportSource(c), backup(original));
  assert.equal(c.records[0]!.pokemon.savedBuilds![0]!.build.item, 'Sash');
  c = saveBuildVersion(
    c,
    'p',
    { id: 'new', name: 'New', note: 'n' },
    rev(c),
    ctx('s'),
  );
  const rows = JSON.parse(exportSource(c)).collection.pokemon[0].savedBuilds;
  assert.equal(rows.length, 4);
  assert.equal(rows[0].futureRow, true);
  assert.equal(rows[0].build.future, 1);
  assert.deepEqual(rows[2], { moves: ['Protect'] });
  assert.deepEqual(rows[3], { id: 'broken', name: 'No build' });
  assert.equal(rows[1].id, 'new');
  assert.equal(rows[1].build.item, 'Leftovers');
  const again = importBackup(exportSource(c), 'c2', 'r2').records[0]!.pokemon
    .savedBuilds!;
  assert.deepEqual(
    again.map((v) => v.id),
    ['old', 'new'],
  );
  const universal = importBackup(exportUniversal(c), 'c3', 'r3').records[0]!
    .pokemon.savedBuilds!;
  assert.deepEqual(universal, c.records[0]!.pokemon.savedBuilds);
});
