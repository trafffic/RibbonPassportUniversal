import catalogData from '../../assets/data/catalog.json';
import orderData from '../../assets/data/catalog-order.json';
import rulesData from '../../assets/data/ribbon-rules.json';
import type { Pokemon, Visit } from './model';
import { canonicalSpeciesID, speciesLabel, spriteSpeciesID } from './species';

interface SpeciesInfo { name: string; sprite?: string; female?: boolean; natdex?: number; showdown?: string; pokeapiID?: number }
interface Catalog {
  pokemon: Record<string, SpeciesInfo>;
  ribbons: Record<string, string>;
  games: Record<string, string>;
  titles: Record<string, string>;
  merges: Record<string, string>;
  gameInfo: Record<string, { gen: number; group: string }>;
  gmaxSpecies: string[];
}
export interface AwardRule {
  gen: number; games: string[]; description: string; banned: string[];
  bannedBDSP: string[]; nomythical: boolean; mark: boolean; memory: boolean;
}
export interface SpeciesRule {
  games: string[]; mythical: boolean; legendary: boolean; flags: string[]; voiceless: boolean; base: string;
}
export const catalog: Catalog = catalogData;
export const ruleData = rulesData as {
  species: Record<string, SpeciesRule>;
  awards: Record<string, AwardRule>;
  games: Record<string, { gen: number; group: string; service: boolean }>;
  travel: Record<string, string[]>;
};
const gameIndex = new Map(orderData.games.map((id, i) => [id, i]));
const awardIndex = new Map(orderData.awards.map((id, i) => [id, i]));
export const sortGames = (ids: string[]) => [...new Set(ids)].sort((a, b) =>
  (gameIndex.get(a) ?? 9999) - (gameIndex.get(b) ?? 9999) || a.localeCompare(b));
export const sortAwards = (ids: string[]) => [...new Set(ids)].sort((a, b) =>
  (awardIndex.get(a) ?? 9999) - (awardIndex.get(b) ?? 9999) || a.localeCompare(b));
export const gameName = (id: string) => catalog.games[id] ?? (id || 'Game not set');
export const awardName = (id: string) => catalog.ribbons[id] ?? id;
export const displayName = (p: Pokemon) => p.nickname || speciesLabel(p);
export const generation = (game: string) => ruleData.games[game]?.gen ?? catalog.gameInfo[game]?.gen ?? 0;

// Memory ribbons are a view. Original ownership and earning locations never change.
export function displayedAwards(p: Pokemon): string[] {
  const original = [...new Set(p.ribbons)];
  if (generation(p.currentgame) < 6) return sortAwards(original);
  const result = new Set(original);
  for (const group of ['contest', 'battle']) {
    const legacy = original.filter(id => catalog.merges[id] === group);
    const regular = `${group}-memory-ribbon`, gold = `${regular}-gold`;
    if (!legacy.length && !result.has(regular) && !result.has(gold)) continue;
    const threshold = group === 'contest' ? 40 :
      (generation(p.currentgame) >= 9 || ['scar', 'vio', 'home', 'homeza'].includes(p.currentgame) ? 7 : 8);
    const isGold = result.has(gold) || legacy.length >= threshold;
    legacy.forEach(id => result.delete(id)); result.delete(regular); result.delete(gold);
    result.add(isGold ? gold : regular);
  }
  return sortAwards([...result]);
}
export function earningLocation(p: Pokemon, award: string): string {
  const game = p.earnedGames?.[award];
  if (game) return gameName(game);
  const gen = p.earnedGenerations?.[award];
  return gen ? `Gen ${gen} · Game not set` : 'Game not set';
}
export function recordedVisits(p: Pokemon): Visit[] {
  const visits = new Map<string, Visit>();
  for (const visit of p.visits ?? []) if (visit.game && !visits.has(visit.game)) visits.set(visit.game, visit);
  for (const game of [p.origingame, p.currentgame, ...Object.values(p.earnedGames ?? {}).sort()]) {
    if (game && !visits.has(game)) visits.set(game, { id: `endpoint-${game}`, game });
  }
  return sortGames([...visits.keys()]).map(game => visits.get(game)!);
}
export function spriteKey(p: Pokemon): string {
  if (p.species === 'lugia-shadow' || (p.species === 'lugia' &&
    (p.shadow || ['xd', 'xd-nso'].includes(p.origingame) || ['xd', 'xd-nso'].includes(p.currentgame)))) return 'sprite-lugia-shadow';
  const info = catalog.pokemon[canonicalSpeciesID(p.species)];
  const gmax = p.gmax && catalog.gmaxSpecies.includes(p.species);
  let slug = gmax ? `${p.species}-gmax` : spriteSpeciesID(p.species);
  if (p.shiny && slug.startsWith('alcremie-')) slug = slug.replace(/caramel|lemon|matcha|mint|rainbow|rubycream|rubyswirl|salted|vanilla/g, '').replace(/--/g, '-').replace('-strawberry', '');
  const female = !gmax && p.gender === 'female' && info?.female;
  return `sprite-${p.shiny ? 'shiny' : 'regular'}_${female ? 'female_' : ''}${slug}`;
}
