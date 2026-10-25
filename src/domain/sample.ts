import demo from '../../assets/data/demo-backup.json';
import { importBackup } from '../backup/codec';
import type { Collection, Pokemon } from './model';
import { createBox, addPokemon } from './organisation';
import { deletePokemon } from './passport';
import type { ChangeContext } from './collection';

// Same authored journeys and generation-only earning history as SharedStore.demo().
export function createSample(): Collection {
  const collection = importBackup(
    JSON.stringify(demo),
    'sample-collection-v1',
    'sample-v1',
  );
  const routes: Record<string, string[]> = {
    pikachu: ['sw'],
    lugia: ['xd', 'diamond', 'white', 'as'],
    rayquaza: ['ruby', 'xd', 'platinum', 'white', 'as'],
    metagross: ['diamond', 'platinum', 'white', 'x', 'as', 'sun', 'sw', 'scar'],
    gardevoir: ['as'],
    sylveon: ['vio'],
  };
  for (const record of collection.records) {
    const p = record.pokemon;
    p.visits = (routes[p.species] ?? []).map((game) => ({
      id: `sample-${p.id}-${game}`,
      game,
    }));
    p.earnedGenerations = Object.fromEntries(
      p.ribbons.map((id) => {
        let gen = p.species === 'pikachu' ? 8 : p.species === 'sylveon' ? 9 : 6;
        if (
          p.species === 'lugia' &&
          ['national-ribbon', 'earth-ribbon'].includes(id)
        )
          gen = 3;
        if (p.species === 'rayquaza')
          gen =
            id.endsWith('-sinnoh') || id === 'sinnoh-champion-ribbon'
              ? 4
              : id.endsWith('-hoenn') ||
                  ['earth-ribbon', 'artist-ribbon', 'champion-ribbon'].includes(
                    id,
                  )
                ? 3
                : 6;
        if (p.species === 'metagross') {
          if (
            id.endsWith('-sinnoh') ||
            id.includes('ability-ribbon') ||
            id === 'sinnoh-champion-ribbon'
          )
            gen = 4;
          else if (
            [
              'alola-champion-ribbon',
              'battle-tree-great-ribbon',
              'battle-tree-master-ribbon',
            ].includes(id)
          )
            gen = 7;
          else if (
            ['galar-champion-ribbon', 'tower-master-ribbon'].includes(id)
          )
            gen = 8;
          else if (
            ['paldea-champion-ribbon', 'master-rank-ribbon'].includes(id)
          )
            gen = 9;
        }
        return [id, gen];
      }),
    );
    record.changes = {
      visits: p.visits,
      earnedGenerations: p.earnedGenerations,
    };
  }
  return collection;
}

const extras = [
  'ribbonGoal',
  'honors',
  'journal',
  'moveNotes',
  'savedBuilds',
  'communitySourceIDs',
] as const;
// Same semantics as replaceDemo: refresh demo-sourced Pokemon in place of the old ones, keeping their passport extras.
export function applyDemo(
  c: Collection,
  ctx: ChangeContext,
  newID: () => string,
): Collection {
  const old = c.records.filter((r) => r.pokemon.source === 'demo'),
    oldIDs = new Set(old.map((r) => r.id));
  const demoTeam = c.teams?.find(
    (t) =>
      t.name === 'Demo Ribbon Team' &&
      t.memberIDs.length &&
      t.memberIDs.every((id) => oldIDs.has(id)),
  );
  let next = c;
  for (const r of old)
    next = deletePokemon(next, r.id, { ...ctx, id: newID() });
  const used = new Set<string>(),
    added: string[] = [];
  for (const { pokemon } of createSample().records) {
    const prior = old.find(
      (r) => r.pokemon.species === pokemon.species && !used.has(r.id),
    )?.pokemon;
    const p: Pokemon = {
      ...pokemon,
      id:
        prior?.id ??
        (next.records.some((r) => r.id === pokemon.id) ? newID() : pokemon.id),
      source: 'demo',
      ...Object.fromEntries(
        extras
          .map((key) => [key, prior?.[key]] as const)
          .filter(([, value]) => value !== undefined),
      ),
    };
    used.add(p.id);
    let box = next.boxes.find(
      (b) => (b.kind ?? 'ribbon') === 'ribbon' && b.slots.includes(null),
    );
    if (!box) {
      const id = newID();
      next = createBox(
        next,
        id,
        `Box ${String(next.boxes.length + 1).padStart(2, '0')}`,
        { ...ctx, id: newID() },
      );
      next = {
        ...next,
        boxes: next.boxes.map((b) =>
          b.id === id ? { ...b, kind: 'ribbon' } : b,
        ),
      };
      box = next.boxes.find((b) => b.id === id)!;
    }
    next = addPokemon(next, p, box.id, { ...ctx, id: newID() });
    added.push(p.id);
  }
  const team = {
    id: demoTeam?.id ?? newID(),
    name: 'Demo Ribbon Team',
    memberIDs: added,
  };
  const valid = new Set(next.records.map((r) => r.id)),
    keep = (ids: string[]) => ids.filter((id) => valid.has(id)),
    teams = (c.teams ?? [])
      .filter((t) => t.id !== team.id)
      .map((t) => ({ ...t, memberIDs: keep(t.memberIDs) }));
  return {
    ...next,
    revision: ctx.id,
    partyIDs: keep(c.partyIDs),
    metadataChanged: true,
    metadataChanges: [
      ...new Set([
        ...(next.metadataChanges ?? []),
        'teams' as const,
        'selectedTeamID' as const,
      ]),
    ],
    teams: [...teams, team],
    selectedTeamID: team.id,
  };
}
