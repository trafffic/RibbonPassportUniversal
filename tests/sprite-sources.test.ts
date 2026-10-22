import test from 'node:test';
import assert from 'node:assert/strict';
import { spritePath, spriteSources } from '../src/domain/sprite-sources';
import { importBackup } from '../src/backup/codec';

const poke = (extra: object) =>
  importBackup(
    JSON.stringify({
      format: 'ribbon-passport',
      version: 1,
      collection: {
        pokemon: [{ id: 'p', species: 'gardevoir', ribbons: [], currentgame: 'sv', origingame: 'ruby', currentlevel: 50, shiny: false, ...extra }],
        teams: [],
        selectedID: 'p',
      },
    }),
    'i',
    'r',
  ).records[0]!.pokemon;

test('sprite path follows the iPhone layout for shiny and female forms', () => {
  assert.equal(spritePath(poke({})), 'regular/gardevoir.png');
  assert.equal(spritePath(poke({ shiny: true })), 'shiny/gardevoir.png');
});

test('sources are tried PokeSprite first and Showdown last', () => {
  const s = spriteSources(poke({}));
  assert.match(s[0]!, /pokesprite.*pokemon-gen8\/regular\/gardevoir\.png$/);
  assert.match(s.at(-1)!, /pokemonshowdown\.com\/sprites\/gen5\/gardevoir\.png$/);
  assert.ok(!s.some((u) => u.includes('PokeAPI')), 'Gen 3 species skip PokeAPI');
});

test('Gen 9 species add the PokeAPI sprite before the fallback', () => {
  const s = spriteSources(poke({ species: 'sprigatito' }));
  assert.ok(s.some((u) => /PokeAPI.*\/906\.png$/.test(u)));
  assert.equal(spriteSources(poke({ species: 'sprigatito', shiny: true })).some((u) => /shiny\/906\.png$/.test(u)), true);
});
