import { validateCollection } from '../backup/codec';
import type { Collection } from '../domain/model';
import { StorageConflict, type CollectionStore } from './types';

export function createWebStore(name = 'ribbon-passport-v1'): CollectionStore {
  let connection: Promise<IDBDatabase> | undefined;
  const open = () => connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Ribbon Passport windows to update local storage.'));
  });
  return {
    async load() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction('documents').objectStore('documents').get('collection');
        request.onsuccess = () => {
          try { resolve(request.result ? validateCollection(JSON.parse(request.result)) : null); }
          catch (e) { reject(e); }
        };
        request.onerror = () => reject(request.error);
      });
    },
    async pendingConflict() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const documents = db.transaction('documents').objectStore('documents');
        const pending = documents.get('pending-conflict'), canonical = documents.get('collection');
        canonical.onsuccess = () => {
          try { resolve(pending.result && canonical.result ? new StorageConflict(validateCollection(JSON.parse(pending.result)), validateCollection(JSON.parse(canonical.result))) : null); }
          catch (e) { reject(e); }
        };
        canonical.onerror = () => reject(canonical.error);
      });
    },
    async commit(next, expectedRevision, resolveConflict = false) {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('documents', 'readwrite');
        const documents = transaction.objectStore('documents');
        let failure: unknown;
        const request = documents.get('collection');
        request.onsuccess = () => {
          try {
            const current: Collection | null = request.result ? JSON.parse(request.result) : null;
            if ((current?.revision ?? null) !== expectedRevision) {
              documents.put(JSON.stringify(next), `conflict:${next.revision}`);
              if (current) documents.put(request.result, `conflict:${current.revision}`);
              documents.put(JSON.stringify(next), 'pending-conflict');
              failure = current ? new StorageConflict(next, current) : new Error('Local collection changed. Reopen to restore it.');
            } else {
              if (current?.id !== next.id && current) documents.put(request.result, `archive:${current.id}:${current.revision}`);
              documents.put(JSON.stringify(next), 'collection');
              if (resolveConflict) documents.delete('pending-conflict');
            }
          } catch (e) { failure = e; transaction.abort(); }
        };
        transaction.oncomplete = () => failure ? reject(failure) : resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Local storage failed. Your change was not saved.'));
        transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Local storage aborted.'));
      });
    },
  };
}
export const collectionStore = createWebStore();
