import demo from '../../assets/data/demo-backup.json';
import { importBackup } from '../backup/codec';
import type { Collection } from './model';

// Same authored journeys and generation-only earning history as SharedStore.demo().
export function createSample(): Collection {
  const collection = importBackup(JSON.stringify(demo), 'sample-collection-v1', 'sample-v1');
  const routes: Record<string, string[]> = { pikachu: ['sw'], lugia: ['xd', 'diamond', 'white', 'as'], rayquaza: ['ruby', 'xd', 'platinum', 'white', 'as'], metagross: ['diamond', 'platinum', 'white', 'x', 'as', 'sun', 'sw', 'scar'], gardevoir: ['as'], sylveon: ['vio'] };
  for (const record of collection.records) {
    const p = record.pokemon;
    p.visits = (routes[p.species] ?? []).map(game => ({ id: `sample-${p.id}-${game}`, game }));
    p.earnedGenerations = Object.fromEntries(p.ribbons.map(id => {
      let gen = p.species === 'pikachu' ? 8 : p.species === 'sylveon' ? 9 : 6;
      if (p.species === 'lugia' && ['national-ribbon', 'earth-ribbon'].includes(id)) gen = 3;
      if (p.species === 'rayquaza') gen = id.endsWith('-sinnoh') || id === 'sinnoh-champion-ribbon' ? 4 : id.endsWith('-hoenn') || ['earth-ribbon', 'artist-ribbon', 'champion-ribbon'].includes(id) ? 3 : 6;
      if (p.species === 'metagross') {
        if (id.endsWith('-sinnoh') || id.includes('ability-ribbon') || id === 'sinnoh-champion-ribbon') gen = 4;
        else if (['alola-champion-ribbon', 'battle-tree-great-ribbon', 'battle-tree-master-ribbon'].includes(id)) gen = 7;
        else if (['galar-champion-ribbon', 'tower-master-ribbon'].includes(id)) gen = 8;
        else if (['paldea-champion-ribbon', 'master-rank-ribbon'].includes(id)) gen = 9;
      }
      return [id, gen];
    }));
    record.changes = { visits: p.visits, earnedGenerations: p.earnedGenerations };
  }
  collection.boxes.push({ id: 'sample-box-2', name: 'Next adventure', slots: Array(30).fill(null) });
  return collection;
}
