import type { Collection } from '../domain/model';
import type { RecoveryEntry } from '../domain/recovery';
export function contentChanged(before: Collection, next: Collection) {
  const content = (c: Collection) =>
    JSON.stringify({
      id: c.id,
      source: c.source,
      records: c.records,
      boxes: c.boxes,
      partyIDs: c.partyIDs,
      teams: c.teams,
      sourceNotes: c.sourceNotes,
      appearance: c.appearance,
      selectedTeamID: c.selectedTeamID,
    });
  return content(before) !== content(next);
}
export class StorageConflict extends Error {
  constructor(
    public readonly ours: Collection,
    public readonly theirs: Collection,
  ) {
    super(
      'Another window saved a different version. Both versions are preserved; choose which collection to continue with.',
    );
  }
}
export interface CollectionStore {
  history(): Promise<Collection[]>;
  recovery(): Promise<RecoveryEntry[]>;
  load(): Promise<Collection | null>;
  pendingConflict(): Promise<StorageConflict | null>;
  commit(
    next: Collection,
    expectedRevision: string | null,
    resolveConflict?: boolean,
    recovery?: RecoveryEntry[],
  ): Promise<void>;
}
export function parseRecovery(
  json: string | null | undefined,
): RecoveryEntry[] {
  if (!json) return [];
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value)) throw new Error('Recovery history is unreadable.');
  return value.filter(
    (e): e is RecoveryEntry =>
      !!e &&
      typeof e.id === 'string' &&
      typeof e.objectID === 'string' &&
      (e.kind === 'pokemon' || e.kind === 'team') &&
      !!e.snapshot,
  );
}
