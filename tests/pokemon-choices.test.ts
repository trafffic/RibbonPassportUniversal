import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/domain/catalog';
import { baseSpeciesID, formOptions, speciesOptions } from '../src/ui/pokemon-choices';

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
    assert.ok(formOptions(base).some((o) => o.id === id), id);
    assert.deepEqual(formOptions(id), formOptions(base));
  }
});
