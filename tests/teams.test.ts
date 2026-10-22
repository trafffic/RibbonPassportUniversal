import test from 'node:test';
import assert from 'node:assert/strict';
import { importBackup, exportSource } from '../src/backup/codec';
import {
  applyTeamVersion,
  deleteTeam,
  diffTeamVersion,
  editTeamVersion,
  exportTeamVersion,
  moveMember,
  removeTeamVersion,
  saveTeam,
  saveTeamVersion,
  toggleMember,
} from '../src/domain/teams';
import { patchPassport } from '../src/domain/passport';
import { restoreCollection } from '../src/domain/organisation';

const ctx = (id: string) => ({ id, at: '2026-10-22T10:00:00Z' });
const set = (item: string) => ({
  item,
  ability: 'Clear Body',
  nature: 'Adamant',
  evs: '252 Atk',
  ivs: '',
  teraType: 'Steel',
  moves: ['Meteor Mash'],
});
const mon = (id: string, item: string) => ({
  id,
  species: 'metagross',
  ribbons: [],
  currentlevel: 50,
  showdownSet: set(item),
});
const backup = (team: object = {}) =>
  JSON.stringify({
    format: 'ribbon-passport',
    version: 1,
    collection: {
      pokemon: [mon('a', 'Leftovers'), mon('b', 'Choice Band')],
      teams: [
        { id: 't', name: 'Main', memberIDs: ['a', 'b'], future: 1, ...team },
      ],
      selectedID: 'a',
    },
  });
const open = (team?: object) => importBackup(backup(team), 'c', 'r');

