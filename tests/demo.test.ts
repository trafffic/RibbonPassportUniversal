import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDemo } from '../src/domain/sample';
import { emptyCollection, addPokemon, blankPokemon, ribbonMastersGuide } from '../src/domain/organisation';
import { importBackup, exportUniversal, exportSource } from '../src/backup/codec';

let n = 0;
const newID = () => `id-${++n}`;
const ctx = () => ({ id: newID(), at: '2026-01-01T00:00:00Z' });
const empty = () => emptyCollection('c', 'r', 'box');

test('Try demo adds six demo Pokemon and a Demo Ribbon Team to an empty collection', () => {
  const c = applyDemo(empty(), ctx(), newID);
  assert.equal(c.records.length, 6);
  assert.ok(c.records.every(r => r.pokemon.source === 'demo'));
  assert.equal(c.boxes[0]!.slots.filter(Boolean).length, 6);
  assert.deepEqual(c.teams!.map(t => t.name), ['Demo Ribbon Team']);
  assert.equal(c.teams![0]!.memberIDs.length, 6);
  assert.deepEqual(importBackup(exportUniversal(c), 'x', 'y').records.map(r => r.pokemon.species), c.records.map(r => r.pokemon.species));
});

test('Refresh demo keeps ids, passport extras and non-demo Pokemon', () => {
  let c = applyDemo(empty(), ctx(), newID);
  const mine = { ...blankPokemon('mine'), species: 'pikachu', currentgame: 'sw', origingame: 'sw' };
  c = addPokemon(c, mine, 'box', ctx());
  const pika = c.records.find(r => r.pokemon.species === 'pikachu' && r.pokemon.source === 'demo')!;
  pika.pokemon = { ...pika.pokemon, nickname: 'Edited', ribbons: [], journal: [{ id: 'm', title: 't', game: 'sw', date: '', text: '' }] };
  const teamID = c.teams![0]!.id;
  const next = applyDemo(c, ctx(), newID);
  assert.equal(next.records.length, 7);
  const again = next.records.find(r => r.id === pika.id)!;
  assert.equal(again.pokemon.nickname, 'Sparky');
  assert.equal(again.pokemon.journal?.length, 1);
  assert.ok(next.records.some(r => r.id === 'mine'));
  assert.equal(next.teams!.length, 1);
  assert.equal(next.teams![0]!.id, teamID);
  assert.equal(new Set(next.records.map(r => r.id)).size, 7);
});

test('Refresh demo keeps user team and party membership of demo Pokemon and selects the demo team', () => {
  let c = applyDemo(empty(), ctx(), newID);
  const pika = c.records.find(r => r.pokemon.species === 'pikachu')!.id;
  c = addPokemon(c, { ...blankPokemon('mine'), species: 'pikachu', currentgame: 'sw', origingame: 'sw' }, 'box', ctx());
  c = { ...c, partyIDs: [pika, 'mine'], teams: [...c.teams!, { id: 'user', name: 'Mine', memberIDs: ['mine', pika] }] };
  const next = applyDemo(c, ctx(), newID);
  assert.deepEqual(next.teams!.find(t => t.id === 'user')!.memberIDs, ['mine', pika]);
  assert.deepEqual(next.partyIDs, [pika, 'mine']);
  assert.equal(next.selectedTeamID, next.teams!.find(t => t.name === 'Demo Ribbon Team')!.id);
});

test('ribbonMastersGuide exports a ribbons.guide backup without competitive Pokemon', () => {
  let c = applyDemo(empty(), ctx(), newID);
  c = addPokemon(c, { ...blankPokemon('build'), species: 'pikachu', currentgame: 'sw', origingame: 'sw', showdownSet: { item: '', ability: '', nature: '', evs: '', ivs: '', teraType: '', moves: [] } }, 'box', ctx());
  const out = JSON.parse(exportSource(ribbonMastersGuide(c)));
  assert.equal(out.fileVersion, 5);
  assert.equal(out.pokemon.length, 6);
  assert.ok(out.pokemon.every((p: any) => p.id !== 'build'));
  assert.equal(importBackup(JSON.stringify(out), 'x', 'y').records.length, 6);
});
