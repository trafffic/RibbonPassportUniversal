import data from '../../assets/data/community-content.json';
import { catalog, sortGames } from './catalog';
import { addPokemon, blankPokemon, createBox } from './organisation';
import type { Collection, Pokemon, ShowdownSet, Team } from './model';
import type { ChangeContext } from './collection';
export interface CommunitySource {
  id: string;
  title: string;
  url: string;
  author: string;
  kind: string;
  checkedOn: string;
  reviewStatus: string;
}
export interface FieldGuide {
  id: string;
  title: string;
  gameIDs: string[];
  awardIDs: string[];
  steps: string[];
  cautions: string[];
  sourceIDs: string[];
  teamIDs?: string[];
  locations?: Record<string, string>;
  requirements?: Record<string, string>;
}
export interface CommunityMember {
  species: string;
  item: string;
  ability: string;
  nature: string;
  evs: string;
  moves: string[];
  level?: number;
  ivs?: string;
  teraType?: string;
}
export interface CommunityTeam {
  id: string;
  title: string;
  gameIDs: string[];
  facility: string;
  format: string;
  author: string;
  sourceIDs: string[];
  members: CommunityMember[];
  ribbonMasterSlot: {
    status: string;
    note: string;
  };
  strategySummary: string;
  checkedOn: string;
  documentedResult?: {
    wins?: number;
    event?: string;
    evidence: string;
  };
  sourceVariantNote?: string;
  regulation?: string;
  completeness?: string;
}
export const community = data as {
  sources: CommunitySource[];
  guideModules: FieldGuide[];
  teamCandidates: CommunityTeam[];
  honorDefinitions: {
    id: string;
    title: string;
    games: string[];
    summary: string;
    trainerMilestone: boolean;
    sourceIDs: string[];
  }[];
};
export const guidesFor = (award?: string, game?: string) =>
  community.guideModules.filter(
    (g) =>
      (!award || g.awardIDs.includes(award)) &&
      (!game || g.gameIDs.includes(game)),
  );
export const guideLocation = (guide: FieldGuide, game: string) =>
  Object.entries(guide.locations ?? {}).find(([ids]) =>
    ids.split(' ').includes(game),
  )?.[1];
export const teamGames = () =>
  sortGames(community.teamCandidates.flatMap((t) => t.gameIDs));
const normal = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export function speciesID(name: string) {
  const slug = normal(name.replace(/-Gmax$/i, ''));
  return Object.keys(catalog.pokemon).find(
    (id) => normal(id) === slug || normal(catalog.pokemon[id]!.name) === slug,
  );
}
export function memberPokemon(
  member: CommunityMember,
  game: string,
  id: string,
): Pokemon {
  const species = speciesID(member.species);
  if (!species) throw new Error(`Unknown source species: ${member.species}`);
  const build: ShowdownSet = {
    item: member.item,
    ability: member.ability,
    nature: member.nature,
    evs: member.evs,
    ivs: member.ivs?.includes('Hyper Trained') ? '' : (member.ivs ?? ''),
    teraType: member.teraType ?? '',
    moves: [...member.moves],
  };
  return {
    ...blankPokemon(id),
    species,
    currentgame: game,
    currentlevel: member.level ?? 50,
    gmax: /-Gmax$/i.test(member.species),
    source: 'showdown',
    showdownSet: build,
  };
}
export function copyCommunityTeam(
  c: Collection,
  team: CommunityTeam,
  game: string,
  ids: {
    team: string;
    box: string;
    members: string[];
  },
  ctx: ChangeContext,
): Collection {
  if (!team.gameIDs.includes(game))
    throw new Error('Choose a game supported by this source team.');
  if (
    ids.members.length !== team.members.length ||
    new Set(ids.members).size !== ids.members.length ||
    c.teams?.some((t) => t.id === ids.team)
  )
    throw new Error('Team and member identities must be unique.');
  let next = createBox(
    c,
    ids.box,
    `Box ${String(c.boxes.filter((b) => b.kind === 'showdown').length + 1).padStart(2, '0')}`,
    { ...ctx, id: ctx.id + ':box' },
  );
  next = {
    ...next,
    boxes: next.boxes.map((b) =>
      b.id === ids.box ? { ...b, kind: 'showdown' } : b,
    ),
  };
  team.members.forEach((member, i) => {
    const p = memberPokemon(member, game, ids.members[i]!);
    p.communitySourceIDs = [...team.sourceIDs];
    next = addPokemon(next, p, ids.box, {
      ...ctx,
      id: ctx.id + ':member:' + i,
    });
  });
  const saved: Team = {
    id: ids.team,
    name: team.title,
    memberIDs: [...ids.members],
    communitySourceIDs: [...team.sourceIDs],
  };
  return {
    ...next,
    revision: ctx.id,
    metadataChanged: true,
    metadataChanges: [
      ...new Set([...(c.metadataChanges ?? []), 'teams' as const]),
    ],
    teams: [...(c.teams ?? []), saved],
  };
}
