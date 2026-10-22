import type { Box, Collection, PassportRecord, Pokemon, Team } from './model';
import type { ChangeContext } from './collection';
import { awardName, displayName, gameName } from './catalog';

export type RecoveryAction = 'edited' | 'deleted' | 'imported' | 'restored';
export type RecoverySection = 'ribbon' | 'competitive';
export interface RecoveryLocation {
  boxID?: string;
  boxName?: string;
  wallpaper?: Box['wallpaper'];
  slot?: number;
  partyIndex?: number;
}
interface RecoveryBase {
  id: string;
  recordedAt: string;
  action: RecoveryAction;
  objectID: string;
  section: RecoverySection;
  collectionID: string;
  name: string;
}
export type RecoveryEntry = RecoveryBase &
  (
    | {
        kind: 'pokemon';
        snapshot: PassportRecord;
        location: RecoveryLocation;
        memberships: { team: Team; section: RecoverySection }[];
      }
    | { kind: 'team'; snapshot: Team; members: Pokemon[] }
  );
export const versionsPerItem = 20;
export const totalLimit = 500;
export const actionName: Record<RecoveryAction, string> = {
  edited: 'Before edit',
  deleted: 'Before deletion',
  imported: 'Before import',
  restored: 'Before restore',
};
export const sectionName = (s: RecoverySection) =>
  s === 'ribbon' ? 'Ribbon' : 'Competitive';
export const recoveryKey = (e: Pick<RecoveryEntry, 'kind' | 'objectID'>) =>
  `${e.kind}:${e.objectID}`;

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const recordSection = (p: Pokemon): RecoverySection =>
  p.showdownSet ? 'competitive' : 'ribbon';
function teamSection(c: Collection, t: Team): RecoverySection {
  const members = t.memberIDs.map(
    (id) => c.records.find((r) => r.id === id)?.pokemon,
  );
  return members.some((p) => p?.showdownSet) ? 'competitive' : 'ribbon';
}
const inSection = (c: Collection, id: string, s: RecoverySection) => {
  const r = c.records.find((r) => r.id === id);
  return !!r && recordSection(r.pokemon) === s;
};
const flag = (name: 'teams', c: Collection): Collection => ({
  ...c,
  metadataChanged: true,
  metadataChanges: [...new Set([...(c.metadataChanges ?? []), name])],
});

export function captureRecovery(
  before: Collection,
  next: Collection,
  action: RecoveryAction,
  at: string,
  newID: () => string,
): RecoveryEntry[] {
  const entries: RecoveryEntry[] = [];
  const now = new Map(next.records.map((r) => [r.id, r]));
  for (const r of before.records) {
    const after = now.get(r.id);
    if (
      after &&
      same(after.pokemon, r.pokemon) &&
      same(after.changes, r.changes)
    )
      continue;
    const section = recordSection(r.pokemon),
      location: RecoveryLocation = {};
    const party = before.partyIDs.indexOf(r.id);
    if (party >= 0) location.partyIndex = party;
    for (const box of before.boxes) {
      const slot = box.slots.indexOf(r.id);
      if (slot >= 0) {
        Object.assign(location, {
          boxID: box.id,
          boxName: box.name,
          wallpaper: box.wallpaper,
          slot,
        });
        break;
      }
    }
    entries.push({
      id: newID(),
      recordedAt: at,
      action: after ? action : 'deleted',
      kind: 'pokemon',
      objectID: r.id,
      section,
      collectionID: before.id,
      name: displayName(r.pokemon),
      snapshot: r,
      location,
      memberships: (before.teams ?? [])
        .filter((t) => t.memberIDs.includes(r.id))
        .map((team) => ({ team, section: teamSection(before, team) })),
    });
  }
  const teams = new Map((next.teams ?? []).map((t) => [t.id, t]));
  for (const t of before.teams ?? []) {
    const after = teams.get(t.id);
    if (after && same(after, t)) continue;
    entries.push({
      id: newID(),
      recordedAt: at,
      action: after ? action : 'deleted',
      kind: 'team',
      objectID: t.id,
      section: teamSection(before, t),
      collectionID: before.id,
      name: t.name,
      snapshot: t,
      members: t.memberIDs.flatMap(
        (id) => before.records.find((r) => r.id === id)?.pokemon ?? [],
      ),
    });
  }
  return entries;
}

// Newest first. Oldest versions are dropped per item, then overall.
export function mergeRecovery(
  existing: RecoveryEntry[],
  added: RecoveryEntry[],
): RecoveryEntry[] {
  const counts = new Map<string, number>();
  return [...added, ...existing]
    .filter((e) => {
      const n = (counts.get(recoveryKey(e)) ?? 0) + 1;
      counts.set(recoveryKey(e), n);
      return n <= versionsPerItem;
    })
    .slice(0, totalLimit);
}

export const containsItem = (c: Collection, e: RecoveryEntry) =>
  e.kind === 'pokemon'
    ? c.records.some((r) => r.id === e.objectID)
    : !!c.teams?.some((t) => t.id === e.objectID);
