import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importBackup,
  exportSource,
  exportUniversal,
} from '../src/backup/codec';
import {
  patchPassport,
  updateMetadata,
  setCaptureMarks,
  captureMarkIDs,
} from '../src/domain/passport';
import {
  parseShowdown,
  exportShowdown,
  importShowdownTeam,
} from '../src/domain/showdown';
import {
  emptyCollection,
  addPokemon,
  blankPokemon,
  movePokemon,
  editBox,
} from '../src/domain/organisation';
const ctx = (id: string) => ({ id, at: '2026-10-21T12:00:00Z' });
test('guide layout extension restores competitive boxes and both complete parties', () => {
  let c = importBackup(
    '{"fileVersion":5,"boxes":["Ribbon box"],"pokemon":[]}',
    'c',
    'r',
  );
  const box = c.boxes[0]!.id;
  for (let i = 0; i < 6; i++) {
    c = addPokemon(
      c,
      { ...blankPokemon('r' + i), species: 'pikachu' },
      box,
      ctx('r' + i),
    );
    c = movePokemon(c, 'r' + i, { partySlot: i }, ctx('rp' + i));
  }
  const members = parseShowdown(
    Array(6).fill('Mew\n- Psychic').join('\n\n'),
    Array.from({ length: 6 }, (_, i) => 's' + i),
  );
  c = importShowdownTeam(c, members, 'Battlers', 't', 'cb', ctx('team'));
  for (let i = 0; i < 6; i++)
    c = movePokemon(c, 's' + i, { partySlot: i }, ctx('cp' + i));
  const restored = importBackup(exportSource(c), 'restored', 'r2');
  assert.equal(restored.boxes.find((b) => b.id === 'cb')!.kind, 'showdown');
  assert.equal(restored.partyIDs.length, 12);
  assert.deepEqual(restored.teams, c.teams);
  assert.deepEqual(restored.partyIDs, c.partyIDs);
  assert.equal(
    importBackup(exportUniversal(restored), 'u', 'u').partyIDs.length,
    12,
  );
});
test('competitive box edits preserve unsupported storage, wallpaper and overflow slots', () => {
  const slots = [...Array(30).fill(null), { futureSlot: true }];
  slots[0] = 'p';
  const source = JSON.stringify({
    format: 'ribbon-passport',
    version: 1,
    collection: {
      pokemon: [
        { id: 'p', species: 'mew', ribbons: [], showdownSet: { moves: [] } },
      ],
      teams: [],
      competitiveStorage: {
        future: { keep: true },
        boxes: [
          {
            id: 'cb',
            name: 'Original',
            slots,
            wallpaper: {
              sunMoon: 'sm01',
              design: 'classic',
              strength: 0.65,
              future: { keep: true },
            },
          },
        ],
        partyIDs: [],
      },
    },
  });
  let c = importBackup(source, 'c', 'r');
  const b = c.boxes.find((b) => b.id === 'cb')!;
  c = editBox(
    c,
    b.id,
    { name: 'Renamed', wallpaper: { ...b.wallpaper, sunMoon: 'sm09' } },
    ctx('box'),
  );
  const storage = JSON.parse(exportSource(c)).collection.competitiveStorage;
  assert.deepEqual(storage.future, { keep: true });
  assert.deepEqual(storage.boxes[0].wallpaper.future, { keep: true });
  assert.deepEqual(storage.boxes[0].slots[30], { futureSlot: true });
  assert.equal(storage.boxes[0].wallpaper.sunMoon, 'sm09');
});
test('team edits preserve unsupported team rows and photo clearing remains cleared after reopen', () => {
  const source = JSON.stringify({
    format: 'ribbon-passport',
    version: 1,
    collection: {
      pokemon: [
        {
          id: 'p',
          species: 'mew',
          ribbons: [],
          journal: [
            {
              id: 'j',
              title: 'Memory',
              game: 'as',
              date: '',
              text: 'Note',
              photo: 'AQID',
              future: { keep: true },
            },
          ],
        },
      ],
      teams: [{ id: 'unsupported', future: { roster: ['x'] } }],
    },
  });
  let c = importBackup(source, 'c', 'r');
  assert.deepEqual(c.teams, []);
  c = updateMetadata(
    c,
    { teams: [{ id: 't', name: 'My team', memberIDs: ['p'] }] },
    ctx('team'),
  );
  assert.deepEqual(JSON.parse(exportSource(c)).collection.teams[1], {
    id: 'unsupported',
    future: { roster: ['x'] },
  });
  const r = c.records[0]!;
  c = patchPassport(
    c,
    'p',
    { journal: [{ ...r.pokemon.journal![0]!, photo: '' }] },
    r.version.revision,
    ctx('clear'),
  );
  c = importBackup(exportUniversal(c), 'u', 'u');
  const reopened = c.records[0]!;
  c = patchPassport(
    c,
    'p',
    { journal: [{ ...reopened.pokemon.journal![0]!, text: 'Edited later' }] },
    reopened.version.revision,
    ctx('edit'),
  );
  const note = JSON.parse(exportSource(c)).collection.pokemon[0].journal[0];
  assert.equal(note.photo, '');
  assert.deepEqual(note.future, { keep: true });
});
test('preferences preserve unsupported team containers, note values, and source numbers', () => {
  const original =
    '{"fileVersion":5,"pokemon":[],"teams":{"future":9007199254740993123},"sourceNotes":{"future":9007199254740993123}}';
  let c = importBackup(original, 'c', 'r');
  c = updateMetadata(c, { appearance: 'light' }, ctx('theme'));
  assert.ok(exportSource(c).includes('9007199254740993123'));
  assert.equal(
    JSON.parse(exportSource(c)).teams.future,
    JSON.parse(original).teams.future,
  );
  c = updateMetadata(c, { sourceNotes: { a: 'private note' } }, ctx('note'));
  assert.ok(exportSource(c).includes('"a": "private note"'));
  assert.ok(exportSource(c).includes('9007199254740993123'));
});
test('visit removal survives both backup formats and keeps opaque rows in place', () => {
  const original = JSON.stringify({
    format: 'ribbon-passport',
    version: 1,
    collection: {
      pokemon: [
        {
          id: 'p',
          species: 'mew',
          ribbons: [],
          visits: [
            { id: 'v', game: 'as', future: 1 },
            { opaque: true },
            { id: 'w', game: 'x', extra: 'keep' },
          ],
        },
      ],
      teams: [],
    },
  });
  const c = importBackup(original, 'c', 'r'),
    r = c.records[0]!;
  const next = patchPassport(
    c,
    'p',
    { visits: r.pokemon.visits!.filter((v) => v.game !== 'as') },
    r.version.revision,
    ctx('visit'),
  );
  const rows = JSON.parse(exportSource(next)).collection.pokemon[0].visits;
  assert.deepEqual(rows, [
    { opaque: true },
    { id: 'w', game: 'x', extra: 'keep' },
  ]);
  assert.equal(
    importBackup(exportUniversal(next), 'u', 'u').records[0]!.pokemon.visits!
      .length,
    1,
  );
});
test('Showdown fields and unknown lines survive import, editing, native export and reopening', () => {
  const text =
    'Sparky (Pikachu) (F) @ Light Ball\nAbility: Static\nLevel: 50\nShiny: Yes\nEVs: 252 SpA / 252 Spe\nTimid Nature\nIVs: 0 Atk\nTera Type: Electric\nHappiness: 200\n- Thunderbolt\n- Protect';
  const p = parseShowdown(text, ['p'], 'vio', 'vio')[0]!;
  assert.equal(p.gender, 'female');
  assert.equal(p.nickname, 'Sparky');
  assert.equal(p.currentlevel, 50);
  assert.ok(p.shiny);
  assert.deepEqual(parseShowdown(exportShowdown([p]), ['p'], 'vio', 'vio'), [
    p,
  ]);
  let c = importShowdownTeam(
    emptyCollection('c', 'r', 'b'),
    [p],
    'My team',
    't',
    'cb',
    ctx('import'),
  );
  let native = JSON.parse(exportSource(c));
  native.collection.pokemon[0].showdownSet.future = { keep: true };
  c = importBackup(JSON.stringify(native), 'c2', 'r2');
  const r = c.records[0]!;
  c = patchPassport(
    c,
    'p',
    { showdownSet: { ...r.pokemon.showdownSet!, item: 'Focus Sash' } },
    r.version.revision,
    ctx('edit'),
  );
  native = JSON.parse(exportSource(c));
  assert.deepEqual(native.collection.pokemon[0].showdownSet.future, {
    keep: true,
  });
  assert.deepEqual(
    importBackup(exportUniversal(c), 'u', 'u').records[0]!.pokemon.showdownSet!
      .extraLines,
    ['Happiness: 200'],
  );
  assert.equal(native.collection.selectedTeamID, 't');
  assert.throws(
    () => parseShowdown('Pikachu\nLevel: 101', ['p']),
    /Invalid level/,
  );
  assert.throws(
    () => parseShowdown('=== A ===\nPikachu\n\n=== B ===\nMew', ['p', 'q']),
    /single/,
  );
});
test('ribbon and competitive parties each hold six independent members and export separately', () => {
  let c = emptyCollection('c', 'r', 'b');
  for (let i = 0; i < 6; i++) {
    const p = { ...blankPokemon('p' + i), species: 'pikachu' };
    c = addPokemon(c, p, 'b', ctx('a' + i));
    c = movePokemon(c, p.id, { partySlot: i }, ctx('m' + i));
  }
  const members = parseShowdown(
    Array(6).fill('Mew\n- Psychic').join('\n\n'),
    Array.from({ length: 6 }, (_, i) => 's' + i),
  );
  c = importShowdownTeam(c, members, 'Battlers', 't', 'cb', ctx('team'));
  for (let i = 0; i < 6; i++)
    c = movePokemon(c, 's' + i, { partySlot: i }, ctx('s' + i));
  assert.equal(c.partyIDs.length, 12);
  const native = JSON.parse(exportSource(c)).collection;
  assert.deepEqual(native.storage.partyIDs, [
    'p0',
    'p1',
    'p2',
    'p3',
    'p4',
    'p5',
  ]);
  assert.deepEqual(native.competitiveStorage.partyIDs, [
    's0',
    's1',
    's2',
    's3',
    's4',
    's5',
  ]);
  assert.equal(importBackup(exportUniversal(c), 'u', 'u').partyIDs.length, 12);
  assert.equal(importBackup(exportSource(c), 'v', 'v').partyIDs.length, 12);
  assert.throws(
    () => movePokemon(c, 's0', { boxID: 'b', slot: 0 }, ctx('wrong')),
    /within its collection/,
  );
});
test('manual capture marks preserve other ribbons, clear removed titles and reject earning ribbons', () => {
  let c = emptyCollection('c', 'r', 'b');
  const mark = captureMarkIDs[0]!;
  assert.ok(mark);
  c = addPokemon(
    c,
    {
      ...blankPokemon('p'),
      species: 'pikachu',
      ribbons: ['alert-ribbon', mark],
      title: mark,
    },
    'b',
    ctx('add'),
  );
  const next = setCaptureMarks(
    c,
    'p',
    [],
    c.records[0]!.version.revision,
    ctx('marks'),
  );
  assert.deepEqual(next.records[0]!.pokemon.ribbons, ['alert-ribbon']);
  assert.equal(next.records[0]!.pokemon.title, 'None');
  assert.throws(
    () =>
      setCaptureMarks(
        c,
        'p',
        ['alert-ribbon'],
        c.records[0]!.version.revision,
        ctx('bad'),
      ),
    /capture/,
  );
});
