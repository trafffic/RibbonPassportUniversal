import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useCollection } from '../state/CollectionProvider';
import { displayName } from '../domain/catalog';
import { Button, Panel, PixelText, Sprite } from './primitives';
import { colors, ui } from './theme';

export function PCBox() {
  const state = useCollection(), { width } = useWindowDimensions();
  const collection = state.collection!;
  const box = collection.boxes.find(b => b.id === collection.selectedBoxID) ?? collection.boxes[0]!;
  const byID = new Map(collection.records.map(r => [r.id, r.pokemon]));
  return <Panel style={{ flex: 1, padding: width < 600 ? 12 : 22 }}>
    <View style={ui.between}><PixelText style={ui.heading}>PC storage</PixelText><PixelText style={ui.label}>{collection.records.length} POKÉMON</PixelText></View>
    <View style={[ui.row, { gap: 8 }]}>{collection.boxes.map(b => <Button key={b.id} primary={b.id === box.id} disabled={state.busy} onPress={() => state.selectBox(b.id)}>{b.name}</Button>)}</View>
    <View style={{ borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.board }}>
      <View style={[ui.between, { backgroundColor: colors.ink, padding: 14 }]}><PixelText style={{ color: colors.panel }}>{box.name}</PixelText><PixelText style={{ color: colors.panel, fontSize: 14 }}>{box.slots.filter(Boolean).length} / 30</PixelText></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 6 }}>
        {Array.from({ length: 30 }, (_, i) => {
          const p = byID.get(box.slots[i] ?? ''), selected = p?.id === collection.selectedID;
          return <View key={i} style={{ width: '16.666666%', padding: width < 600 ? 2 : 5 }}>
            {p ? <Pressable accessibilityRole="button" accessibilityLabel={`Select ${displayName(p)}`} accessibilityState={{ selected, disabled: state.busy }} disabled={state.busy} onPress={() => state.select(p.id)}
              style={({ pressed }) => ({ aspectRatio: width >= 980 ? 1.35 : 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: selected ? 2 : 1, borderColor: selected ? colors.ink : colors.border, backgroundColor: selected ? colors.panel : '#E6EDDB99', opacity: pressed ? 0.65 : 1 })}>
              <Sprite pokemon={p} size={width < 600 ? Math.min(42, (width - 112) / 6 - 4) : 64} />
              {p.shiny && <PixelText style={{ position: 'absolute', top: 0, right: 3, fontSize: 12 }}>✦</PixelText>}
            </Pressable> : <View accessible accessibilityLabel={`Empty slot ${i + 1}`} style={{ aspectRatio: width >= 980 ? 1.35 : 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}><PixelText style={{ color: colors.border }}>·</PixelText></View>}
          </View>;
        })}
      </View>
    </View>
    {!!collection.partyIDs.length && <View style={{ gap: 10 }}><PixelText style={ui.label}>PARTY</PixelText><View style={ui.row}>{collection.partyIDs.map(id => { const p = byID.get(id); return p && <Button key={id} onPress={() => state.select(id)}>{displayName(p)}</Button>; })}</View></View>}
    <PixelText style={{ fontSize: 15, color: colors.muted }}>Select a Pokémon to preview its ribbon case and next steps.</PixelText>
  </Panel>;
}
