import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { catalog, displayName, displayedAwards, gameName } from '../domain/catalog';
import { transferCheck } from '../domain/rules';
import type { Pokemon } from '../domain/model';
import { Art, Button, Panel, PixelText, Sprite, Tag } from './primitives';
import { colors, ui } from './theme';
import { PokemonEditor } from './Editors';
import { useCollection } from '../state/CollectionProvider';

export function PokemonSummary({ pokemon: p, full = false }: { pokemon: Pokemon; full?: boolean }) {
  const router = useRouter(), awards = displayedAwards(p), transfer = transferCheck(p.currentgame, p);
  const state = useCollection(), [editing, setEditing] = useState(false);
  const record = state.collection!.records.find(r => r.id === p.id)!;
  return <Panel>
    <View style={ui.between}><PixelText style={ui.label}>{full ? 'POKÉMON PASSPORT' : 'QUICK PREVIEW'}</PixelText><PixelText style={ui.label}>#{String(catalog.pokemon[p.species]?.natdex ?? '???').padStart(3, '0')}</PixelText></View>
    <View style={[{ alignItems: 'center', paddingTop: 24, paddingBottom: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, gap: 18 }, full && { paddingHorizontal: 12 }]}>
      <Sprite pokemon={p} size={full ? 176 : 160} />
      <View style={{ alignItems: 'center', gap: 8, paddingBottom: 12 }}>
        <View style={[ui.row, { justifyContent: 'center', gap: 6, paddingHorizontal: 12 }]}><PixelText style={{ fontSize: full ? 32 : 30, textAlign: 'center' }}>{displayName(p)}</PixelText>{p.shiny && <Art name="shiny-light" label="Shiny" size={20} />}</View>
        <PixelText style={ui.muted}>{catalog.pokemon[p.species]?.name ?? p.species} · Lv. {p.currentlevel}</PixelText>
        <View style={[ui.row, { justifyContent: 'center' }]}>{p.gmax && <Tag>Gigantamax</Tag>}{(p.shadow || p.species === 'lugia-shadow' || p.origingame === 'xd') && <Tag>Shadow origin</Tag>}</View>
      </View>
    </View>
    <View style={{ gap: 12 }}>
      <View style={ui.between}><PixelText style={ui.muted}>Origin</PixelText><View style={[ui.row, { gap: 6, flexShrink: 1 }]}>{!!p.origingame && <Art name={`game-${p.origingame}-light`} size={30} />}<PixelText>{gameName(p.origingame)}</PixelText></View></View>
      <View style={ui.between}><PixelText style={ui.muted}>Currently in</PixelText><View style={[ui.row, { gap: 6, flexShrink: 1 }]}>{!!p.currentgame && <Art name={`game-${p.currentgame}-light`} size={30} />}<PixelText>{gameName(p.currentgame)}</PixelText></View></View>
      <View style={ui.between}><PixelText style={ui.muted}>Ribbon case</PixelText><PixelText>{awards.length} awards</PixelText></View>
    </View>
    {!full && <>
      <View style={[ui.row, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 16, gap: 10 }]}>
        {awards.slice(0, 8).map(id => <Art key={id} name={`award-${id}`} label={catalog.ribbons[id] ?? id} size={26} />)}
        {awards.length > 8 && <PixelText style={{ fontSize: 14 }}>+{awards.length - 8}</PixelText>}
      </View>
      <Button primary onPress={() => router.push({ pathname: '/passport/[id]', params: { id: p.id } })}>Open full passport →</Button>
    </>}
    {full && <Button onPress={() => setEditing(true)}>Edit Pokémon</Button>}
    <View style={{ backgroundColor: colors.board, padding: 14, gap: 5 }}>
      <PixelText style={ui.label}>TRANSFER CHECK</PixelText>
      <PixelText>{!transfer.canAssess ? 'Set a compatible current game first' : !transfer.nextGeneration ? 'No compatible later generation' : transfer.lastChance.length ? `${transfer.lastChance.length} last-chance awards before leaving Gen ${transfer.generation}` : transfer.warnings.length ? 'Footprint eligibility needs checking' : `Safe to leave Gen ${transfer.generation}`}</PixelText>
      {!!transfer.warnings.length && <PixelText style={{ fontSize: 15 }}>Met level is not recorded. Add it in Edit Pokémon to assess Footprint eligibility.</PixelText>}
    </View>
    {editing && <PokemonEditor record={record} boxID={state.collection!.selectedBoxID} onClose={() => setEditing(false)} />}
  </Panel>;
}
