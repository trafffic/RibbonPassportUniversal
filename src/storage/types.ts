import type { Collection } from '../domain/model';
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
  load(): Promise<Collection | null>;
  pendingConflict(): Promise<StorageConflict | null>;
  commit(
    next: Collection,
    expectedRevision: string | null,
    resolveConflict?: boolean,
  ): Promise<void>;
}
