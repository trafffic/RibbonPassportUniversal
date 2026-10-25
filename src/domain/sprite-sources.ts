import { catalog, spriteKey } from './catalog';
import type { Pokemon } from './model';
import { canonicalSpeciesID, showdownSpeciesID } from './species';

const POKESPRITE =
  'https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/';
const POKEAPI =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const SHOWDOWN = 'https://play.pokemonshowdown.com/sprites/';

/** "regular/female/slug.png", derived from the bundled-art key. */
export function spritePath(p: Pokemon): string {
  const key = spriteKey(p).replace(/^sprite-/, '');
  if (key === 'lugia-shadow') return 'regular/lugia-shadow.png';
  const m = /^(regular|shiny)_(female_)?(.+)$/.exec(key);
  return m ? `${m[1]}/${m[2] ? 'female/' : ''}${m[3]}.png` : `regular/${key}.png`;
}

/**
 * Remote sprite URLs in the iPhone app's order: PokeSprite, PokeAPI for
 * Gen 9 species, then the Showdown Gen 5 sprite.
 */
export function spriteSources(p: Pokemon): string[] {
  const info = catalog.pokemon[canonicalSpeciesID(p.species)];
  const sources = [POKESPRITE + spritePath(p)];
  if (spritePath(p).includes('/female/')) sources.push(POKESPRITE + spritePath(p).replace('/female/', '/'));
  const number = info?.pokeapiID;
  if (number && number >= 906)
    sources.push(`${POKEAPI}${p.shiny ? 'shiny/' : ''}${number}.png`);
  sources.push(
    `${SHOWDOWN}${p.shiny ? 'gen5-shiny' : 'gen5'}/${showdownSpeciesID(p.species)}.png`,
  );
  return sources;
}
