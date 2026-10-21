import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { catalog, displayName, displayedAwards, gameName } from '../domain/catalog';
import { transferCheck } from '../domain/rules';
import type { Pokemon } from '../domain/model';
import { Art, Button, Panel, PixelText, Sprite, Tag } from './primitives';
import { colors, ui } from './theme';

export function PokemonSummary({ pokemon: p, full = false }: { pokemon: Pokemon; full?: boolean }) {
  const router = useRouter(), awards = displayedAwards(p), transfer = transferCheck(p.currentgame, p);
  return <Panel style={{ flex: 1 }}>
    <View style={ui.between}><PixelText style={ui.label}>{full ? 'POKÉMON PASSPORT' : 'QUICK PREVIEW'}</PixelText><PixelText style={ui.label}>#{String(catalog.pokemon[p.species]?.natdex ?? '???').padStart(3, '0')}</PixelText></View>
    <View style={[{ alignItems: 'center', paddingVertical: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border }, full && { flexDirection: 'row', justifyContent: 'center', gap: 20, flexWrap: 'wrap', paddingHorizontal: 16 }]}>
      <Sprite pokemon={p} size={full ? 140 : 128} />
      <View style={{ alignItems: 'center', gap: 8, paddingBottom: 12 }}>
        <PixelText style={{ fontSize: full ? 36 : 30, textAlign: 'center' }}>{displayName(p)}</PixelText>
        <PixelText style={ui.muted}>{catalog.pokemon[p.species]?.name ?? p.species} · Lv. {p.currentlevel}</PixelText>
        <View style={ui.row}>{p.shiny && <Tag>Shiny</Tag>}{p.gmax && <Tag>Gigantamax</Tag>}{(p.shadow || p.species === 'lugia-shadow' || p.origingame === 'xd') && <Tag>Shadow origin</Tag>}</View>
      </View>
    </View>
    <View style={{ gap: 12 }}>
      <View style={ui.between}><PixelText style={ui.muted}>Origin</PixelText><PixelText>{gameName(p.origingame)}</PixelText></View>
      <View style={ui.between}><PixelText style={ui.muted}>Currently in</PixelText><PixelText>{gameName(p.currentgame)}</PixelText></View>
      <View style={ui.between}><PixelText style={ui.muted}>Ribbon case</PixelText><PixelText>{awards.length} awards</PixelText></View>
    </View>
    {!full && <>
      <View style={[ui.row, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 16, gap: 10 }]}>
        {awards.slice(0, 8).map(id => <Art key={id} name={`award-${id}`} label={catalog.ribbons[id] ?? id} size={26} />)}
        {awards.length > 8 && <PixelText style={{ fontSize: 14 }}>+{awards.length - 8}</PixelText>}
      </View>
      <Button primary onPress={() => router.push({ pathname: '/passport/[id]', params: { id: p.id } })}>Open full passport →</Button>
    </>}
    <View style={{ backgroundColor: colors.board, padding: 14, gap: 5 }}>
      <PixelText style={ui.label}>TRANSFER CHECK</PixelText>
      <PixelText>{!transfer.canAssess ? 'Set a compatible current game first' : !transfer.nextGeneration ? 'No compatible later generation' : transfer.lastChance.length ? `${transfer.lastChance.length} last-chance awards before leaving Gen ${transfer.generation}` : transfer.warnings.length ? 'Footprint eligibility needs checking' : `Safe to leave Gen ${transfer.generation}`}</PixelText>
      {!!transfer.warnings.length && <PixelText style={{ fontSize: 15 }}>Met level is not recorded. Footprint eligibility is unresolved.</PixelText>}
    </View>
  </Panel>;
}
