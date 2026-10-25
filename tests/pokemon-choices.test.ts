import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/domain/catalog';
import { baseSpeciesID, formOptions, speciesOptions } from '../src/ui/pokemon-choices';
import { canonicalSpeciesID, formName, speciesLabel } from '../src/domain/species';
import { blankPokemon, addPokemon, editPokemon, emptyCollection } from '../src/domain/organisation';
import { compatibleGames } from '../src/domain/rules';
import { exportShowdown, parseShowdown } from '../src/domain/showdown';

test('species choices show one entry per National Pokédex number in numeric order', () => {
  assert.equal(speciesOptions.length, 1025);
  for (const [i, option] of speciesOptions.entries()) {
    assert.ok(option.name.startsWith(`#${String(i + 1).padStart(4, '0')} `));
  }
  assert.deepEqual(speciesOptions[24], { id: 'pikachu', name: '#0025 Pikachu' });
  assert.equal(speciesOptions.filter((o) => o.id.startsWith('pikachu')).length, 1);
  assert.equal(baseSpeciesID('nidoran-f'), 'nidoran-f');
  assert.equal(baseSpeciesID('nidoran-m'), 'nidoran-m');
});

test('zero-number forms are available after choosing their species', () => {
  assert.equal(baseSpeciesID('pikachu-alola-cap'), 'pikachu');
  assert.deepEqual(formOptions('pikachu')[0], { id: 'pikachu', name: 'Standard' });
  assert.ok(formOptions('pikachu').some((o) => o.id === 'pikachu-alola-cap' && o.name === 'Alola Cap'));
  assert.ok(formOptions('raichu').some((o) => o.id === 'raichu-alola'));
  assert.ok(formOptions('unown').some((o) => o.id === 'unown-b' && o.name === 'B'));
  assert.deepEqual(formOptions('caterpie'), [{ id: 'caterpie', name: 'Standard' }]);
  assert.deepEqual(formOptions(''), []);
});

test('every saved catalogue identity remains selectable in its species form list', () => {
  const selectableSpecies = new Set(speciesOptions.map((o) => o.id));
  for (const id of Object.keys(catalog.pokemon)) {
    const base = baseSpeciesID(id);
    assert.ok(selectableSpecies.has(base), id);
    assert.ok(formOptions(base).some((o) => o.id === canonicalSpeciesID(id)), id);
    assert.deepEqual(formOptions(id), formOptions(base));
  }
});

test('duplicate forms have one clean choice while legacy identities keep the same label', () => {
  const forms = formOptions('pikachu');
  assert.equal(forms.filter(o => o.name === 'Alola Cap').length, 1);
  assert.ok(!forms.some(o => o.name === 'Alola'));
  assert.equal(canonicalSpeciesID('pikachu-alola'), 'pikachu-alola-cap');
  assert.equal(formName('pikachu-alola'), 'Alola Cap');
  assert.equal(formName('calyrex-ice'), 'Ice Rider');
  assert.equal(formName('tauros-aqua'), 'Paldean Aqua Breed');
  assert.equal(speciesLabel({ species: 'farfetchu2019d-galar', gmax: false }), 'Farfetch’d · Galar');
  assert.equal(speciesLabel({ species: 'pikachu-alola', gmax: false }), 'Pikachu · Alola Cap');
});

test('legacy form aliases use canonical compatibility without rewriting saved identities', () => {
  const p = { ...blankPokemon('old-cap'), species: 'pikachu-alola', currentgame: 'sun' };
  assert.ok(!compatibleGames(p, false).includes('emerald'));
  assert.ok(compatibleGames(p, false).includes('sun'));
  const c = addPokemon(emptyCollection('c', 'r', 'box'), p, 'box', { id: 'add', at: '' });
  const next = editPokemon(c, p.id, { ...p, nickname: 'Cap partner' }, 'add', { id: 'edit', at: '' });
  assert.equal(next.records[0]!.pokemon.species, 'pikachu-alola');
  assert.ok(!('species' in next.records[0]!.changes));
});

test('cap and rider forms retain their identity in Showdown exports', () => {
  const build = { item: '', ability: '', nature: '', evs: '', ivs: '', teraType: '', moves: [] };
  for (const [species, name] of [['pikachu-alola-cap', 'Pikachu-Alola'], ['calyrex-ice-rider', 'Calyrex-Ice']]) {
    const text = exportShowdown([{ ...blankPokemon('p'), species: species!, showdownSet: build }]);
    assert.ok(text.startsWith(name!), text);
    assert.equal(canonicalSpeciesID(parseShowdown(text, ['imported'])[0]!.species), species);
  }
});
