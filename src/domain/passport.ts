import type { Collection, Pokemon, Team } from './model';
import type { ChangeContext } from './collection';
import { ruleData } from './catalog';
import { earningGames, isManagedAward, removeRibbon } from './rules';
export const captureMarkIDs = Object.entries(ruleData.awards)
  .filter(([, rule]) => rule.mark && !rule.games.length)
  .map(([id]) => id);
export function setCaptureMarks(
  c: Collection,
  id: string,
  marks: string[],
  expected: string,
  ctx: ChangeContext,
): Collection {
  const record = c.records.find((r) => r.id === id);
  if (!record || record.version.revision !== expected)
    throw new Error('This Pokémon changed. Reopen it before saving.');
  if (
    new Set(marks).size !== marks.length ||
    marks.some((mark) => !captureMarkIDs.includes(mark))
  )
    throw new Error('Choose recognised capture marks.');
  let p = record.pokemon;
  for (const mark of captureMarkIDs)
    if (p.ribbons.includes(mark) && !marks.includes(mark))
      p = removeRibbon(p, mark);
  p = {
    ...p,
    ribbons: [
      ...p.ribbons,
      ...marks.filter((mark) => !p.ribbons.includes(mark)),
    ],
  };
  const changes = {
    ...record.changes,
    ribbons: p.ribbons,
    earnedGames: p.earnedGames,
    earnedGenerations: p.earnedGenerations,
    title: p.title,
    titleText: p.titleText,
  };
  return {
    ...c,
    revision: ctx.id,
    records: c.records.map((r) =>
      r.id === id
        ? {
            ...r,
            pokemon: p,
            changes,
            version: { revision: ctx.id, parentRevision: expected },
          }
        : r,
    ),
    operations: [
      ...c.operations,
      {
        ...ctx,
        recordID: id,
        parentRevision: expected,
        revision: ctx.id,
        kind: 'edit-passport',
      },
    ],
  };
}
export function validDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const extraFields = [
  'title',
  'titleText',
  'visits',
  'honors',
  'journal',
  'moveNotes',
  'savedBuilds',
  'showdownSet',
  'source',
  'communitySourceIDs',
  'ribbonGoal',
] as const;
export function patchPassport(
  c: Collection,
  id: string,
  patch: Partial<Pick<Pokemon, (typeof extraFields)[number]>>,
  expected: string,
  ctx: ChangeContext,
): Collection {
  const record = c.records.find((r) => r.id === id);
  if (!record || record.version.revision !== expected)
    throw new Error('This Pokémon changed. Reopen it before saving.');
  if (
    Object.keys(patch).some(
      (k) => !extraFields.includes(k as (typeof extraFields)[number]),
    )
  )
    throw new Error('Unsupported passport change.');
  for (const key of ['honors', 'journal', 'moveNotes', 'visits'] as const) {
    const rows = patch[key];
    if (!rows) continue;
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error('Record identities must be unique.');
    for (const row of rows) {
      if (!row.id) throw new Error('Record identity is required.');
      if ('date' in row && !validDate(row.date))
        throw new Error('Use a valid date in YYYY-MM-DD format.');
      if ('title' in row && !row.title.trim())
        throw new Error('A title is required.');
      if ('move' in row && !row.move.trim())
        throw new Error('A move name is required.');
    }
  }
  if (patch.ribbonGoal != null && (!isManagedAward(patch.ribbonGoal.award) ||
    !earningGames(patch.ribbonGoal.award, record.pokemon).includes(patch.ribbonGoal.game))) {
    throw new Error('Choose an unowned ribbon or earnable mark and a compatible earning game.');
  }
  return {
    ...c,
    revision: ctx.id,
    records: c.records.map((r) =>
      r.id !== id
        ? r
        : {
            ...r,
            pokemon: { ...r.pokemon, ...patch },
            changes: { ...r.changes, ...patch },
            version: { revision: ctx.id, parentRevision: r.version.revision },
          },
    ),
    operations: [
      ...c.operations,
      {
        ...ctx,
        recordID: id,
        parentRevision: expected,
        revision: ctx.id,
        kind: 'edit-passport',
      },
    ],
  };
}
export function updateMetadata(
  c: Collection,
  patch: Pick<
    Partial<Collection>,
    'teams' | 'sourceNotes' | 'appearance' | 'selectedTeamID'
  >,
  ctx: ChangeContext,
): Collection {
  if (patch.teams) {
    if (new Set(patch.teams.map((t) => t.id)).size !== patch.teams.length)
      throw new Error('Repeated team identity.');
    for (const t of patch.teams)
      if (
        !t.name.trim() ||
        t.memberIDs.length > 6 ||
        new Set(t.memberIDs).size !== t.memberIDs.length ||
        t.memberIDs.some((id) => !c.records.some((r) => r.id === id))
      )
        throw new Error('Choose a team name and up to six different members.');
  }
  return {
    ...c,
    ...patch,
    metadataChanged: true,
    metadataChanges: [
      ...new Set([
        ...(c.metadataChanges ?? []),
        ...(Object.keys(patch) as NonNullable<Collection['metadataChanges']>),
      ]),
    ],
    revision: ctx.id,
    operations: [
      ...c.operations,
      {
        ...ctx,
        recordID: c.id,
        parentRevision: c.revision,
        revision: ctx.id,
        kind: 'preferences',
      },
    ],
  };
}
export function deletePokemon(
  c: Collection,
  id: string,
  ctx: ChangeContext,
): Collection {
  const r = c.records.find((r) => r.id === id);
  if (!r) throw new Error('Pokémon not found.');
  const remaining = c.records.filter((r) => r.id !== id);
  return {
    ...c,
    revision: ctx.id,
    records: remaining,
    layoutChanged: true,
    metadataChanged: true,
    metadataChanges: [
      ...new Set([...(c.metadataChanges ?? []), 'teams' as const]),
    ],
    deletedSourceIndexes: r.created
      ? c.deletedSourceIndexes
      : [...(c.deletedSourceIndexes ?? []), r.sourceIndex],
    selectedID: c.selectedID === id ? (remaining[0]?.id ?? '') : c.selectedID,
    boxes: c.boxes.map((b) => ({
      ...b,
      slots: b.slots.map((v) => (v === id ? null : v)),
    })),
    partyIDs: c.partyIDs.filter((v) => v !== id),
    teams: c.teams?.map((t) => ({
      ...t,
      memberIDs: t.memberIDs.filter((v) => v !== id),
    })),
    operations: [
      ...c.operations,
      {
        ...ctx,
        recordID: id,
        parentRevision: r.version.revision,
        revision: ctx.id,
        kind: 'delete-pokemon',
      },
    ],
  };
}
