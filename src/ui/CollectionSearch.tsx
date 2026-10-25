import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { PassportRecord } from '../domain/model';
import { matchesPokemon } from '../domain/collection-tools';
import { baseSpeciesID, speciesLabel, speciesOptions } from '../domain/species';
import { displayName, gameName, sortGames } from '../domain/catalog';
import { Button, PixelText, Toggle } from './primitives';
import { ChoiceField } from './Editors';
import { useTheme } from './theme';

export function CollectionSearch({ records, onSelect }: { records: PassportRecord[]; onSelect(id: string): void }) {
  const { ui, colors } = useTheme();
  const [query, setQuery] = useState(''), [shiny, setShiny] = useState(false),
    [game, setGame] = useState(''), [species, setSpecies] = useState(''), [limit, setLimit] = useState(30);
  const speciesIDs = new Set(records.map(r => baseSpeciesID(r.pokemon.species)));
  const matches = records.filter(r => matchesPokemon(r.pokemon, { query, shiny, game, species }));
  const reset = () => setLimit(30);
  return <View style={{ gap: 10 }}>
    <TextInput accessibilityLabel="Search Pokémon" placeholder="Name, form or Pokédex number" placeholderTextColor={colors.muted}
      style={ui.input} value={query} onChangeText={value => { setQuery(value); reset(); }} />
    <Toggle label="Shiny only" value={shiny} onChange={value => { setShiny(value); reset(); }} />
    <ChoiceField label="Filter current game" value={game} options={[
      { id: '', name: 'All games' }, ...sortGames(records.map(r => r.pokemon.currentgame).filter(Boolean)).map(id => ({ id, name: gameName(id) })),
    ]} onChange={id => { setGame(id); reset(); }} game />
    <ChoiceField label="Filter species" value={species} options={[{ id: '', name: 'All species' }, ...speciesOptions.filter(o => speciesIDs.has(o.id))]}
      onChange={id => { setSpecies(id); reset(); }} />
    <Button onPress={() => { setQuery(''); setShiny(false); setGame(''); setSpecies(''); reset(); }}>Clear search and filters</Button>
    <PixelText>{matches.length} Pokémon found</PixelText>
    {matches.slice(0, limit).map(r => <Button key={r.id} label={`Find ${displayName(r.pokemon)}`} onPress={() => onSelect(r.id)}>
      {`${displayName(r.pokemon)}${r.pokemon.nickname ? ` · ${speciesLabel(r.pokemon)}` : ''} · ${gameName(r.pokemon.currentgame)}`}
    </Button>)}
    {!matches.length && <PixelText>No Pokémon match these filters.</PixelText>}
    {matches.length > limit && <Button onPress={() => setLimit(limit + 30)}>Show more Pokémon</Button>}
  </View>;
}