test('moving, adding and removing members keeps at most six unique ids', () => {
  assert.deepEqual(moveMember(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(moveMember(['a', 'b'], 0, -1), ['a', 'b']);
  assert.deepEqual(moveMember(['a', 'b'], 1, 1), ['a', 'b']);
  assert.deepEqual(toggleMember(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(toggleMember(['a'], 'b'), ['a', 'b']);
  const full = ['1', '2', '3', '4', '5', '6'];
  assert.equal(toggleMember(full, '7'), full);
});

test('saving a team reorders it and makes it the default; delete moves the default; undo restores', () => {
  const c0 = open();
  let c = saveTeam(c0, { ...c0.teams![0]!, memberIDs: ['b', 'a'] }, ctx('s'));
  assert.deepEqual(c.teams![0]!.memberIDs, ['b', 'a']);
  assert.equal(c.selectedTeamID, 't');
  const second = saveTeam(
    c,
    { id: 'u', name: 'Two', memberIDs: ['a'] },
    ctx('n'),
  );
  assert.equal(second.selectedTeamID, 'u');
  assert.equal(deleteTeam(second, 'u', ctx('x')).selectedTeamID, 't');
  assert.throws(() =>
    saveTeam(c, { id: 't', name: ' ', memberIDs: ['a'] }, ctx('e')),
  );
  const undone = restoreCollection(c, c0, ctx('undo'));
  assert.deepEqual(undone.teams, c0.teams);
  const exported = JSON.parse(exportSource(c)).collection.teams[0];
  assert.deepEqual(exported.memberIDs, ['b', 'a']);
  assert.equal(exported.future, 1);
});

test('team versions save, edit, diff, apply, export and remove without losing unknown fields', () => {
  let c = saveTeamVersion(
    open(),
    't',
    { id: 'v', name: ' Lead ', note: ' notes ' },
    ctx('v'),
  );
  const v = c.teams![0]!.savedBuilds![0]!;
  assert.equal(v.name, 'Lead');
  assert.equal(v.members.length, 2);
  assert.throws(() =>
    saveTeamVersion(c, 't', { id: 'v', name: 'x' }, ctx('d')),
  );
  assert.throws(() =>
    saveTeamVersion(c, 't', { id: 'w', name: ' ' }, ctx('d')),
  );
  c = editTeamVersion(c, 't', 'v', { name: 'Final', note: 'Better' }, ctx('e'));
  assert.equal(c.teams![0]!.savedBuilds![0]!.note, 'Better');
  assert.equal(
    diffTeamVersion(c, c.teams![0]!, c.teams![0]!.savedBuilds![0]!),
    0,
  );
  const before = c;
  c = patchPassport(
    c,
    'a',
    { showdownSet: set('Life Orb') },
    c.records[0]!.version.revision,
    ctx('p'),
  );
  assert.equal(
    diffTeamVersion(c, c.teams![0]!, c.teams![0]!.savedBuilds![0]!),
    1,
  );
  assert.match(exportTeamVersion(c.teams![0]!.savedBuilds![0]!), /@ Leftovers/);
  const applied = applyTeamVersion(c, 't', 'v', ctx('a'));
  assert.equal(applied.records[0]!.pokemon.showdownSet!.item, 'Leftovers');
  assert.equal(
    restoreCollection(applied, before, ctx('u')).records[0]!.pokemon
      .showdownSet!.item,
    'Leftovers',
  );
  c = removeTeamVersion(c, 't', 'v', ctx('r'));
  assert.deepEqual(c.teams![0]!.savedBuilds, []);
});

test('team versions round-trip through source and universal backups with original fields intact', () => {
  const original = {
    notebook: 'keep me',
    savedBuilds: [
      {
        id: 'v',
        name: 'Old',
        note: 'n',
        sourceIDs: [],
        extra: { keep: true },
        members: [
          {
            id: 'a',
            species: 'metagross',
            nickname: '',
            level: 50,
            mystery: 7,
            build: { ...set('Leftovers'), hidden: 'x' },
          },
          {
            id: 'z',
            species: 'x',
            nickname: '',
            build: set(''),
            unknownMember: 1,
          },
        ],
      },
      { id: 'weird', name: 'Odd', members: 'future' },
    ],
  };
  let c = open(original);
  assert.equal(c.teams![0]!.savedBuilds![0]!.members[0]!.level, 50);
  c = editTeamVersion(c, 't', 'v', { name: 'New', note: 'm' }, ctx('e'));
  const team = JSON.parse(exportSource(c)).collection.teams[0];
  assert.equal(team.notebook, 'keep me');
  assert.equal(team.savedBuilds[0].name, 'New');
  assert.deepEqual(team.savedBuilds[0].extra, { keep: true });
  assert.equal(team.savedBuilds[0].members[0].mystery, 7);
  assert.equal(team.savedBuilds[0].members[0].build.hidden, 'x');
  assert.equal(team.savedBuilds[0].members.length, 2);
  assert.equal(team.savedBuilds[0].members[1].unknownMember, 1);
  assert.deepEqual(team.savedBuilds[1], original.savedBuilds[1]);
  assert.equal(team.future, 1);
});

test('applying a version re-creates a member that was deleted', () => {
  let c = saveTeamVersion(open(), 't', { id: 'v', name: 'L' }, ctx('v'));
  c = {
    ...c,
    records: c.records.filter((r) => r.id !== 'b'),
    boxes: c.boxes.map((b) => ({
      ...b,
      kind: 'showdown' as const,
      slots: b.slots.map((s) => (s === 'b' ? null : s)),
    })),
  };
  const applied = applyTeamVersion(c, 't', 'v', ctx('a'));
  assert.deepEqual(applied.teams![0]!.memberIDs, ['a', 'b']);
  assert.equal(
    applied.records.find((r) => r.id === 'b')!.pokemon.showdownSet!.item,
    'Choice Band',
  );
});

test('removing a team version drops it from the original-format export but keeps malformed entries', () => {
  const odd = { id: 'weird', name: 'Odd', members: 'future' };
  let c = open({ savedBuilds: [odd] });
  c = saveTeamVersion(c, 't', { id: 'v', name: 'L' }, ctx('v'));
  c = removeTeamVersion(c, 't', 'v', ctx('r'));
  const out = JSON.parse(exportSource(c)).collection.teams[0].savedBuilds;
  assert.deepEqual(out, [odd]);
});
