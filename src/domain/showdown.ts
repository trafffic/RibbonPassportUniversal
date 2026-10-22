import type { Collection, Pokemon, ShowdownSet } from './model';
import type { ChangeContext } from './collection';
import { catalog } from './catalog';
import { speciesID } from './community';
import { blankPokemon, addPokemon, createBox } from './organisation';
export function parseShowdown(
  text: string,
  ids: string[],
  game = '',
  origin = '',
): Pokemon[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.filter((l) => l.trim().startsWith('===')).length > 1)
    throw new Error('Paste a single Showdown team, not a team backup.');
  const blocks = lines
    .filter((l) => !l.trim().startsWith('==='))
    .join('\n')
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);
  if (
    !text.trim() ||
    blocks.length > 6 ||
    ids.length !== blocks.length ||
    new Set(ids).size !== ids.length
  )
    throw new Error('Paste one Showdown team containing one to six Pokémon.');
  return blocks.map((block, i) => {
    const rows = block.split('\n').map((s) => s.trim()),
      header = rows.shift()!,
      at = header.indexOf(' @ ');
    let name = at >= 0 ? header.slice(0, at) : header;
    const build: ShowdownSet = {
      item: at >= 0 ? header.slice(at + 3) : '',
      ability: '',
      nature: '',
      evs: '',
      ivs: '',
      teraType: '',
      moves: [],
    };
    const gender = name.endsWith(' (M)')
      ? 'male'
      : name.endsWith(' (F)')
        ? 'female'
        : '';
    if (gender) name = name.slice(0, -4);
    const match = name.match(/^(.*) \(([^)]+)\)$/),
      species = speciesID(match?.[2] ?? name);
    if (!species)
      throw new Error(`Cannot recognise Pokémon ${i + 1}: ${name}.`);
    const p: Pokemon = {
      ...blankPokemon(ids[i]!),
      species,
      nickname: match?.[1] ?? '',
      gender,
      source: 'showdown',
      currentlevel: 100,
      origingame: origin,
      currentgame: game,
      gmax: /-Gmax$/i.test(match?.[2] ?? name),
      showdownSet: build,
    };
    for (const row of rows) {
      if (row.startsWith('Ability: ')) build.ability = row.slice(9);
      else if (row.startsWith('EVs: ')) build.evs = row.slice(5);
      else if (row.startsWith('IVs: ')) build.ivs = row.slice(5);
      else if (row.startsWith('Tera Type: ')) build.teraType = row.slice(11);
      else if (row.endsWith(' Nature')) build.nature = row.slice(0, -7);
      else if (row.startsWith('- ')) build.moves.push(row.slice(2));
      else if (/^Shiny: Yes$/i.test(row)) p.shiny = true;
      else if (/^Gigantamax: Yes$/i.test(row)) p.gmax = true;
      else if (/^Level:/i.test(row)) {
        const level = Number(row.split(':').slice(1).join(':').trim());
        if (!Number.isInteger(level) || level < 1 || level > 100)
          throw new Error(`Invalid level for ${name}.`);
        p.currentlevel = level;
      } else if (row) (build.extraLines ??= []).push(row);
    }
    return p;
  });
}
export function exportShowdown(pokemon: Pokemon[]): string {
  return pokemon
    .map((p) => {
      const set = p.showdownSet;
      if (!set || !catalog.pokemon[p.species])
        throw new Error(
          'A recognised species and battle build are required for Showdown export.',
        );
      const species =
          catalog.pokemon[p.species]!.name +
          (p.gmax && !/-Gmax$/i.test(catalog.pokemon[p.species]!.name)
            ? '-Gmax'
            : ''),
        header =
          (p.nickname ? `${p.nickname} (${species})` : species) +
          (p.gender === 'male' ? ' (M)' : p.gender === 'female' ? ' (F)' : '') +
          (set.item ? ' @ ' + set.item : '');
      const rows = [
        header,
        ...(set.ability ? ['Ability: ' + set.ability] : []),
        'Level: ' + p.currentlevel,
        ...(p.shiny ? ['Shiny: Yes'] : []),
        ...(p.gmax ? ['Gigantamax: Yes'] : []),
        ...(set.teraType ? ['Tera Type: ' + set.teraType] : []),
        ...(set.evs ? ['EVs: ' + set.evs] : []),
        ...(set.nature ? [set.nature + ' Nature'] : []),
        ...(set.ivs ? ['IVs: ' + set.ivs] : []),
        ...(set.extraLines ?? []),
        ...set.moves.map((move) => '- ' + move),
      ];
      if (rows.some((row) => /[\r\n]/.test(row)))
        throw new Error(
          'A build field contains a line break that Showdown cannot represent.',
        );
      return rows.join('\n');
    })
    .join('\n\n');
}
export function importShowdownTeam(
  c: Collection,
  pokemon: Pokemon[],
  name: string,
  teamID: string,
  boxID: string,
  ctx: ChangeContext,
): Collection {
  if (!name.trim() || !pokemon.length || pokemon.length > 6)
    throw new Error('Choose a team name and one to six Pokémon.');
  let next = createBox(
    c,
    boxID,
    `Box ${String(c.boxes.filter((b) => b.kind === 'showdown').length + 1).padStart(2, '0')}`,
    { ...ctx, id: ctx.id + ':box' },
  );
  next = {
    ...next,
    boxes: next.boxes.map((b) =>
      b.id === boxID ? { ...b, kind: 'showdown' } : b,
    ),
  };
  pokemon.forEach(
    (p, i) =>
      (next = addPokemon(next, p, boxID, { ...ctx, id: ctx.id + ':' + i })),
  );
  return {
    ...next,
    revision: ctx.id,
    metadataChanged: true,
    metadataChanges: [
      ...new Set([
        ...(c.metadataChanges ?? []),
        'teams' as const,
        'selectedTeamID' as const,
      ]),
    ],
    teams: [
      ...(next.teams ?? []),
      { id: teamID, name: name.trim(), memberIDs: pokemon.map((p) => p.id) },
    ],
    selectedTeamID: teamID,
  };
}
