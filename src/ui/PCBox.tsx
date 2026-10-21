import React, { useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useCollection } from '../state/CollectionProvider';
import { catalog, displayName, gameName } from '../domain/catalog';
import { Art, Button, Panel, PixelText, Sprite } from './primitives';
import { BoxEditor, ChoiceField, EditorSheet, PokemonEditor } from './Editors';
import { pcMetrics as m, wallpapers } from './wallpapers';
import { colors, ui } from './theme';
import type { Pokemon } from '../domain/model';

export function PCBox() {
  const state = useCollection(), { width } = useWindowDimensions();
  const collection = state.collection!;
  const [boardWidth, setBoardWidth] = useState(300), [editor, setEditor] = useState<'add' | 'edit' | 'box' | 'create-box' | 'new' | null>(null);
  const [moving, setMoving] = useState(''), [search, setSearch] = useState(''), [game, setGame] = useState('');
  const [finding, setFinding] = useState(false);
  const box = collection.boxes.find(b => b.id === collection.selectedBoxID) ?? collection.boxes[0]!;
  const index = collection.boxes.indexOf(box), wallpaper = wallpapers.find(w => w.id === box.wallpaper?.sunMoon) ?? wallpapers[index % wallpapers.length]!;
  const byID = new Map(collection.records.map(r => [r.id, r.pokemon]));
  const selected = collection.records.find(r => r.id === collection.selectedID);
  const match = (p: Pokemon) => (!search || `${displayName(p)} ${catalog.pokemon[p.species]?.name ?? p.species} ${p.species}`.toLowerCase().includes(search.toLowerCase())) && (!game || p.currentgame === game);
  const results = collection.records.filter(r => match(r.pokemon));
  const games = [...new Set(collection.records.map(r => r.pokemon.currentgame).filter(Boolean))];
  const gridWidth = boardWidth * m.gridWidth / m.width, gridHeight = boardWidth * m.gridHeight / m.width;
  const slotWidth = gridWidth / 6, slotHeight = gridHeight / 5;
  const page = (offset: number) => state.selectBox(collection.boxes[(index + offset + collection.boxes.length) % collection.boxes.length]!.id);
  return <Panel style={{ flex: 1, padding: width < 600 ? 0 : 16, borderWidth: width < 600 ? 0 : 1, backgroundColor: width < 600 ? 'transparent' : colors.panel, gap: 14, minWidth: 0 }}>
    <View style={ui.between}><View><PixelText style={ui.heading}>PC storage</PixelText><PixelText style={ui.label}>{collection.records.length} POKÉMON / {collection.boxes.length} BOXES</PixelText></View><Button primary disabled={state.busy} onPress={() => setEditor('add')}>+ Add Pokémon</Button></View>
    {finding && <View style={{ gap: 10 }}>
      <TextInput accessibilityLabel="Search Pokémon" placeholder="Search your Pokémon…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={ui.input} autoFocus />
      <ChoiceField label="Filter current game" value={game} options={[{ id: '', name: 'All games' }, ...games.map(id => ({ id, name: gameName(id) }))]} onChange={setGame} game />
      {(!!search || !!game) && <View style={{ gap: 8 }}><PixelText style={ui.label}>{results.length} MATCHES ACROSS YOUR COLLECTION</PixelText><View style={ui.row}>{results.slice(0, 40).map(r => <Button key={r.id} disabled={state.busy} onPress={() => state.select(r.id)} label={`Find ${displayName(r.pokemon)}`}>{displayName(r.pokemon)}</Button>)}</View>{results.length > 40 && <PixelText>Refine your search to see the remaining matches.</PixelText>}</View>}
    </View>}
    <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', aspectRatio: m.width / m.height, borderRadius: 6, overflow: 'hidden' }} onLayout={e => setBoardWidth(e.nativeEvent.layout.width)} testID="pc-artwork">
      <Image source={wallpaper.source} resizeMode="stretch" style={{ position: 'absolute', width: '100%', height: '100%' }} />
      {!!box.wallpaper?.tint && /^[0-9a-f]{6}$/i.test(box.wallpaper.tint) && <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: `#${box.wallpaper.tint}`, opacity: Math.min(1, Math.max(0, box.wallpaper.strength ?? 0.65)) * 0.5 }} />}
      <View style={{ position: 'absolute', left: '8.5%', top: '2%', width: '83%', height: '15%', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous box" disabled={state.busy} onPress={() => page(-1)} style={{ minWidth: 32, minHeight: 40, justifyContent: 'center', alignItems: 'center' }}><PixelText style={{ color: '#FFF', fontSize: 26 }}>‹</PixelText></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${box.name}`} onPress={() => setEditor('box')} style={{ flex: 1, minHeight: 40, justifyContent: 'center' }}><PixelText numberOfLines={1} style={{ color: '#FFF', fontSize: width < 600 ? 16 : 25 }}>{box.name.toUpperCase()}</PixelText></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next box" disabled={state.busy} onPress={() => page(1)} style={{ minWidth: 32, minHeight: 40, justifyContent: 'center', alignItems: 'center' }}><PixelText style={{ color: '#FFF', fontSize: 26 }}>›</PixelText></Pressable>
      </View>
      <View style={{ position: 'absolute', left: `${m.x / m.width * 100}%`, top: `${m.y / m.height * 100}%`, width: `${m.gridWidth / m.width * 100}%`, height: `${m.gridHeight / m.height * 100}%`, flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 30 }, (_, i) => {
          const p = byID.get(box.slots[i] ?? ''), isSelected = !!p && p.id === collection.selectedID;
          return <Pressable key={i} testID={`pc-slot-${i + 1}`} accessibilityRole="button" accessibilityLabel={moving ? `${p ? `Swap with ${displayName(p)}` : 'Move to empty slot'} ${i + 1}` : p ? `Select ${displayName(p)}` : `Empty slot ${i + 1}`} accessibilityState={{ selected: isSelected, disabled: state.busy }} disabled={state.busy} onPress={async () => {
            if (moving) { if (await state.move(moving, { boxID: box.id, slot: i })) setMoving(''); }
            else if (p) await state.select(p.id);
          }} style={({ pressed }) => ({ width: '16.666666%', height: '20%', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: isSelected ? colors.accent : 'transparent', backgroundColor: isSelected ? '#F7F9EE50' : pressed ? '#F7F9EE70' : 'transparent' })}>
            {p && <View style={{ opacity: match(p) ? moving === p.id ? 0.45 : 1 : 0.25 }}><Sprite pokemon={p} width={Math.max(1, slotWidth - 10)} height={Math.max(1, slotHeight - 10)} /></View>}
            {p?.shiny && <View style={{ position: 'absolute', right: 1, bottom: 1 }}><Art name="shiny-light" size={width < 600 ? 11 : 16} /></View>}
          </Pressable>;
        })}
      </View>
    </View>
    <View style={ui.between}><PixelText style={ui.label}>{box.slots.filter(Boolean).length} / 30</PixelText><PixelText style={ui.label}>{wallpaper.name.toUpperCase()} / SUN & MOON</PixelText></View>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
      {collection.boxes.map(b => <Button key={b.id} primary={b.id === box.id} disabled={state.busy} onPress={() => state.selectBox(b.id)}>{b.name}</Button>)}
    </ScrollView>
    <View style={[ui.row, { gap: 8 }]}><Button onPress={() => setEditor('create-box')}>+ Create box</Button><Button onPress={() => setEditor('box')}>Box settings</Button><Button primary={finding} onPress={() => { setFinding(!finding); setSearch(''); setGame(''); }}>{finding ? 'Close search' : 'Find Pokémon'}</Button>{selected && <><Button onPress={() => setEditor('edit')}>Edit Pokémon</Button><Button primary={!!moving} disabled={state.busy} onPress={() => setMoving(moving ? '' : selected.id)}>{moving ? 'Cancel move' : 'Move Pokémon'}</Button></>}</View>
    {!!moving && <View accessibilityLiveRegion="polite" style={{ padding: 12, backgroundColor: colors.board, gap: 5 }}><PixelText>Moving {displayName(byID.get(moving)!)}. Choose a box or party slot.</PixelText><PixelText style={{ fontSize: 14 }}>Occupied slots swap. Use Tab and Enter on a keyboard, or tap a slot.</PixelText></View>}
    <View style={{ gap: 8 }}><PixelText style={ui.label}>PARTY / {collection.partyIDs.length} OF 6</PixelText><View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: 6 }, (_, i) => { const p = byID.get(collection.partyIDs[i] ?? ''); return <Pressable key={i} accessibilityRole="button" accessibilityLabel={moving ? `Move to party slot ${i + 1}` : p ? `Select ${displayName(p)} in party` : `Empty party slot ${i + 1}`} disabled={state.busy || (!moving && !p)} onPress={async () => { if (moving) { if (await state.move(moving, { partySlot: i })) setMoving(''); } else if (p) await state.select(p.id); }} style={{ flex: 1, aspectRatio: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: p?.id === selected?.id ? colors.board : colors.panel, alignItems: 'center', justifyContent: 'center' }}>{p ? <Sprite pokemon={p} size={Math.min(64, (boardWidth - 30) / 6 - 8)} /> : <PixelText style={{ color: colors.border }}>·</PixelText>}</Pressable>; })}
    </View></View>
    <Button disabled={state.busy} onPress={() => setEditor('new')}>Start a new collection</Button>
    {editor === 'add' && <PokemonEditor boxID={box.id} onClose={() => setEditor(null)} />}
    {editor === 'edit' && selected && <PokemonEditor record={selected} boxID={box.id} onClose={() => setEditor(null)} />}
    {(editor === 'box' || editor === 'create-box') && <BoxEditor box={editor === 'box' ? box : undefined} onClose={() => setEditor(null)} />}
    {editor === 'new' && <EditorSheet title="Start a new collection" onClose={() => setEditor(null)}><PixelText>Create an empty PC for your own Pokémon. The current collection of {collection.records.length} Pokémon will be archived locally, and you can undo this action. Export a backup to keep an accessible copy.</PixelText><Button primary disabled={state.busy} onPress={async () => { if (await state.startEmpty()) { setMoving(''); setSearch(''); setGame(''); setEditor(null); } }}>Create empty collection</Button></EditorSheet>}
  </Panel>;
}
