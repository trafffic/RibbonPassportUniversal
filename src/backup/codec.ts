import { parse, stringify, isLosslessNumber } from 'lossless-json';
import type { Box, Collection, PassportRecord, Pokemon, Visit } from '../domain/model';

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
  let boxes: Box[] = [];
  let partyIDs: string[] = [];
  if (Array.isArray(storage?.boxes)) {
    boxes = storage.boxes.flatMap((b, i) => object(b) ? [{ id: textValue(b.id, `${collectionID}-box-${i}`), name: textValue(b.name, `Box ${i + 1}`), slots: Array.isArray(b.slots) ? b.slots.map(s => typeof s === 'string' ? s : null) : [] }] : []);
    partyIDs = stringArray(storage.partyIDs) ? storage.partyIDs : [];
  } else if (kind === 'guide' && stringArray(root.boxes)) {
    boxes = root.boxes.map((name, i) => ({ id: `${collectionID}-box-${i}`, name, slots: [] }));
    entriesFor(kind, root).forEach((raw, i) => {
      const box = object(raw) ? numeric(raw.box) : undefined;
      if (box !== undefined && boxes[box]) boxes[box]!.slots.push(records[i]!.id);
    });
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
  const records = entries.map((entry, sourceIndex) => {
    const id = kind === 'guide' ? `${collectionID}-pokemon-${sourceIndex}` : entry.id as string;
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
  const allowed = new Set(['ribbons', 'earnedGames', 'earnedGenerations', 'visits', 'title', 'titleText']);
  const indexes = new Set<number>();
  for (const record of value.records) {
    const entry = entries[record.sourceIndex];
    if (!object(entry) || indexes.has(record.sourceIndex) || !object(record.changes) || !record.version || typeof record.version.revision !== 'string' || Object.keys(record.changes).some(k => !allowed.has(k))) throw new Error('Invalid preserved record or revision.');
    indexes.add(record.sourceIndex);
    record.pokemon = normalize({ ...entry, ...record.changes }, record.id);
  }
  if (indexes.size !== entries.length) throw new Error('The universal backup is missing records.');
  return value;
}
export function exportSource(collection: Collection): string {
  if (collection.records.every(r => !Object.keys(r.changes).length)) return collection.source.text;
  const root = parseJSON(collection.source.text) as Obj;
  const entries = entriesFor(collection.source.kind, root);
  for (const record of collection.records) {
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
      } else entry[key] = val;
    }
  }
  return serializeJSON(root);
}
export const exportUniversal = (collection: Collection) => JSON.stringify({ format: 'ribbon-passport-universal', version: 1, collection }, null, 2);
