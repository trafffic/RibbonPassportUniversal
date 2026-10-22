import { openDatabaseAsync } from 'expo-sqlite';
import { validateCollection } from '../backup/codec';
import type { Collection } from '../domain/model';
import { mergeRecovery } from '../domain/recovery';
import { contentChanged, parseRecovery, parseRecoveryOrEmpty } from './types';
import { StorageConflict, type CollectionStore } from './types';

const database = async () => {
  const db = await openDatabaseAsync('ribbon-passport-v1.db');
  await db.execAsync(
    'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL);',
  );
  return db;
};
let connection: ReturnType<typeof database> | undefined;
const open = () => (connection ??= database());
export const collectionStore: CollectionStore = {
  async history() {
    const db = await open();
    const rows = await db.getAllAsync<{ json: string }>(
      "SELECT json FROM documents WHERE id LIKE 'archive:%' OR id LIKE 'conflict:%' ORDER BY rowid DESC",
    );
    return rows.map((row) => validateCollection(JSON.parse(row.json)));
  },
  async recovery() {
    const db = await open();
    const row = await db.getFirstAsync<{ json: string }>(
      'SELECT json FROM documents WHERE id = ?',
      'recovery',
    );
    return parseRecovery(row?.json);
  },
  async load() {
    const db = await open();
    const row = await db.getFirstAsync<{ json: string }>(
      'SELECT json FROM documents WHERE id = ?',
      'collection',
    );
    return row ? validateCollection(JSON.parse(row.json)) : null;
  },
  async pendingConflict() {
    const db = await open();
    const pending = await db.getFirstAsync<{ json: string }>(
      'SELECT json FROM documents WHERE id = ?',
      'pending-conflict',
    );
    const current = await collectionStore.load();
    return pending && current
      ? new StorageConflict(
          validateCollection(JSON.parse(pending.json)),
          current,
        )
      : null;
  },
  async commit(next, expectedRevision, resolveConflict = false, recovery = []) {
    const db = await open();
    let conflict: StorageConflict | undefined;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<{ json: string }>(
        'SELECT json FROM documents WHERE id = ?',
        'collection',
      );
      const current: Collection | null = row ? JSON.parse(row.json) : null;
      if ((current?.revision ?? null) !== expectedRevision) {
        await transaction.runAsync(
          'INSERT OR REPLACE INTO documents (id, json) VALUES (?, ?)',
          `conflict:${next.revision}`,
          JSON.stringify(next),
        );
        if (current)
          await transaction.runAsync(
            'INSERT OR REPLACE INTO documents (id, json) VALUES (?, ?)',
            `conflict:${current.revision}`,
            row!.json,
          );
        await transaction.runAsync(
          'INSERT OR REPLACE INTO documents (id, json) VALUES (?, ?)',
          'pending-conflict',
          JSON.stringify(next),
        );
        if (current) conflict = new StorageConflict(next, current);
        else throw new Error('Local collection changed. Reopen to restore it.');
      } else {
        if (current && contentChanged(current, next))
          await transaction.runAsync(
            'INSERT OR REPLACE INTO documents (id, json) VALUES (?, ?)',
            `archive:${current.id}:${current.revision}`,
            row!.json,
          );
        if (recovery.length) {
          const saved = await transaction.getFirstAsync<{ json: string }>(
            'SELECT json FROM documents WHERE id = ?',
            'recovery',
          );
          await transaction.runAsync(
            'INSERT OR REPLACE INTO documents (id, json) VALUES (?, ?)',
            'recovery',
            JSON.stringify(mergeRecovery(parseRecoveryOrEmpty(saved?.json), recovery)),
          );
        }
        await transaction.runAsync(
          'INSERT OR REPLACE INTO documents (id, json) VALUES (?, ?)',
          'collection',
          JSON.stringify(next),
        );
        if (resolveConflict)
          await transaction.runAsync(
            'DELETE FROM documents WHERE id = ?',
            'pending-conflict',
          );
      }
    });
    if (conflict) throw conflict;
  },
};