export function matchesVersion(c: Collection, e: RecoveryEntry) {
  if (e.kind === 'pokemon') {
    const r = c.records.find((r) => r.id === e.objectID);
    return (
      !!r &&
      same(r.pokemon, e.snapshot.pokemon) &&
      same(r.changes, e.snapshot.changes)
    );
  }
  const t = c.teams?.find((t) => t.id === e.objectID);
  return !!t && same(t, e.snapshot);
}
export function currentName(c: Collection, e: RecoveryEntry) {
  if (e.kind === 'pokemon') {
    const r = c.records.find((r) => r.id === e.objectID);
    return r ? displayName(r.pokemon) : e.name;
  }
  return c.teams?.find((t) => t.id === e.objectID)?.name ?? e.name;
}

export function recoveryChanges(c: Collection, e: RecoveryEntry): string[] {
  if (!containsItem(c, e))
    return [
      e.kind === 'pokemon'
        ? 'Return this Pokémon to your collection.'
        : 'Return this team to your collection.',
    ];
  const out: string[] = [];
  if (e.kind === 'pokemon') {
    const now = c.records.find((r) => r.id === e.objectID)!.pokemon,
      old = e.snapshot.pokemon;
    const field = (name: string, a: string, b: string) => {
      if (a !== b) out.push(`${name}: ${a || 'Not set'} → ${b || 'Not set'}`);
    };
    field('Species', now.species, old.species);
    field('Nickname', now.nickname, old.nickname);
    field('Level', String(now.currentlevel), String(old.currentlevel));
    field('Current game', gameName(now.currentgame), gameName(old.currentgame));
    field('Origin game', gameName(now.origingame), gameName(old.origingame));
    field('Shiny', now.shiny ? 'Yes' : 'No', old.shiny ? 'Yes' : 'No');
    const added = old.ribbons.filter((id) => !now.ribbons.includes(id)),
      removed = now.ribbons.filter((id) => !old.ribbons.includes(id));
    if (added.length)
      out.push(`Restore awards: ${added.map(awardName).join(', ')}`);
    if (removed.length)
      out.push(`Remove awards: ${removed.map(awardName).join(', ')}`);
    if (
      !same(now.earnedGames, old.earnedGames) ||
      !same(now.earnedGenerations, old.earnedGenerations)
    )
      out.push('Restore the saved earning locations.');
    if (!same(now.visits, old.visits)) out.push('Restore the saved journey.');
    if (!same(now.honors, old.honors))
      out.push('Restore the saved honorary achievements and screenshots.');
    if (!same(now.journal, old.journal))
      out.push('Restore the saved journey notes and photos.');
    if (!same(now.moveNotes, old.moveNotes))
      out.push('Restore the saved Move Dex notes.');
    if (!same(now.savedBuilds, old.savedBuilds))
      out.push('Restore the saved build notebook.');
    if (!same(now.showdownSet, old.showdownSet))
      out.push('Restore the saved competitive build.');
    if (now.title !== old.title || now.titleText !== old.titleText)
      out.push('Restore the saved equipped title.');
    if (
      (
        [
          'gender',
          'shadow',
          'gmax',
          'metLevel',
          'sizeScale',
          'ball',
          'source',
        ] as const
      ).some((k) => !same(now[k], old[k]))
    )
      out.push('Restore the other saved Pokémon details shown above.');
  } else {
    const now = c.teams!.find((t) => t.id === e.objectID)!;
    if (now.name !== e.snapshot.name)
      out.push(`Name: ${now.name} → ${e.snapshot.name}`);
    if (!same(now.memberIDs, e.snapshot.memberIDs))
      out.push('Restore the available saved members in their saved order.');
  }
  return out;
}

function place(
  c: Collection,
  id: string,
  section: RecoverySection,
  location: RecoveryLocation,
  newID: () => string,
): Collection {
  const kind = section === 'competitive' ? 'showdown' : undefined;
  const sectionBoxes = (boxes: Box[]) =>
    boxes.filter(
      (b) => (b.kind === 'showdown') === (section === 'competitive'),
    );
  let boxes = c.boxes.map((b) => ({
    ...b,
    slots: b.slots.map((s) => (s === id ? null : s)),
  }));
  let partyIDs = c.partyIDs.filter((p) => p !== id);
  const partyCount = partyIDs.filter((p) => inSection(c, p, section)).length;
  if (location.partyIndex !== undefined && partyCount < 6)
    partyIDs.splice(
      Math.min(Math.max(0, location.partyIndex), partyIDs.length),
      0,
      id,
    );
  else {
    const { boxID, slot } = location;
    if (boxID && slot !== undefined && slot >= 0 && slot < 30) {
      if (!boxes.some((b) => b.id === boxID))
        boxes = [
          ...boxes,
          {
            id: boxID,
            name: location.boxName ?? 'Recovered',
            slots: Array(30).fill(null),
            ...(location.wallpaper ? { wallpaper: location.wallpaper } : {}),
            ...(kind ? { kind } : {}),
          },
        ];
      const box = boxes.find((b) => b.id === boxID)!;
      if (box.slots[slot] === null) box.slots[slot] = id;
      else location = {};
    } else location = {};
    if (location.slot === undefined) {
      const free = sectionBoxes(boxes).find((b) => b.slots.includes(null));
      if (free) free.slots[free.slots.indexOf(null)] = id;
      else
        boxes = [
          ...boxes,
          {
            id: newID(),
            name: 'Recovered',
            slots: [id, ...Array(29).fill(null)],
            ...(kind ? { kind } : {}),
          },
        ];
    }
  }
  return { ...c, boxes, partyIDs, layoutChanged: true };
}

