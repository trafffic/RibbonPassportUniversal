import catalogData from '../../assets/data/catalog.json';
import rulesData from '../../assets/data/ribbon-rules.json';
import type { Pokemon } from './model';

const pokemon = catalogData.pokemon as Record<string, { name: string; natdex?: number; sprite?: string; showdown?: string; female?: boolean }>;
const rules = rulesData.species as Record<string, { base: string }>;
export const dexNumber = (id: string): number =>
  pokemon[id]?.natdex || pokemon[rules[id]?.base ?? '']?.natdex || 0;
const speciesByDex = new Map<number, string>();
for (const id of Object.keys(pokemon)) {
  const number = dexNumber(id);
  if (number && rules[id]?.base === id && !speciesByDex.has(number)) speciesByDex.set(number, id);
}
export const baseSpeciesID = (id: string) => speciesByDex.get(dexNumber(id)) ?? id;

// Catalogue/provider aliases identify the same form. Stored IDs are never migrated.
const aliases: Record<string, string> = {
  'pikachu-cosplay-belle': 'pikachu-belle',
  'pikachu-cosplay-libre': 'pikachu-libre',
  'pikachu-cosplay-phd': 'pikachu-phd',
  'pikachu-cosplay-popstar': 'pikachu-pop-star',
  'pikachu-cosplay-rockstar': 'pikachu-rock-star',
  'calyrex-ice': 'calyrex-ice-rider',
  'calyrex-shadow': 'calyrex-shadow-rider',
  'rockruff-dusk': 'rockruff-own-tempo',
  'maushold-three': 'maushold',
};
for (const region of ['alola', 'hoenn', 'kalos', 'original', 'partner', 'sinnoh', 'unova', 'world']) {
  aliases[`pikachu-${region}`] = `pikachu-${region}-cap`;
}
for (const breed of ['aqua', 'blaze', 'combat']) aliases[`tauros-${breed}`] = `tauros-paldea-${breed}`;
for (const id of Object.keys(pokemon)) {
  const clean = id.replace(/u2019/g, '').replace(/u0301/g, '');
  if (clean !== id && pokemon[clean]) aliases[id] = clean;
}
export const canonicalSpeciesID = (id: string) => aliases[id] ?? id;
const decodeName = (name: string) => name.replace(/\\u([\da-f]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))).normalize('NFC');
export const speciesName = (id: string) => decodeName(pokemon[baseSpeciesID(id)]?.name ?? id);
const words: Record<string, string> = { phd: 'PhD', gmax: 'Gigantamax', rubycream: 'Ruby Cream', rubyswirl: 'Ruby Swirl' };
const titleCase = (value: string) => value.split('-').map(word =>
  words[word] ?? word.charAt(0).toUpperCase() + word.slice(1),
).join(' ');

export function formName(id: string): string {
  id = canonicalSpeciesID(id);
  const base = baseSpeciesID(id);
  if (id === base) return base === 'maushold' ? 'Family of Three' : 'Standard';
  if (id === 'maushold-four') return 'Family of Four';
  if (id.startsWith('tauros-paldea-')) return `Paldean ${titleCase(id.slice(14))} Breed`;
  const name = decodeName(pokemon[id]?.name ?? id), baseName = speciesName(base);
  return name.startsWith(`${baseName}-`) ? titleCase(name.slice(baseName.length + 1).toLowerCase()) :
    id.startsWith(`${base}-`) ? titleCase(id.slice(base.length + 1)) : name;
}
export const speciesLabel = (p: Pick<Pokemon, 'species' | 'gmax'>) => {
  const name = speciesName(p.species), form = formName(p.species);
  return `${name}${form === 'Standard' ? '' : ` · ${form}`}${p.gmax && !p.species.endsWith('-gmax') ? ' · Gigantamax factor' : ''}`;
};
export const speciesOptions = [...speciesByDex.entries()].sort(([a], [b]) => a - b)
  .map(([number, id]) => ({ id, name: `#${String(number).padStart(4, '0')} ${speciesName(id)}` }));
const formsBySpecies = new Map<string, { id: string; name: string }[]>();
for (const id of Object.keys(pokemon)) {
  if (canonicalSpeciesID(id) !== id) continue;
  const base = baseSpeciesID(id), forms = formsBySpecies.get(base) ?? [];
  forms.push({ id, name: formName(id) });
  formsBySpecies.set(base, forms);
}
for (const [base, forms] of formsBySpecies) forms.sort((a, b) =>
  a.id === base ? -1 : b.id === base ? 1 : a.name.localeCompare(b.name));
export const formOptions = (id: string) => formsBySpecies.get(baseSpeciesID(id)) ?? [];

// PokeSprite uses cap/rider suffixes; Showdown uses the shorter aliases.
// Verified against https://github.com/msikma/pokesprite/blob/master/data/pokemon.json
export function spriteSpeciesID(id: string): string {
  const canonical = canonicalSpeciesID(id);
  return pokemon[canonical]?.sprite ?? canonical;
}
export function showdownSpeciesID(id: string): string {
  const canonical = canonicalSpeciesID(id);
  const shorter = Object.keys(aliases).find(alias => aliases[alias] === canonical && pokemon[alias]?.showdown);
  return pokemon[canonical]?.showdown ?? (shorter ? pokemon[shorter]?.showdown : undefined) ?? canonical;
}
export const showdownSpeciesName = (id: string) => decodeName(pokemon[showdownSpeciesID(id)]?.name ?? speciesName(id));
