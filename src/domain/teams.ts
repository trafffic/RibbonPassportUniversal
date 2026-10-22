import type {
  Collection,
  Pokemon,
  Team,
  TeamBuild,
  TeamBuildMember,
} from './model';
import type { ChangeContext } from './collection';
import { addPokemon, blankPokemon } from './organisation';
import { patchPassport, updateMetadata } from './passport';
import { copy, diffBuild } from './build-notebook';
import { exportShowdown } from './showdown';
export function moveMember(ids: string[], index: number, delta: number) {
  const to = index + delta;
  if (to < 0 || to >= ids.length || index < 0 || index >= ids.length)
    return ids;
  const next = [...ids];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}
export function toggleMember(ids: string[], id: string) {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= 6 ? ids : [...ids, id];
}
// Saving a team makes it the default, as the iPhone app does.
export function saveTeam(c: Collection, team: Team, ctx: ChangeContext) {
  const teams = c.teams ?? [];
  return updateMetadata(
    c,
    {
      teams: teams.some((t) => t.id === team.id)
        ? teams.map((t) => (t.id === team.id ? team : t))
        : [...teams, team],
      selectedTeamID: team.id,
    },
    ctx,
  );
}
export function deleteTeam(c: Collection, id: string, ctx: ChangeContext) {
  const teams = (c.teams ?? []).filter((t) => t.id !== id);
  return updateMetadata(
    c,
    {
      teams,
      ...(c.selectedTeamID === id
        ? { selectedTeamID: teams[0]?.id ?? '' }
        : {}),
    },
    ctx,
  );
}
function withVersions(
  c: Collection,
  teamID: string,
  change: (versions: TeamBuild[]) => TeamBuild[],
  ctx: ChangeContext,
) {
  const team = c.teams?.find((t) => t.id === teamID);
  if (!team) throw new Error('Team not found.');
  return updateMetadata(
    c,
    {
      teams: c.teams!.map((t) =>
        t.id === teamID
          ? { ...t, savedBuilds: change(t.savedBuilds ?? []) }
          : t,
      ),
    },
    ctx,
  );
}
export function teamVersions(team: Team): TeamBuild[] {
  return [...(team.savedBuilds ?? [])].reverse();
}
export function teamBuildMembers(c: Collection, team: Team): TeamBuildMember[] {
  return team.memberIDs.flatMap((id) => {
    const p = c.records.find((r) => r.id === id)?.pokemon;
    return p?.showdownSet
      ? [
          {
            id: p.id,
            species: p.species,
            nickname: p.nickname,
            build: copy(p.showdownSet),
            level: p.currentlevel,
            game: p.currentgame,
            gender: p.gender,
            shiny: p.shiny,
            gmax: p.gmax,
          },
        ]
      : [];
  });
}
export function saveTeamVersion(
  c: Collection,
  teamID: string,
  input: { id: string; name: string; note?: string },
  ctx: ChangeContext,
) {
  const team = c.teams?.find((t) => t.id === teamID);
  if (!team) throw new Error('Team not found.');
  const name = input.name.trim();
  if (!name) throw new Error('Name this version before saving it.');
  if (team.savedBuilds?.some((v) => v.id === input.id))
    throw new Error('Record identities must be unique.');
  const members = teamBuildMembers(c, team);
  if (!members.length)
    throw new Error('This team has no battle builds to save.');
  return withVersions(
    c,
    teamID,
    (v) => [
      ...v,
      {
        id: input.id,
        name,
        members,
        note: input.note?.trim() ?? '',
        sourceIDs: [...(team.communitySourceIDs ?? [])],
      },
    ],
    ctx,
  );
}
export function editTeamVersion(
  c: Collection,
  teamID: string,
  versionID: string,
  input: { name: string; note: string },
  ctx: ChangeContext,
) {
  const name = input.name.trim();
  if (!name) throw new Error('Name this version before saving it.');
  return withVersions(
    c,
    teamID,
    (v) => {
      if (!v.some((x) => x.id === versionID))
        throw new Error('That saved version no longer exists.');
      return v.map((x) =>
        x.id === versionID ? { ...x, name, note: input.note.trim() } : x,
      );
    },
    ctx,
  );
}
export function removeTeamVersion(
  c: Collection,
  teamID: string,
  versionID: string,
  ctx: ChangeContext,
) {
  return withVersions(
    c,
    teamID,
    (v) => v.filter((x) => x.id !== versionID),
    ctx,
  );
}
export function memberPokemon(m: TeamBuildMember): Pokemon {
  return {
    ...blankPokemon(m.id),
    species: m.species,
    nickname: m.nickname,
    gender: m.gender ?? '',
    shiny: m.shiny ?? false,
    currentgame: m.game ?? '',
    gmax: m.gmax ?? false,
    currentlevel: m.level ?? 100,
    source: 'showdown',
    showdownSet: copy(m.build),
  };
}
export function exportTeamVersion(version: TeamBuild): string {
  return exportShowdown(version.members.map(memberPokemon));
}
// Members still in storage get their saved build back; missing ones are re-created.
export function applyTeamVersion(
  c: Collection,
  teamID: string,
  versionID: string,
  ctx: ChangeContext,
) {
  const team = c.teams?.find((t) => t.id === teamID);
  const version = team?.savedBuilds?.find((v) => v.id === versionID);
  if (!team || !version)
    throw new Error('That saved version no longer exists.');
  const members = version.members.slice(0, 6);
  // Refuse a version that can no longer be exported as Showdown text.
  exportTeamVersion({ ...version, members });
  let next = c;
  const ids: string[] = [];
  members.forEach((m, i) => {
    const step = { ...ctx, id: `${ctx.id}:${i}` };
    const record = next.records.find(
      (r) => r.id === m.id && r.pokemon.showdownSet,
    );
    if (record) {
      next = patchPassport(
        next,
        m.id,
        { showdownSet: copy(m.build) },
        record.version.revision,
        step,
      );
    } else {
      const box = next.boxes.find((b) => b.kind === 'showdown');
      if (!box) throw new Error('Create a competitive box first.');
      next = addPokemon(
        next,
        {
          ...memberPokemon(m),
          communitySourceIDs: [...version.sourceIDs],
        },
        box.id,
        step,
      );
    }
    ids.push(m.id);
  });
  return updateMetadata(
    next,
    {
      teams: next.teams!.map((t) =>
        t.id === teamID ? { ...t, memberIDs: ids } : t,
      ),
    },
    ctx,
  );
}
export function diffTeamVersion(
  c: Collection,
  team: Team,
  version: TeamBuild,
): number {
  const current = teamBuildMembers(c, team);
  return version.members.filter((m) => {
    const now = current.find((x) => x.id === m.id)?.build;
    return !now || diffBuild(m.build, now).length > 0;
  }).length;
}
