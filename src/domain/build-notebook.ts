import type { Collection, Pokemon, SavedBuild, ShowdownSet } from './model';
import type { ChangeContext } from './collection';
import { patchPassport } from './passport';
import { exportShowdown } from './showdown';
const fields = [
  ['Item', 'item'],
  ['Ability', 'ability'],
  ['Nature', 'nature'],
  ['Tera type', 'teraType'],
  ['EVs', 'evs'],
  ['IVs', 'ivs'],
] as const;
const cleanMoves = (build: ShowdownSet) =>
  build.moves.map((m) => m.trim()).filter(Boolean);
const copy = (build: ShowdownSet): ShowdownSet => ({
  ...build,
  moves: [...build.moves],
  ...(build.extraLines ? { extraLines: [...build.extraLines] } : {}),
});
export interface BuildDifference {
  label: string;
  saved: string;
  current: string;
}
export function savedBuilds(p: Pokemon): SavedBuild[] {
  return [...(p.savedBuilds ?? [])].reverse();
}
export function diffBuild(
  saved: ShowdownSet,
  current: ShowdownSet,
): BuildDifference[] {
  const rows: BuildDifference[] = fields
    .filter(([, key]) => saved[key] !== current[key])
    .map(([label, key]) => ({
      label,
      saved: saved[key],
      current: current[key],
    }));
  const a = cleanMoves(saved).join(', '),
    b = cleanMoves(current).join(', ');
  if (a !== b) rows.push({ label: 'Moves', saved: a, current: b });
  if (
    (saved.extraLines ?? []).join('\n') !==
    (current.extraLines ?? []).join('\n')
  )
    rows.push({
      label: 'Other lines',
      saved: (saved.extraLines ?? []).join(', '),
      current: (current.extraLines ?? []).join(', '),
    });
  return rows;
}
export function saveBuildVersion(
  c: Collection,
  pokemonID: string,
  input: { id: string; name: string; note?: string },
  expected: string,
  ctx: ChangeContext,
): Collection {
  const p = c.records.find((r) => r.id === pokemonID)?.pokemon;
  if (!p?.showdownSet)
    throw new Error('No battle build recorded for this Pokémon.');
  const name = input.name.trim();
  if (!name) throw new Error('Name this version before saving it.');
  const versions = p.savedBuilds ?? [];
  if (versions.some((v) => v.id === input.id))
    throw new Error('Record identities must be unique.');
  const build: SavedBuild = {
    id: input.id,
    name,
    build: copy(p.showdownSet),
    note: input.note?.trim() ?? '',
    sourceIDs: [...(p.communitySourceIDs ?? [])],
  };
  return patchPassport(
    c,
    pokemonID,
    { savedBuilds: [...versions, build] },
    expected,
    ctx,
  );
}
export function removeBuildVersion(
  c: Collection,
  pokemonID: string,
  versionID: string,
  expected: string,
  ctx: ChangeContext,
): Collection {
  const p = c.records.find((r) => r.id === pokemonID)?.pokemon;
  return patchPassport(
    c,
    pokemonID,
    { savedBuilds: (p?.savedBuilds ?? []).filter((v) => v.id !== versionID) },
    expected,
    ctx,
  );
}
export function applyBuildVersion(
  c: Collection,
  pokemonID: string,
  versionID: string,
  expected: string,
  ctx: ChangeContext,
): Collection {
  const p = c.records.find((r) => r.id === pokemonID)?.pokemon;
  const version = p?.savedBuilds?.find((v) => v.id === versionID);
  if (!version) throw new Error('That saved version no longer exists.');
  const build = { ...copy(version.build), moves: cleanMoves(version.build) };
  // Refuse a version that can no longer be exported as Showdown text.
  exportShowdown([{ ...p!, showdownSet: build }]);
  return patchPassport(c, pokemonID, { showdownSet: build }, expected, ctx);
}
export function exportBuildVersion(p: Pokemon, versionID: string): string {
  const version = p.savedBuilds?.find((v) => v.id === versionID);
  if (!version) throw new Error('That saved version no longer exists.');
  return exportShowdown([{ ...p, showdownSet: version.build }]);
}
