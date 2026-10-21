// Pure domain types: no React, platform APIs, clock, or random ID generation.
export interface Pokemon {
  id: string;
  species: string;
  nickname: string;
  gender: string;
  shiny: boolean;
  currentgame: string;
  origingame: string;
  shadow: boolean;
  gmax: boolean;
  currentlevel: number;
  title: string;
  titleText: string;
  ribbons: string[];
  visits?: Visit[];
  earnedGames?: Record<string, string>;
  earnedGenerations?: Record<string, number>;
  metLevel?: number;
  sizeScale?: number;
  ball?: string;
}
export interface Visit { id: string; game: string }
export interface Box {
  id: string; name: string; slots: (string | null)[];
  wallpaper?: { sunMoon?: string; tint?: string; strength?: number };
}
export interface RecordVersion {
  revision: string;
  parentRevision: string | null;
}
export interface PassportRecord {
  id: string;
  version: RecordVersion;
  sourceIndex: number;
  // New records have no source row. Their complete initial projection is retained here.
  created?: boolean;
  pokemon: Pokemon;
  // Only explicitly changed fields are written over the original backup.
  changes: Record<string, unknown>;
}
export interface Operation {
  id: string;
  recordID: string;
  parentRevision: string;
  revision: string;
  at: string;
  kind: 'record-ribbon' | 'remove-ribbon' | 'undo' | 'add-pokemon' | 'edit-pokemon' | 'create-box' | 'edit-box' | 'move-pokemon';
  award?: string;
  game?: string;
}
export interface Collection {
  schemaVersion: 1;
  id: string;
  revision: string;
  source: { kind: 'app' | 'guide' | 'snapshot'; text: string };
  records: PassportRecord[];
  boxes: Box[];
  partyIDs: string[];
  selectedID: string;
  selectedBoxID: string;
  operations: Operation[];
  layoutChanged?: boolean;
}
