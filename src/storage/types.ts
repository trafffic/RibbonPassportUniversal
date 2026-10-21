import type { Collection } from '../domain/model';
export class StorageConflict extends Error {
  constructor(public readonly ours: Collection, public readonly theirs: Collection) {
    super('Another window saved a different version. Both versions are preserved; choose which collection to continue with.');
  }
}
export interface CollectionStore {
  load(): Promise<Collection | null>;
  pendingConflict(): Promise<StorageConflict | null>;
  commit(next: Collection, expectedRevision: string | null, resolveConflict?: boolean): Promise<void>;
}