export function restoreEntry(
  c: Collection,
  e: RecoveryEntry,
  ctx: ChangeContext,
  newID: () => string,
): Collection {
  if (c.operations.some((o) => o.id === ctx.id))
    throw new Error('Operation identity must be unique.');
  const op = (
    kind: 'edit-pokemon' | 'add-pokemon' | 'edit-team',
    parent: string,
  ) => ({
    id: ctx.id,
    recordID: e.objectID,
    parentRevision: parent,
    revision: ctx.id,
    at: ctx.at,
    kind,
  });
  if (e.kind === 'pokemon') {
    const saved = e.snapshot,
      existing = c.records.find((r) => r.id === e.objectID);
    if (saved.id !== e.objectID)
      throw new Error('This saved version could not be restored.');
    const section = recordSection(saved.pokemon);
    let next: Collection = { ...c };
    const moved = !existing || recordSection(existing.pokemon) !== section;
    let record: PassportRecord = {
      ...saved,
      version: {
        revision: ctx.id,
        parentRevision: existing?.version.revision ?? null,
      },
    };
    if (!existing) {
      const deleted = c.deletedSourceIndexes ?? [];
      if (
        !saved.created &&
        e.collectionID === c.id &&
        deleted.includes(saved.sourceIndex)
      )
        next.deletedSourceIndexes = deleted.filter(
          (i) => i !== saved.sourceIndex,
        );
      else if (!saved.created)
        record = { ...record, created: true, sourceIndex: -1, changes: {} };
      next.records = [...c.records, record];
    } else {
      const old = recordSection(existing.pokemon);
      next.records = c.records.map((r) => (r.id === e.objectID ? record : r));
      if (old !== section && c.teams) {
        next = flag('teams', {
          ...next,
          teams: c.teams.map((t) =>
            teamSection(c, t) === old
              ? { ...t, memberIDs: t.memberIDs.filter((m) => m !== e.objectID) }
              : t,
          ),
        });
      }
    }
    if (moved) next = place(next, e.objectID, section, e.location, newID);
    if (!existing && e.memberships.length) {
      const teams = [...(next.teams ?? [])];
      for (const m of e.memberships) {
        if (m.section !== section) continue;
        const i = teams.findIndex((t) => t.id === m.team.id);
        if (i >= 0) {
          const t = teams[i]!;
          if (teamSection(next, t) !== section && t.memberIDs.length) continue;
          if (t.memberIDs.includes(e.objectID) || t.memberIDs.length >= 6)
            continue;
          const at = m.team.memberIDs.indexOf(e.objectID);
          const memberIDs = [...t.memberIDs];
          memberIDs.splice(
            at < 0 ? memberIDs.length : Math.min(at, memberIDs.length),
            0,
            e.objectID,
          );
          teams[i] = { ...t, memberIDs };
        } else {
          const memberIDs = [
            ...new Set(
              m.team.memberIDs.filter((id) => inSection(next, id, section)),
            ),
          ].slice(0, 6);
          if (memberIDs.length) teams.push({ ...m.team, memberIDs });
        }
      }
      next = flag('teams', { ...next, teams });
    }
    return {
      ...next,
      revision: ctx.id,
      selectedID: e.objectID,
      operations: [
        ...c.operations,
        op(
          existing ? 'edit-pokemon' : 'add-pokemon',
          existing?.version.revision ?? c.revision,
        ),
      ],
    };
  }
  const seen = new Set<string>();
  const memberIDs = e.snapshot.memberIDs
    .filter(
      (id) => inSection(c, id, e.section) && !seen.has(id) && seen.add(id),
    )
    .slice(0, 6);
  if (!memberIDs.length)
    throw new Error("Restore at least one of this team's Pokémon first.");
  const saved: Team = { ...e.snapshot, memberIDs },
    teams = c.teams ?? [];
  return flag('teams', {
    ...c,
    revision: ctx.id,
    teams: teams.some((t) => t.id === saved.id)
      ? teams.map((t) => (t.id === saved.id ? saved : t))
      : [...teams, saved],
    selectedTeamID: saved.id,
    operations: [...c.operations, op('edit-team', c.revision)],
  });
}
