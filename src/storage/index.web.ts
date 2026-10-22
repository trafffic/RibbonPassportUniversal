import { validateCollection } from '../backup/codec';
import type { Collection } from '../domain/model';
import { mergeRecovery } from '../domain/recovery';
import { contentChanged, parseRecovery, parseRecoveryOrEmpty } from './types';
import { StorageConflict, type CollectionStore } from './types';

export function createWebStore(name = 'ribbon-passport-v1'): CollectionStore {
  let connection: Promise<IDBDatabase> | undefined;
  const open = () =>
    (connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('documents');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(
          new Error(
            'Close other Ribbon Passport windows to update local storage.',
          ),
        );
    }));
  return {
    async history() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db
          .transaction('documents')
          .objectStore('documents')
          .openCursor();
        const result: { collection: Collection; at: number }[] = [];
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            if (
              String(cursor.key).startsWith('archive:') ||
              String(cursor.key).startsWith('conflict:')
            ) {
              const collection = validateCollection(JSON.parse(cursor.value));
              const stamp = String(cursor.key).match(/^archive:(\d{13}):/);
              result.push({
                collection,
                at: stamp
                  ? Number(stamp[1])
                  : Date.parse(collection.operations.at(-1)?.at ?? '') || 0,
              });
            }
            cursor.continue();
          } else
            resolve(
              result.sort((a, b) => b.at - a.at).map((row) => row.collection),
            );
        };
        request.onerror = () => reject(request.error);
      });
    },
    async recovery() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db
          .transaction('documents')
          .objectStore('documents')
          .get('recovery');
        request.onsuccess = () => {
          try {
            resolve(parseRecovery(request.result));
          } catch (e) {
            reject(e);
          }
        };
        request.onerror = () => reject(request.error);
      });
    },
    async load() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db
          .transaction('documents')
          .objectStore('documents')
          .get('collection');
        request.onsuccess = () => {
          try {
            resolve(
              request.result
                ? validateCollection(JSON.parse(request.result))
                : null,
            );
          } catch (e) {
            reject(e);
          }
        };
        request.onerror = () => reject(request.error);
      });
    },
    async pendingConflict() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const documents = db.transaction('documents').objectStore('documents');
        const pending = documents.get('pending-conflict'),
          canonical = documents.get('collection');
        canonical.onsuccess = () => {
          try {
            resolve(
              pending.result && canonical.result
                ? new StorageConflict(
                    validateCollection(JSON.parse(pending.result)),
                    validateCollection(JSON.parse(canonical.result)),
                  )
                : null,
            );
          } catch (e) {
            reject(e);
          }
        };
        canonical.onerror = () => reject(canonical.error);
      });
    },
    async commit(
      next,
      expectedRevision,
      resolveConflict = false,
      recovery = [],
    ) {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('documents', 'readwrite');
        const documents = transaction.objectStore('documents');
        let failure: unknown;
        const sequence = documents.get('archive-sequence');
        const saved = documents.get('recovery');
        const request = documents.get('collection');
        request.onsuccess = () => {
          try {
            const current: Collection | null = request.result
              ? JSON.parse(request.result)
              : null;
            if ((current?.revision ?? null) !== expectedRevision) {
              documents.put(JSON.stringify(next), `conflict:${next.revision}`);
              if (current)
                documents.put(request.result, `conflict:${current.revision}`);
              documents.put(JSON.stringify(next), 'pending-conflict');
              failure = current
                ? new StorageConflict(next, current)
                : new Error('Local collection changed. Reopen to restore it.');
            } else {
              if (current && contentChanged(current, next)) {
                const archiveAt=Math.max(Date.now(),Number(sequence.result??0)+1);
                documents.put(archiveAt,'archive-sequence');
                documents.put(
                  request.result,
                  `archive:${archiveAt}:${current.id}:${current.revision}`,
                );
              }
              if (recovery.length)
                documents.put(
                  JSON.stringify(
                    mergeRecovery(parseRecoveryOrEmpty(saved.result), recovery),
                  ),
                  'recovery',
                );
              documents.put(JSON.stringify(next), 'collection');
              if (resolveConflict) documents.delete('pending-conflict');
            }
          } catch (e) {
            failure = e;
            transaction.abort();
          }
        };
        transaction.oncomplete = () => (failure ? reject(failure) : resolve());
        transaction.onerror = () =>
          reject(
            transaction.error ??
              new Error('Local storage failed. Your change was not saved.'),
          );
        transaction.onabort = () =>
          reject(
            failure ?? transaction.error ?? new Error('Local storage aborted.'),
          );
      });
    },
  };
}
export const collectionStore = createWebStore();
