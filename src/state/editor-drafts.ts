import type { Pokemon } from '../domain/model';
import { editableFields } from '../domain/organisation';
import { loadPreference, writePreference } from './preference';

export interface EditorDraft { version: 1; baseRevision: string | null; pokemon: Pokemon }
// Serialize writes and clearing: a slow native write cannot resurrect a discarded draft.
const pending = new Map<string, Promise<void>>();
export function storeEditorDraft(key: string, value: EditorDraft | null): Promise<void> {
  const lean = value ? { ...value, pokemon: Object.fromEntries(
    [...editableFields, 'id', 'ribbons', 'source', 'showdownSet'].map(field => [field, value.pokemon[field as keyof Pokemon]]),
  ) } : null;
  const next = (pending.get(key) ?? Promise.resolve()).catch(() => {}).then(() => writePreference(key, lean ? JSON.stringify(lean) : ''));
  pending.set(key, next);
  void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => {});
  return next;
}
export async function loadEditorDraft(key: string): Promise<EditorDraft | null> {
  await pending.get(key)?.catch(() => {});
  const raw = await loadPreference(key);
  if (!raw) return null;
  const value = JSON.parse(raw) as EditorDraft;
  const p = value?.pokemon;
  if (value?.version !== 1 || value.baseRevision !== null && typeof value.baseRevision !== 'string' ||
    !p || typeof p.id !== 'string' || !p.id || typeof p.species !== 'string' ||
    typeof p.nickname !== 'string' || typeof p.shiny !== 'boolean' || typeof p.currentgame !== 'string' ||
    typeof p.origingame !== 'string' || typeof p.gender !== 'string' || typeof p.shadow !== 'boolean' ||
    typeof p.gmax !== 'boolean' || typeof p.title !== 'string' || typeof p.titleText !== 'string' ||
    !Number.isInteger(p.currentlevel) || p.currentlevel < 1 || p.currentlevel > 100 || !Array.isArray(p.ribbons) || p.ribbons.some(id => typeof id !== 'string') ||
    p.metLevel !== undefined && (!Number.isInteger(p.metLevel) || p.metLevel < 1 || p.metLevel > 100) ||
    p.sizeScale !== undefined && (!Number.isInteger(p.sizeScale) || p.sizeScale < 0 || p.sizeScale > 255)) {
    throw new Error('The saved draft could not be read. Discard it to start again.');
  }
  return value;
}
