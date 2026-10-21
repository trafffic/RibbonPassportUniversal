import { parse, stringify, isLosslessNumber } from 'lossless-json';
import type { Box, Collection, PassportRecord, Pokemon, Visit } from '../domain/model';
import { editableFields } from '../domain/organisation';

type Obj = Record<string, unknown>;
export const object = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v) && !isLosslessNumber(v);
const textValue = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
function numeric(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(isLosslessNumber(v) ? v.value : v);
  return Number.isFinite(n) ? n : undefined;
}
const stringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
export function parseJSON(text: string): unknown {
  try { return parse(text.replace(/^\uFEFF/, ''), null, { onDuplicateKey: ({ key }) => { throw new Error(`Duplicate JSON key: ${key}`); } }); }
  catch (e) { throw new Error(`Invalid backup JSON: ${e instanceof Error ? e.message : 'could not parse'}`); }
}
export const serializeJSON = (value: unknown) => stringify(value, null, 2)!;
function normalize(entry: Obj, id: string): Pokemon {
  if (typeof entry.species !== 'string' || !stringArray(entry.ribbons)) throw new Error('Each Pokémon needs a species and a string array of ribbons. No records were imported.');
  const parsedLevel = numeric(entry.currentlevel);
  const level = parsedLevel ?? 100;
  if ((entry.currentlevel !== undefined && entry.currentlevel !== null && parsedLevel === undefined) || !Number.isInteger(level) || level < 1 || level > 100) throw new Error('A Pokémon has an invalid current level. The backup was left unchanged.');
  const mapStrings = (v: unknown) => object(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string')) : undefined;
  const mapNumbers = (v: unknown) => object(v) ? Object.fromEntries(Object.entries(v).flatMap(([k, val]) => numeric(val) === undefined ? [] : [[k, numeric(val)!]])) : undefined;
  const visits: Visit[] | undefined = Array.isArray(entry.visits) ? entry.visits.flatMap((v, i) => object(v) && typeof v.game === 'string' ? [{ id: textValue(v.id, `visit-${id}-${i}`), game: v.game }] : []) : undefined;
  return {
    id, species: entry.species, nickname: textValue(entry.nickname), gender: textValue(entry.gender),
    shiny: ['star', 'square', 'shiny', 'true', '1'].includes(String(entry.shiny).toLowerCase()),
    currentgame: textValue(entry.currentgame), origingame: textValue(entry.origingame),
    shadow: entry.shadow === true, gmax: entry.gmax === true, currentlevel: level,
    title: textValue(entry.title, 'None'), titleText: textValue(entry.titleText), ribbons: [...entry.ribbons],
    visits, earnedGames: mapStrings(entry.earnedGames), earnedGenerations: mapNumbers(entry.earnedGenerations),
    metLevel: numeric(entry.metLevel ?? entry.metlevel), sizeScale: numeric(entry.sizeScale ?? entry.scale),
    ball: typeof entry.ball === 'string' ? entry.ball : undefined,
  };
}
function entriesFor(kind: Collection['source']['kind'], root: Obj): unknown[] {
  const container = kind === 'app' && object(root.collection) ? root.collection : root;
  if (!Array.isArray(container.pokemon)) throw new Error('The backup does not contain a Pokémon collection.');
  return container.pokemon;
}
function requireUniqueIDs(entries: Obj[], name: string) {
  const ids = entries.map(p => p.id);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error(`The backup contains missing or repeated ${name} IDs.`);
}
function projectBoxes(root: Obj, kind: Collection['source']['kind'], records: PassportRecord[], collectionID: string): { boxes: Box[]; partyIDs: string[] } {
  const container = kind === 'app' && object(root.collection) ? root.collection : root;
  const storage = object(container.storage) ? container.storage : undefined;
  const wallpaper = (raw: unknown): Box['wallpaper'] => object(raw) ? { ...(typeof raw.sunMoon === 'string' ? { sunMoon: raw.sunMoon } : {}), ...(typeof raw.tint === 'string' ? { tint: raw.tint } : {}), ...(numeric(raw.strength) !== undefined ? { strength: numeric(raw.strength) } : {}) } : undefined;
  let boxes: Box[] = [];
  let partyIDs: string[] = [];
  if (Array.isArray(storage?.boxes)) {
    boxes = storage.boxes.flatMap((b, i) => object(b) ? [{ id: textValue(b.id, `${collectionID}-box-${i}`), name: textValue(b.name, `Box ${i + 1}`), slots: Array.isArray(b.slots) ? b.slots.map(s => typeof s === 'string' ? s : null) : [], ...(object(b.wallpaper) ? { wallpaper: wallpaper(b.wallpaper) } : {}) }] : []);
    partyIDs = stringArray(storage.partyIDs) ? storage.partyIDs : [];
  } else if (kind === 'guide' && stringArray(root.boxes)) {
    boxes = root.boxes.map((name, i) => ({ id: `${collectionID}-box-${i}`, name, slots: [] }));
    entriesFor(kind, root).forEach((raw, i) => {
      const box = object(raw) ? numeric(raw.box) : undefined;
      if (box !== undefined && boxes[box]) boxes[box]!.slots.push(records[i]!.id);
    });
  }
  if (kind === 'guide' && object(root.ribbonPassportLayout) && numeric(root.ribbonPassportLayout.version) === 1) {
    const layout = root.ribbonPassportLayout;
    if (!Array.isArray(layout.boxes) || !layout.boxes.every(object) || !stringArray(layout.partyIDs)) throw new Error('Invalid preserved guide layout.');
    boxes = layout.boxes.map(b => ({ id: textValue(b.id), name: textValue(b.name), slots: Array.isArray(b.slots) ? b.slots.map(id => typeof id === 'string' ? id : null) : [], ...(object(b.wallpaper) ? { wallpaper: wallpaper(b.wallpaper) } : {}) }));
    partyIDs = layout.partyIDs;
  }
  if (!boxes.length) boxes.push({ id: `${collectionID}-box-0`, name: 'Box 01', slots: [] });
  // Reconcile only the display projection. The source layout is retained verbatim.
  const valid = new Set(records.map(r => r.id)), seen = new Set<string>();
  partyIDs = partyIDs.filter(id => valid.has(id) && !seen.has(id) && !!seen.add(id)).slice(0, 6);
  seen.clear(); partyIDs.forEach(id => seen.add(id));
  for (const box of boxes) box.slots = Array.from({ length: 30 }, (_, i) => {
    const id = box.slots[i];
    if (!id || !valid.has(id) || seen.has(id)) return null;
    seen.add(id); return id;
  });
  for (const record of records) if (!seen.has(record.id)) {
    let box = boxes.find(b => b.slots.includes(null));
    if (!box) { box = { id: `${collectionID}-box-${boxes.length}`, name: `Box ${String(boxes.length + 1).padStart(2, '0')}`, slots: Array(30).fill(null) }; boxes.push(box); }
    box.slots[box.slots.indexOf(null)] = record.id;
  }
  return { boxes, partyIDs };
}
export function importBackup(text: string, collectionID: string, revision: string): Collection {
  const root = parseJSON(text);
  if (!object(root)) throw new Error('Choose a Ribbon Passport or ribbons.guide JSON backup.');
  if (root.format === 'ribbon-passport-universal') {
    if (numeric(root.version) !== 1 || !object(root.collection)) throw new Error('This universal backup version is not supported.');
    // Universal envelope numbers are ordinary safe integers; opaque original JSON stays in source.text.
    const saved = JSON.parse(serializeJSON(root.collection)) as Collection;
    return validateCollection(saved);
  }
  let kind: Collection['source']['kind'];
  if (root.format === 'ribbon-passport') {
    if (numeric(root.version) !== 1 || !object(root.collection)) throw new Error('This app backup version is not supported.');
    kind = 'app';
  } else if (root.fileVersion !== undefined) {
    if (numeric(root.fileVersion) !== 5) throw new Error('Only ribbons.guide fileVersion 5 is supported.');
    kind = 'guide';
  } else if (Array.isArray(root.pokemon) && Array.isArray(root.teams)) kind = 'snapshot';
  else throw new Error('Unrecognised backup format. No collection data was changed.');
  const entries = entriesFor(kind, root);
  if (!entries.every(object)) throw new Error('The backup contains an invalid Pokémon record.');
  const container = kind === 'app' ? root.collection as Obj : root;
  if (kind !== 'guide') {
    requireUniqueIDs(entries, 'Pokémon');
    if (!Array.isArray(container.teams) || !container.teams.every(object)) throw new Error('The app backup has an invalid team list.');
    requireUniqueIDs(container.teams, 'team');
  }
  const guideIDs = kind === 'guide' && object(root.ribbonPassportLayout) && numeric(root.ribbonPassportLayout.version) === 1 ? root.ribbonPassportLayout.recordIDs : undefined;
  if (guideIDs !== undefined && (!stringArray(guideIDs) || guideIDs.length !== entries.length || new Set(guideIDs).size !== guideIDs.length || guideIDs.some(id => !id))) throw new Error('Invalid preserved guide identities.');
  const records = entries.map((entry, sourceIndex) => {
    const id = kind === 'guide' ? (guideIDs as string[] | undefined)?.[sourceIndex] ?? `${collectionID}-pokemon-${sourceIndex}` : entry.id as string;
    return { id, sourceIndex, version: { revision: `${revision}:${sourceIndex}`, parentRevision: null }, pokemon: normalize(entry, id), changes: {} };
  });
  const { boxes, partyIDs } = projectBoxes(root, kind, records, collectionID);
  const selectedID = textValue(container.selectedID);
  return { schemaVersion: 1, id: collectionID, revision, source: { kind, text }, records, boxes, partyIDs,
    selectedID: records.some(r => r.id === selectedID) ? selectedID : records[0]?.id ?? '', selectedBoxID: boxes[0]!.id, operations: [] };
}
export function validateCollection(value: Collection): Collection {
  if (value.schemaVersion !== 1 || typeof value.id !== 'string' || typeof value.revision !== 'string' ||
    !value.source || !['guide', 'app', 'snapshot'].includes(value.source.kind) || typeof value.source.text !== 'string' ||
    !Array.isArray(value.records) || !Array.isArray(value.boxes) || !Array.isArray(value.operations) || !Array.isArray(value.partyIDs)) throw new Error('Invalid or newer local collection. Original data has been kept.');
  requireUniqueIDs(value.records as unknown as Obj[], 'Pokémon');
  const root = parseJSON(value.source.text);
  if (!object(root)) throw new Error('Invalid preserved backup.');
  const entries = entriesFor(value.source.kind, root);
  const allowed = new Set<string>(['ribbons', 'earnedGames', 'earnedGenerations', 'visits', 'title', 'titleText', ...editableFields]);
  const indexes = new Set<number>();
  for (const record of value.records) {
    const entry = record.created && record.sourceIndex === -1 ? record.pokemon as unknown as Obj : entries[record.sourceIndex];
    if (!object(entry) || (!record.created && (!Number.isInteger(record.sourceIndex) || record.sourceIndex < 0 || indexes.has(record.sourceIndex))) || !object(record.changes) || !record.version || typeof record.version.revision !== 'string' || Object.keys(record.changes).some(k => !allowed.has(k))) throw new Error('Invalid preserved record or revision.');
    if (!record.created) indexes.add(record.sourceIndex);
    const merged = { ...entry, ...record.changes };
    if ('metLevel' in record.changes) delete merged.metlevel;
    if ('sizeScale' in record.changes) delete merged.scale;
    record.pokemon = normalize(merged, record.id);
  }
  if (indexes.size !== entries.length) throw new Error('The universal backup is missing records.');
  requireUniqueIDs(value.boxes as unknown as Obj[], 'box');
  const positions = [...value.partyIDs, ...value.boxes.flatMap(b => {
    if (typeof b.name !== 'string' || !Array.isArray(b.slots) || b.slots.length !== 30 || b.slots.some(id => id !== null && typeof id !== 'string')) throw new Error('Invalid box layout.');
    return b.slots.filter((id): id is string => id !== null);
  })];
  const ids = new Set(value.records.map(r => r.id));
  if (value.partyIDs.length > 6 || positions.length !== ids.size || new Set(positions).size !== positions.length || positions.some(id => !ids.has(id))) throw new Error('Invalid or incomplete storage positions.');
  return value;
}
export function exportSource(collection: Collection): string {
  if (!collection.layoutChanged && collection.records.every(r => !r.created && !Object.keys(r.changes).length)) return collection.source.text;
  const root = parseJSON(collection.source.text) as Obj;
  const entries = entriesFor(collection.source.kind, root);
  for (const record of collection.records) {
    if (record.created) {
      const entry: Obj = { ...record.pokemon, source: 'manual' };
      if (collection.source.kind === 'guide') {
        entry.shiny = record.pokemon.shiny ? 'star' : '';
        if (record.pokemon.metLevel !== undefined) entry.metlevel = record.pokemon.metLevel;
        if (record.pokemon.sizeScale !== undefined) entry.scale = record.pokemon.sizeScale;
        delete entry.metLevel; delete entry.sizeScale;
      }
      entries.push(entry);
      continue;
    }
    const entry = entries[record.sourceIndex] as Obj;
    const originalRibbons = entry.ribbons as string[];
    const originalProjection = normalize(entry, record.id);
    for (const [key, val] of Object.entries(record.changes)) {
      if (key === 'earnedGames' || key === 'earnedGenerations') {
        // Keep unsupported map entries; delete only awards explicitly removed.
        const original = object(entry[key]) ? entry[key] as Obj : {};
        const map = { ...original };
        const projectedMap = originalProjection[key] ?? {};
        for (const [id, value] of Object.entries(val as Obj)) {
          if (value !== projectedMap[id]) map[id] = value;
        }
        for (const id of Object.keys(map)) if (!record.pokemon.ribbons.includes(id) && originalRibbons.includes(id)) delete map[id];
        entry[key] = map;
      } else if (key === 'visits' && Array.isArray(val)) {
        const original = Array.isArray(entry.visits) ? entry.visits : [];
        entry.visits = [...original, ...val.filter(v => !original.some(old => object(old) && old.game === v.game))];
      } else if (collection.source.kind === 'guide' && (key === 'metLevel' || key === 'sizeScale')) {
        const alias = key === 'metLevel' ? 'metlevel' : 'scale';
        if (val === null) { delete entry[key]; delete entry[alias]; }
        else { entry[alias] = typeof entry[alias] === 'string' ? String(val) : val; if (key in entry) entry[key] = val; }
      } else if (key === 'shiny' && collection.source.kind === 'guide') entry.shiny = val ? 'star' : '';
      else if (key === 'currentlevel' && typeof entry.currentlevel === 'string') entry.currentlevel = String(val);
      else if (val === null && (key === 'metLevel' || key === 'sizeScale')) { delete entry[key]; delete entry[key === 'metLevel' ? 'metlevel' : 'scale']; }
      else entry[key] = val;
    }
  }
  if (collection.layoutChanged) {
    if (collection.source.kind === 'guide') {
      const existing = root.ribbonPassportLayout;
      if (existing !== undefined && (!object(existing) || numeric(existing.version) !== 1)) throw new Error('This backup already has an unsupported ribbonPassportLayout field. Export a universal backup to preserve both.');
      if (root.boxes !== undefined && !stringArray(root.boxes)) throw new Error('This guide backup has unsupported box entries. Export a universal backup to preserve them.');
      root.boxes = collection.boxes.map(b => b.name);
      const sourceOrder = [...collection.records.filter(r => !r.created).sort((a, b) => a.sourceIndex - b.sourceIndex), ...collection.records.filter(r => r.created)];
      sourceOrder.forEach((r, i) => { (entries[i] as Obj).box = Math.max(0, collection.boxes.findIndex(b => b.slots.includes(r.id))); });
      const oldBoxes = object(existing) && Array.isArray(existing.boxes) ? existing.boxes : [];
      const boxes = collection.boxes.map(box => {
        const old = oldBoxes.find(b => object(b) && b.id === box.id);
        return { ...(object(old) ? old : {}), ...box, ...(box.wallpaper ? { wallpaper: { ...(object(old) && object(old.wallpaper) ? old.wallpaper : {}), ...box.wallpaper } } : {}) };
      });
      root.ribbonPassportLayout = { ...(object(existing) ? existing : {}), version: 1, recordIDs: sourceOrder.map(r => r.id), boxes, partyIDs: collection.partyIDs };
    } else {
      const container = collection.source.kind === 'app' ? root.collection as Obj : root;
      const storage = object(container.storage) ? container.storage : {};
      const originals = Array.isArray(storage.boxes) ? storage.boxes : [];
      const projected = projectBoxes(root, collection.source.kind, collection.records.filter(r => !r.created), collection.id);
      const remaining = new Map(collection.boxes.map(b => [b.id, b]));
      const updated = originals.map(raw => {
        if (!object(raw) || typeof raw.id !== 'string' || !remaining.has(raw.id)) return raw;
        const box = remaining.get(raw.id)!; remaining.delete(raw.id);
        const previous = projected.boxes.find(b => b.id === box.id);
        const next: Obj = { ...raw };
        if (box.name !== previous?.name) next.name = box.name;
        if (JSON.stringify(box.slots) !== JSON.stringify(previous?.slots)) next.slots = [...box.slots, ...(Array.isArray(raw.slots) ? raw.slots.slice(30) : [])];
        if (JSON.stringify(box.wallpaper) !== JSON.stringify(previous?.wallpaper)) next.wallpaper = { design: 'classic', strength: 0.65, ...(object(raw.wallpaper) ? raw.wallpaper : {}), ...box.wallpaper };
        return next;
      });
      const added = [...remaining.values()].map(box => ({ ...box, ...(box.wallpaper ? { wallpaper: { design: 'classic', strength: 0.65, ...box.wallpaper } } : {}) }));
      container.storage = { ...storage, boxes: [...updated, ...added], partyIDs: JSON.stringify(collection.partyIDs) === JSON.stringify(projected.partyIDs) ? storage.partyIDs ?? [] : collection.partyIDs };
    }
  }
  return serializeJSON(root);
}
export const exportUniversal = (collection: Collection) => JSON.stringify({ format: 'ribbon-passport-universal', version: 1, collection }, null, 2);
