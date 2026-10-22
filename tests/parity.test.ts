import test from 'node:test';
import assert from 'node:assert/strict';
import {
  community,
  copyCommunityTeam,
  guidesFor,
  memberPokemon,
} from '../src/domain/community';
import { ruleData } from '../src/domain/catalog';
import { emptyCollection } from '../src/domain/organisation';
import { gameColour } from '../src/domain/game-colours';
import {
  patchPassport,
  validDate,
  deletePokemon,
} from '../src/domain/passport';
import {
  exportSource,
  exportUniversal,
  importBackup,
} from '../src/backup/codec';
const context = (id: string) => ({ id, at: '2026-10-21T12:00:00Z' });
test('Swift community parity: 25 bundled guides cover all 423 award/game pairs exactly once with attribution', () => {
  assert.equal(community.guideModules.length, 25);
  const sources = new Set(community.sources.map((s) => s.id));
  assert.equal(sources.size, community.sources.length);
  let count = 0;
  for (const [award, rule] of Object.entries(ruleData.awards))
    for (const game of rule.games) {
      const guides = guidesFor(award, game);
      assert.equal(guides.length, 1, award + '/' + game);
      assert.ok(guides[0]!.steps.length);
      assert.ok(guides[0]!.sourceIDs.every((id) => sources.has(id)));
      count++;
    }
  assert.equal(count, 423);
  assert.equal(guidesFor('rare-mark').length, 0);
  for (const s of community.sources)
    assert.ok(s.author && new URL(s.url).protocol === 'https:');
});
test('every source team can be copied independently with builds, attribution, separate boxes and compatible backups', () => {
  for (const team of community.teamCandidates) {
    const before = emptyCollection('c', 'r', 'b');
    const ids = {
      team: 'team',
      box: 'competitive',
      members: team.members.map((_, i) => 'member-' + i),
    };
    const copy = copyCommunityTeam(
      before,
      team,
      team.gameIDs[0]!,
      ids,
      context('copy'),
    );
    assert.equal(before.records.length, 0);
    assert.equal(copy.teams![0]!.memberIDs.length, team.members.length);
    assert.equal(
      copy.boxes.find((b) => b.id === 'competitive')!.kind,
      'showdown',
    );
    assert.ok(
      copy.records.every(
        (r) =>
          r.pokemon.source === 'showdown' && r.pokemon.ribbons.length === 0,
      ),
    );
    assert.deepEqual(
      copy.records[0]!.pokemon.communitySourceIDs,
      team.sourceIDs,
    );
    assert.notEqual(copy.records[0]!.pokemon.showdownSet, team.members[0]);
    const restored = importBackup(exportUniversal(copy), 'x', 'x');
    assert.deepEqual(restored.teams, copy.teams);
    const source = JSON.parse(exportSource(copy));
    assert.equal(source.collection.teams[0].id, 'team');
    assert.equal(
      source.collection.competitiveStorage.boxes[0].slots[0],
      ids.members[0],
    );
    const native = importBackup(exportSource(copy), 'native', 'native');
    assert.equal(native.records.length, team.members.length);
    assert.equal(
      native.boxes.find((b) => b.kind === 'showdown')!.slots[0],
      ids.members[0],
    );
    assert.throws(
      () => copyCommunityTeam(copy, team, 'not-a-game', ids, context('fail')),
      /supported/,
    );
  }
});
test('passport notes preserve opaque entry fields, photos and numbers when edited and round-tripped', () => {
  const text =
    '{"format":"ribbon-passport","version":1,"collection":{"pokemon":[{"id":"p","species":"mew","ribbons":[],"journal":[{"id":"j","title":"Old","game":"as","date":"","text":"Story","photo":"AQID","future":9007199254740993123}]}],"teams":[]}}';
  const c = importBackup(text, 'c', 'r'),
    r = c.records[0]!;
  const next = patchPassport(
    c,
    'p',
    { journal: [{ ...r.pokemon.journal![0]!, title: 'New' }] },
    r.version.revision,
    context('note'),
  );
  const output = exportSource(next);
  assert.ok(output.includes('9007199254740993123'));
  assert.equal(
    JSON.parse(output).collection.pokemon[0].journal[0].photo,
    'AQID',
  );
  assert.equal(
    importBackup(exportUniversal(next), 'u', 'u').records[0]!.pokemon
      .journal![0]!.title,
    'New',
  );
  assert.deepEqual(next.records[0]!.pokemon.ribbons, []);
  assert.throws(
    () =>
      patchPassport(
        next,
        'p',
        { journal: [] },
        r.version.revision,
        context('stale'),
      ),
    /changed/,
  );
});
test('explicit record deletion exports only remaining records and keeps unrelated opaque data', () => {
  const original =
    '{"format":"ribbon-passport","version":1,"future":12345678901234567890,"collection":{"pokemon":[{"id":"a","species":"mew","ribbons":[]},{"id":"b","species":"pikachu","ribbons":[]}],"teams":[]}}';
  const c = importBackup(original, 'c', 'r'),
    next = deletePokemon(c, 'a', context('delete'));
  const restored = importBackup(exportUniversal(next), 'u', 'r');
  assert.equal(restored.records.length, 1);
  assert.equal(JSON.parse(exportSource(next)).collection.pokemon[0].id, 'b');
  assert.ok(exportSource(next).includes('12345678901234567890'));
});
test('source date rules handle leap years and optional dates; game colours match the iPhone table', () => {
  for (const date of ['', '2024-02-29', '2026-10-21'])
    assert.ok(validDate(date));
  for (const date of ['2025-02-29', '16/10/2026', '2026-13-01'])
    assert.equal(validDate(date), false);
  assert.equal(gameColour('as', true), '#82B2FF');
  assert.equal(gameColour('or', true), '#F8A38B');
  assert.equal(gameColour('xd', false), '#785120');
  assert.equal(gameColour('vio', false), '#6B43A3');
  assert.equal(gameColour('sapphire', true), gameColour('as', true));
  assert.equal(gameColour('unknown', true), '#A6CCE8');
});
