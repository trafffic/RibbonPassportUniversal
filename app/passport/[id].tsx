import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCollection } from '../../src/state/CollectionProvider';
import { Shell } from '../../src/ui/Shell';
import { Button, PixelText } from '../../src/ui/primitives';
import { PokemonSummary } from '../../src/ui/PokemonSummary';
import { RibbonBoard } from '../../src/ui/RibbonBoard';
import { Journey } from '../../src/ui/Journey';
import { ui } from '../../src/ui/theme';
export default function PassportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), router = useRouter();
  const { collection } = useCollection(), { width } = useWindowDimensions();
  const p = collection?.records.find(r => r.id === id)?.pokemon;
  const [tab, setTab] = useState<'ribbons' | 'journey'>('ribbons');
  return <Shell>
    <View style={ui.between}><Button onPress={() => router.replace('/')}>← Back to PC</Button><PixelText style={ui.label}>RIBBON PASSPORT / FULL PASSPORT</PixelText></View>
    {p ? <View style={{ flexDirection: width >= 1100 ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
      <View style={{ width: width >= 1100 ? 330 : '100%' }}><PokemonSummary pokemon={p} full /></View>
      <View style={{ flex: 1, width: width >= 1100 ? undefined : '100%', gap: 16 }}>
        <View style={ui.row}><Button primary={tab === 'ribbons'} onPress={() => setTab('ribbons')}>Ribbons</Button><Button primary={tab === 'journey'} onPress={() => setTab('journey')}>Journey</Button></View>
        {tab === 'ribbons' ? <RibbonBoard key={p.id} pokemon={p} /> : <Journey pokemon={p} />}
      </View>
    </View> : <PixelText>Pokémon not found in this collection.</PixelText>}
  </Shell>;
}
