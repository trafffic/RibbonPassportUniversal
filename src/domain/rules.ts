import { catalog, ruleData as data, generation, sortGames, sortAwards, recordedVisits } from './catalog';
import type { Pokemon } from './model';

export const optionalSizeMarks = ['mini-mark', 'jumbo-mark'];
export const postCaptureMarks = ['partner-mark', 'gourmand-mark', 'itemfinder-mark', ...optionalSizeMarks];
export const isManagedAward = (id: string) => data.awards[id]?.mark === false || postCaptureMarks.includes(id);
export const managedAwardIDs = sortAwards(Object.keys(data.awards).filter(isManagedAward));
export const ribbonIDs = sortAwards(Object.keys(data.awards).filter(id => !data.awards[id]!.mark));
export const group = (game: string) => data.games[game]?.group ?? catalog.gameInfo[game]?.group;
export function reachableGroups(game: string): Set<string> {
  const start = group(game), seen = new Set<string>(), queue: string[] = [];
  if (start) { seen.add(start); queue.push(start); }
  for (let i = 0; i < queue.length; i++) for (const next of data.travel[queue[i]!] ?? []) {
    if (!seen.has(next)) { seen.add(next); queue.push(next); }
  }
  return seen;
}
export function compatibleGames(p: Pokemon, reachableOnly = true): string[] {
  const info = data.species[p.species];
  if (!info) return [];
  const current = p.currentgame || p.origingame, groups = reachableGroups(current);
  const bdsp = ['bd', 'sp'];
  return sortGames(Object.keys(data.games).filter(id => {
    const game = data.games[id]!;
    if (game.service || !info.games.includes(id)) return false;
    if (reachableOnly && current && !groups.has(game.group)) return false;
    if (p.ball === 'go-safari' && id !== 'go') return false;
    if (p.gmax && ['pikachu', 'eevee', 'meowth', 'duraludon'].includes(info.base) && !['sw', 'sh'].includes(id)) return false;
    if (info.base === 'spinda' && (bdsp.includes(current) || bdsp.includes(p.origingame)) !== bdsp.includes(id)) return false;
    if (info.base === 'nincada') {
      if (bdsp.includes(p.origingame) && !['sw', 'sh'].includes(current) && ['sw', 'sh'].includes(id)) return false;
      if (!bdsp.includes(current) && !bdsp.includes(p.origingame) && bdsp.includes(id)) return false;
    }
    return true;
  }));
}
export function unavailableReason(award: string, game: string, p: Pokemon, historical = false, checkCompatibility = true): string | null {
  const rule = data.awards[award], info = data.species[p.species];
  if (!rule || !info) return 'Choose a Pokémon';
  if (!historical && award === 'jumbo-mark' && p.sizeScale !== 255) return 'Requires maximum size (255). Confirm size in Edit Pokémon.';
  if (!historical && award === 'mini-mark' && p.sizeScale !== 0) return 'Requires minimum size (0). Confirm size in Edit Pokémon.';
  if (rule.memory) return 'Combined automatically from original ribbons';
  if (!rule.games.length) return 'Event distribution only';
  if (!rule.games.includes(game)) return 'Not awarded in this game';
  if (checkCompatibility && !compatibleGames(p, !historical).includes(game)) return 'This Pokémon cannot reach this game';
  if (rule.nomythical && info.mythical) return 'Mythical Pokémon cannot enter this challenge';
  if (rule.banned.includes(info.base)) return 'This Pokémon cannot enter this challenge';
  if (award === 'tower-master-ribbon' && ['bd', 'sp'].includes(game) && (info.mythical || rule.bannedBDSP.includes(info.base))) return 'This Pokémon cannot enter the BDSP Battle Tower';
  if (award === 'battle-tree-great-ribbon' && ['sun', 'moon'].includes(game) && (info.mythical || data.awards['battle-tree-master-ribbon']?.banned.includes(info.base))) return 'This Pokémon needs Ultra Sun or Ultra Moon';
  if (award === 'national-ribbon') {
    const origin = p.origingame || p.currentgame;
    const shadow = origin === 'colosseum' ? info.flags.includes('colShadow') : ['xd', 'xd-nso'].includes(origin) && info.flags.includes('xdShadow');
    if (!p.shadow || !shadow) return 'Requires a Shadow Pokémon from Colosseum or XD';
  }
  if (!historical) {
    if (award === 'winning-ribbon' && p.currentlevel > 50) return 'Requires level 50 or below';
    if (award === 'gorgeous-ribbon' && ['bd', 'sp'].includes(game) && (p.ribbons.includes('royal-ribbon') || p.ribbons.includes('gorgeous-royal-ribbon'))) return 'The earlier purchase is no longer available';
    if (award === 'royal-ribbon' && ['bd', 'sp'].includes(game) && p.ribbons.includes('gorgeous-royal-ribbon')) return 'The earlier purchase is no longer available';
    if (award === 'footprint-ribbon' && !['diamond', 'pearl', 'platinum'].includes(game) && !(info.voiceless && ['bd', 'sp'].includes(game))) {
      const resets = ['3', '4', '3DSVC'].includes(group(p.currentgame || p.origingame) ?? '');
      if (resets) { if (p.currentlevel > 70) return 'Transfer resets the met level above 70'; }
      else if (p.origingame !== 'go' && p.metLevel !== undefined) { if (p.metLevel > 70) return 'Requires gaining 30 levels after being met'; }
      else if (p.origingame !== 'go' && p.currentlevel > 70) return 'Set the met level to check the 30-level requirement';
    }
  }
  return null;
}
export const earningGames = (award: string, p: Pokemon) => p.ribbons.includes(award) ? [] : compatibleGames(p).filter(game => !unavailableReason(award, game, p, false, false));
export function laterGames(award: string, from: string, p: Pokemon): string[] {
  const groups = reachableGroups(from);
  return compatibleGames(p).filter(game => generation(game) > generation(from) && groups.has(group(game) ?? '') && !unavailableReason(award, game, p, false, false));
}
export function generationEarningGames(award: string, from: string, p: Pokemon): string[] {
  const departureGeneration = data.games[from]?.gen;
  if (departureGeneration === undefined) return [];
  const groups = reachableGroups(from);
  return compatibleGames(p).filter(game => generation(game) === departureGeneration && groups.has(group(game) ?? '') && !unavailableReason(award, game, p, false, false));
}
export interface TransferCheck {
  generation?: number; nextGeneration?: number; canAssess: boolean;
  lastChance: string[]; canWait: string[]; warnings: string[]; isSafe: boolean;
}
export function transferCheck(from: string, p: Pokemon): TransferCheck {
  const check: TransferCheck = { canAssess: false, lastChance: [], canWait: [], warnings: [], isSafe: false };
  if (!data.games[from] || !data.species[p.species] || !compatibleGames(p).includes(from)) return check;
  check.generation = generation(from); check.canAssess = true;
  const groups = reachableGroups(from);
  const later = compatibleGames(p).filter(game => generation(game) > check.generation! && groups.has(group(game) ?? ''));
  if (later.length) check.nextGeneration = Math.min(...later.map(generation));
  for (const award of managedAwardIDs) {
    if (optionalSizeMarks.includes(award) || p.ribbons.includes(award) || !generationEarningGames(award, from, p).length) continue;
    (laterGames(award, from, p).length ? check.canWait : check.lastChance).push(award);
  }
  if (!p.ribbons.includes('footprint-ribbon') && p.metLevel === undefined && p.currentlevel > 70 && p.origingame !== 'go' &&
    !['3', '4', '3DSVC'].includes(group(p.currentgame || p.origingame) ?? '') && compatibleGames(p).some(game =>
      generation(game) === check.generation && groups.has(group(game) ?? '') && unavailableReason('footprint-ribbon', game, p, false, false) === 'Set the met level to check the 30-level requirement')) {
    check.warnings.push('Set Met level in Edit Pokémon to check whether Footprint can still be earned.');
  }
  check.isSafe = check.nextGeneration !== undefined && !check.lastChance.length && !check.warnings.length;
  return check;
}
export function recordRibbon(p: Pokemon, award: string, game: string): Pokemon {
  if (p.ribbons.includes(award)) throw new Error('This ribbon is already owned. Its earning history was kept.');
  if (!isManagedAward(award)) throw new Error('This award cannot be recorded manually.');
  const reason = unavailableReason(award, game, p);
  if (reason) throw new Error(reason);
  const visits = recordedVisits(p);
  if (!visits.some(v => v.game === game)) visits.push({ id: `earned-${p.id}-${game}`, game });
  return { ...p, ribbons: [...p.ribbons, award], earnedGames: { ...p.earnedGames, [award]: game },
    earnedGenerations: { ...p.earnedGenerations, [award]: generation(game) }, visits };
}
export function removeRibbon(p: Pokemon, award: string): Pokemon {
  const earnedGames = { ...p.earnedGames }, earnedGenerations = { ...p.earnedGenerations };
  delete earnedGames[award]; delete earnedGenerations[award];
  return { ...p, ribbons: p.ribbons.filter(id => id !== award), earnedGames, earnedGenerations,
    ...(p.title === award ? { title: 'None', titleText: '' } : {}) };
}
export function assignableGames(p: Pokemon, award: string): string[] {
  const rule = data.awards[award], gen = p.earnedGenerations?.[award];
  if (!p.ribbons.includes(award) || !rule || rule.memory || p.earnedGames?.[award]) return [];
  const visited = new Set(recordedVisits(p).map(v => v.game));
  return compatibleGames(p, false).filter(game => visited.has(game) &&
    (!gen || generation(game) === gen) && unavailableReason(award, game, p, true) === null);
}
export function assignAwardGame(p: Pokemon, award: string, game: string): Pokemon {
  if (!assignableGames(p, award).includes(game)) throw new Error('This ribbon cannot be assigned to that game.');
  return { ...p, earnedGames: { ...p.earnedGames, [award]: game },
    earnedGenerations: { ...p.earnedGenerations, [award]: generation(game) }, visits: recordedVisits(p) };
}
