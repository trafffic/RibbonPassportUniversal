import React from 'react';
import { View } from 'react-native';
import { useCollection } from '../src/state/CollectionProvider';
import { displayName } from '../src/domain/catalog';
import { Shell } from '../src/ui/Shell';
import { Button, Panel, PixelText } from '../src/ui/primitives';
import { RibbonBoard } from '../src/ui/RibbonBoard';
import { ui } from '../src/ui/theme';
export default function PlannerScreen() {
  const state = useCollection(), c = state.collection;
  const p = c?.records.find(r => r.id === c.selectedID)?.pokemon;
  return <Shell>
    <View style={{ gap: 10 }}><PixelText style={ui.label}>RIBBON PASSPORT / PLANNER</PixelText><PixelText style={{ fontSize: 40 }}>The next chapter.</PixelText><PixelText>See what is reachable, and what needs earning before a transfer.</PixelText></View>
    <Panel><PixelText style={ui.label}>CHOOSE A POKÉMON</PixelText><View style={ui.row}>{c?.records.map(r => <Button key={r.id} primary={r.id === p?.id} disabled={state.busy} onPress={() => state.select(r.id)}>{displayName(r.pokemon)}</Button>)}</View></Panel>
    {p && <RibbonBoard key={p.id} pokemon={p} planner />}
  </Shell>;
}
