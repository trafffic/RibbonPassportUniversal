import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as Crypto from 'expo-crypto';
import type { Box, Collection, Pokemon } from '../domain/model';
import {
  addPokemon,
  editPokemon,
  createBox,
  editBox,
  movePokemon,
  restoreCollection,
  emptyCollection,
  ensureDefaultBoxes,
  type PokemonDetails,
} from '../domain/organisation';
import { changeRibbon, undoChange, type UndoToken } from '../domain/collection';
import { applyDemo } from '../domain/sample';
import {
  captureRecovery,
  restoreEntry,
  type RecoveryAction,
  type RecoveryEntry,
} from '../domain/recovery';
import { collectionStore } from '../storage';
import { StorageConflict } from '../storage/types';
import type { ChangeContext } from '../domain/collection';

const context = () => ({
  id: Crypto.randomUUID(),
  at: new Date().toISOString(),
});
interface State {
  collection: Collection | null;
  busy: boolean;
  error: string;
  notice: string;
  conflict: StorageConflict | null;
  canUndo: boolean;
  select(id: string): Promise<boolean>;
  selectBox(id: string): Promise<boolean>;
  change(id: string, award: string, game?: string): Promise<boolean>;
  undo(): Promise<boolean>;
  replace(value: Collection): Promise<boolean>;
  restoreVersion(entry: RecoveryEntry): Promise<boolean>;
  reload(): Promise<void>;
  add(pokemon: Pokemon, boxID: string): Promise<boolean>;
  edit(
    id: string,
    details: PokemonDetails,
    expectedRevision: string,
  ): Promise<boolean>;
  addBox(name: string): Promise<boolean>;
  startEmpty(): Promise<boolean>;
  tryDemo(): Promise<boolean>;
  updateBox(
    id: string,
    details: Pick<Box, 'name' | 'wallpaper'>,
  ): Promise<boolean>;
  move(
    id: string,
    target: { boxID: string; slot: number } | { partySlot: number },
  ): Promise<boolean>;
  mutate(
    build: (collection: Collection, context: ChangeContext) => Collection,
    message?: string,
  ): Promise<boolean>;
  resolveConflict(side: 'ours' | 'theirs'): Promise<void>;
  dismissError(): void;
}
const StateContext = createContext<State | null>(null);
export function CollectionProvider({ children }: React.PropsWithChildren) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const current = useRef<Collection | null>(null);
  const [busy, setBusy] = useState(true),
    locked = useRef(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState<StorageConflict | null>(null);
  const [undo, setUndo] = useState<UndoToken | Collection | null>(null);
  const accept = (value: Collection) => {
    current.current = value;
    setCollection(value);
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let value = await collectionStore.load();
        if (!value) {
          value = emptyCollection(
            Crypto.randomUUID(),
            Crypto.randomUUID(),
            Crypto.randomUUID(),
            new Date().toISOString(),
          );
          await collectionStore.commit(value, null);
        }
        if (active) {
          accept(value);
          const pending = await collectionStore.pendingConflict();
          if (active && pending) {
            setConflict(pending);
            setError(pending.message);
          } else if (active) {
            const expanded = ensureDefaultBoxes(value, context());
            if (expanded !== value) {
              await collectionStore.commit(expanded, value.revision);
              if (active) accept(expanded);
            }
          }
        }
      } catch (e) {
        if (active && e instanceof StorageConflict) setConflict(e);
        if (active)
          setError(
            e instanceof Error ? e.message : 'Could not open local storage.',
          );
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const commit = async (
    build: (before: Collection) => Collection,
    message: string,
    after?: (before: Collection) => void,
    action: RecoveryAction = 'edited',
  ) => {
    if (locked.current || !current.current || conflict) return false;
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const before = current.current;
    try {
      const next = build(before);
      await collectionStore.commit(
        next,
        before.revision,
        false,
        captureRecovery(before, next, action, new Date().toISOString(), () =>
          Crypto.randomUUID(),
        ),
      );
      accept(next);
      setNotice(message);
      after?.(before);
      return true;
    } catch (e) {
      if (e instanceof StorageConflict) setConflict(e);
      setError(
        e instanceof Error
          ? e.message
          : 'Save failed. The change was not applied.',
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const value: State = {
    collection,
    busy,
    error,
    notice,
    conflict,
    canUndo: !!undo,
    reload: async () => {
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      try {
        const saved = await collectionStore.load();
        if (saved) {
          accept(saved);
          setUndo(null);
        }
        const pending = await collectionStore.pendingConflict();
        setConflict(pending);
        setError(pending?.message ?? '');
        setNotice('Saved collection reloaded.');
      } catch (e) {
        setError(String(e));
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    mutate: (build, message = 'Saved.') =>
      commit(
        (c) => build(c, context()),
        message,
        (before) => setUndo(before),
      ),
    dismissError: () => setError(''),
    select: (id) =>
      commit(
        (c) => ({
          ...c,
          selectedID: id,
          selectedBoxID:
            c.boxes.find((b) => b.slots.includes(id))?.id ?? c.selectedBoxID,
          revision: Crypto.randomUUID(),
        }),
        '',
      ),
    selectBox: (id) =>
      commit(
        (c) => ({ ...c, selectedBoxID: id, revision: Crypto.randomUUID() }),
        '',
      ),
    change: async (id, award, game) => {
      let token: UndoToken;
      return commit(
        (c) => {
          const result = changeRibbon(c, id, award, game, context());
          token = result.undo;
          return result.collection;
        },
        game
          ? 'Ribbon recorded.'
          : 'Ribbon removed.',
        () => setUndo(token),
      );
    },
    undo: async () => {
      if (!undo) return false;
      return commit(
        (c) =>
          'before' in undo
            ? undoChange(c, undo, context())
            : restoreCollection(c, undo, context()),
        'Change undone.',
        () => setUndo(null),
        'restored',
      );
    },
    add: (p, boxID) =>
      commit(
        (c) => addPokemon(c, p, boxID, context()),
        'Pokémon added.',
        (before) => setUndo(before),
      ),
    edit: (id, details, expected) =>
      commit(
        (c) => editPokemon(c, id, details, expected, context()),
        'Pokémon updated. Ribbon history kept.',
        (before) => setUndo(before),
      ),
    addBox: (name) =>
      commit(
        (c) => createBox(c, Crypto.randomUUID(), name, context()),
        'Box created.',
        (before) => setUndo(before),
      ),
    startEmpty: () =>
      commit(
        () =>
          emptyCollection(
            Crypto.randomUUID(),
            Crypto.randomUUID(),
            Crypto.randomUUID(),
            new Date().toISOString(),
          ),
        'Empty collection created. Previous collection archived locally.',
        (before) => setUndo(before),
        'imported',
      ),
    tryDemo: () =>
      commit(
        (c) => applyDemo(c, context(), () => Crypto.randomUUID()),
        'Demo Pokémon ready. You can undo this change.',
        (before) => setUndo(before),
      ),
    updateBox: (id, details) =>
      commit(
        (c) => editBox(c, id, details, context()),
        'Box updated.',
        (before) => setUndo(before),
      ),
    move: (id, target) =>
      commit(
        (c) => movePokemon(c, id, target, context()),
        'Pokémon moved.',
        (before) => setUndo(before),
      ),
    replace: (next) =>
      commit(
        () => ({ ...next, revision: Crypto.randomUUID() }),
        'Backup imported. Original fields preserved.',
        (before) => setUndo(before),
        'imported',
      ),
    restoreVersion: (entry) =>
      commit(
        (c) => restoreEntry(c, entry, context(), () => Crypto.randomUUID()),
        entry.kind === 'pokemon'
          ? 'Saved version restored. The replaced details stay in Recovery history.'
          : 'Team restored. The replaced details stay in Recovery history.',
        (before) => setUndo(before),
        'restored',
      ),
    resolveConflict: async (side) => {
      if (!conflict || locked.current) return;
      locked.current = true;
      setBusy(true);
      try {
        const selected = conflict[side];
        const next = { ...selected, revision: Crypto.randomUUID() };
        await collectionStore.commit(next, conflict.theirs.revision, true);
        accept(next);
        setConflict(null);
        setUndo(null);
        setError('');
        setNotice(
          'Version selected. The conflicting copy remains archived locally.',
        );
      } catch (e) {
        if (e instanceof StorageConflict) setConflict(e);
        setError(
          e instanceof Error ? e.message : 'Resolution could not be saved.',
        );
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
  };
  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}
export function useCollection() {
  const value = useContext(StateContext);
  if (!value) throw new Error('CollectionProvider is missing.');
  return value;
}
