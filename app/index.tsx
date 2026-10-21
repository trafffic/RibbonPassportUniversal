import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useCollection } from '../src/state/CollectionProvider';
import { displayedAwards } from '../src/domain/catalog';
import { Shell } from '../src/ui/Shell';
import { PCBox } from '../src/ui/PCBox';
import { PokemonSummary } from '../src/ui/PokemonSummary';
import { PixelText } from '../src/ui/primitives';
import { colors, ui } from '../src/ui/theme';
export default function CollectionScreen() {
  const { collection } = useCollection(), { width } = useWindowDimensions();
  const p = collection?.records.find(r => r.id === collection.selectedID)?.pokemon;
  return <Shell>
    <View style={[ui.between, { alignItems: 'flex-end' }]}>
      <View style={{ gap: 8, maxWidth: '100%', flexShrink: 1 }}><PixelText style={ui.label}>RIBBON PASSPORT / COLLECTION</PixelText><PixelText accessibilityRole="header" style={{ fontSize: width < 600 ? 30 : 38 }}>Every ribbon has a story.</PixelText><PixelText style={{ fontSize: 17, color: colors.muted }}>Your PC. Your ribbon masters. Their next adventure.</PixelText></View>
      <View style={[ui.row, { gap: 24 }]}>{[[collection?.records.length ?? 0, 'POKÉMON'], [collection?.records.reduce((n, r) => n + displayedAwards(r.pokemon).length, 0) ?? 0, 'AWARDS'], [collection?.boxes.length ?? 0, 'BOXES']].map(([value, label]) => <View key={label} style={{ gap: 4 }}><PixelText style={{ fontSize: 30 }}>{value}</PixelText><PixelText style={ui.label}>{label}</PixelText></View>)}</View>
    </View>
    <View style={{ flexDirection: width >= 980 ? 'row' : 'column', gap: 20, alignItems: 'stretch' }}>
      <View style={{ flex: width >= 980 ? 1.65 : undefined, minWidth: 0 }}><PCBox /></View>
      <View style={{ flex: width >= 980 ? 1 : undefined, minWidth: 0 }}>{p ? <PokemonSummary pokemon={p} /> : <View style={ui.panel}><PixelText style={ui.heading}>Your next story starts here</PixelText><PixelText>Add your first Pokémon or import a collection.</PixelText></View>}</View>
    </View>
  </Shell>;
}
