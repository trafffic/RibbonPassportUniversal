import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import * as Crypto from 'expo-crypto';
import { catalog, displayName, gameName, ruleData, sortGames } from '../domain/catalog';
import type { Box, PassportRecord, Pokemon } from '../domain/model';
import { blankPokemon, type PokemonDetails } from '../domain/organisation';
import { compatibleGames, transferCheck } from '../domain/rules';
import { useCollection } from '../state/CollectionProvider';
import { Art, Button, Panel, PixelText, Sprite } from './primitives';
import { colors, ui } from './theme';
import { wallpapers } from './wallpapers';

export function EditorSheet({ title, children, onClose }: React.PropsWithChildren<{ title: string; onClose(): void }>) {
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#1E2C1F99', padding: 16, justifyContent: 'center', alignItems: 'center' }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 680, maxHeight: '94%', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.ink }}>
        <View style={[ui.between, { padding: 16, borderBottomWidth: 1, borderColor: colors.border }]}><PixelText accessibilityRole="header" style={{ fontSize: 25 }}>{title}</PixelText><Button onPress={onClose}>Cancel</Button></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 18 }}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export function Field({ label, value, onChange, numeric = false }: { label: string; value: string; onChange(v: string): void; numeric?: boolean }) {
  return <View style={{ gap: 7, flexGrow: 1, flexBasis: 180 }}><PixelText style={ui.label}>{label.toUpperCase()}</PixelText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={ui.input} keyboardType={numeric ? 'number-pad' : 'default'} autoCapitalize={numeric ? 'none' : 'sentences'} /></View>;
}
export function ChoiceField({ label, value, options, onChange, game = false }: { label: string; value: string; options: { id: string; name: string }[]; onChange(v: string): void; game?: boolean }) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [limit, setLimit] = useState(30);
  const matches = useMemo(() => options.filter(o => `${o.name} ${o.id}`.toLowerCase().includes(search.toLowerCase())), [options, search]);
  return <View style={{ gap: 8 }}>
    <PixelText style={ui.label}>{label.toUpperCase()}</PixelText>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options.find(o => o.id === value)?.name ?? (value || 'Choose…')}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={[ui.between, { borderWidth: 1, borderColor: colors.border, padding: 12, minHeight: 48 }]}>
      <View style={[ui.row, { flex: 1 }]}>{game && value && <Art name={`game-${value}-light`} size={28} />}<PixelText>{options.find(o => o.id === value)?.name ?? (value || 'Choose…')}</PixelText></View><PixelText>{open ? '−' : '+'}</PixelText>
    </Pressable>
    {open && <View style={{ gap: 8, padding: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border }}>
      <TextInput accessibilityLabel={`Search ${label.toLowerCase()}`} placeholder="Search name, form or number…" placeholderTextColor={colors.muted} value={search} onChangeText={v => { setSearch(v); setLimit(30); }} style={ui.input} autoFocus />
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 250 }}>
        {matches.slice(0, limit).map(o => <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={`Choose ${o.name}`} onPress={() => { onChange(o.id); setOpen(false); setSearch(''); }} style={[ui.row, { padding: 10, minHeight: 46, backgroundColor: value === o.id ? colors.board : undefined, borderBottomWidth: 1, borderColor: colors.border }]}>
          {game && o.id && <Art name={`game-${o.id}-light`} size={26} />}<PixelText>{o.name}</PixelText>
        </Pressable>)}
        {!matches.length && <PixelText>No matches.</PixelText>}
        {matches.length > limit && <Button onPress={() => setLimit(limit + 50)}>Show more results</Button>}
      </ScrollView>
    </View>}
  </View>;
}
const speciesOptions = Object.entries(catalog.pokemon).sort((a, b) => (a[1].natdex ?? 9999) - (b[1].natdex ?? 9999)).map(([id, p]) => ({ id, name: `#${String(p.natdex ?? '?').padStart(4, '0')} ${p.name}${p.name.toLowerCase().replace(/[^a-z0-9]/g, '') !== id.replace(/[^a-z0-9]/g, '') ? ` · ${id}` : ''}` }));
// Catalogue group labels (e.g. ORAS) are headings, not an individual game's earning location.
const gameOptions = [{ id: '', name: 'Not set' }, ...sortGames(Object.keys(ruleData.games)).map(id => ({ id, name: gameName(id) }))];
export function PokemonEditor({ record, boxID, onClose }: { record?: PassportRecord; boxID: string; onClose(): void }) {
  const state = useCollection(), { width } = useWindowDimensions();
  const [draft, setDraft] = useState<Pokemon>(() => record?.pokemon ?? blankPokemon(Crypto.randomUUID()));
  const [level, setLevel] = useState(String(draft.currentlevel)), [met, setMet] = useState(draft.metLevel === undefined ? '' : String(draft.metLevel)), [size, setSize] = useState(draft.sizeScale === undefined ? '' : String(draft.sizeScale));
  const [error, setError] = useState('');
  const p = { ...draft, currentlevel: Number(level), metLevel: met.trim() ? Number(met) : undefined, sizeScale: size.trim() ? Number(size) : undefined };
  const update = <K extends keyof PokemonDetails>(key: K, val: PokemonDetails[K]) => setDraft(old => ({ ...old, [key]: val }));
  const compatible = !p.currentgame || compatibleGames(p, false).includes(p.currentgame);
  const transfer = transferCheck(p.currentgame, p);
  const save = async () => {
    setError('');
    const result = record ? await state.edit(record.id, p, record.version.revision) : await state.add(p, boxID);
    if (result) onClose(); else setError('Could not save. Check the details below and try again.');
  };
  return <EditorSheet title={record ? 'Edit Pokémon' : 'Add Pokémon'} onClose={onClose}>
    <View style={[ui.row, { backgroundColor: colors.paper, padding: 12 }]}>{draft.species && <Sprite pokemon={p} size={width < 400 ? 64 : 88} />}<View style={{ flex: 1 }}><PixelText style={{ fontSize: 26 }}>{draft.species ? displayName(draft) : 'Your next companion'}</PixelText><PixelText style={ui.muted}>{record ? 'Identity and earning history stay with this Pokémon.' : 'Choose a species, then start their passport.'}</PixelText></View></View>
    <ChoiceField label="Species / form" value={draft.species} options={speciesOptions} onChange={id => setDraft(old => ({ ...old, species: id, gmax: false, shadow: false }))} />
    <Field label="Nickname" value={draft.nickname} onChange={v => update('nickname', v)} />
    <View style={ui.row}><Field label="Level" value={level} onChange={setLevel} numeric /><Field label="Met level" value={met} onChange={setMet} numeric /><Field label="Size (0–255)" value={size} onChange={setSize} numeric /></View>
    <PixelText style={{ fontSize: 14, color: colors.muted }}>Leave unknown met level and size blank. These affect Footprint and size-mark eligibility.</PixelText>
    <View style={ui.row}><Button primary={draft.shiny} onPress={() => update('shiny', !draft.shiny)}>{draft.shiny ? 'Shiny: on' : 'Shiny: off'}</Button>{catalog.gmaxSpecies.includes(draft.species) && <Button primary={draft.gmax} onPress={() => update('gmax', !draft.gmax)}>{draft.gmax ? 'Gigantamax: on' : 'Gigantamax: off'}</Button>}<Button primary={draft.shadow} onPress={() => update('shadow', !draft.shadow)}>{draft.shadow ? 'Shadow origin: on' : 'Shadow origin: off'}</Button></View>
    <ChoiceField label="Gender" value={draft.gender} options={[{ id: '', name: 'Not specified' }, { id: 'male', name: 'Male' }, { id: 'female', name: 'Female' }]} onChange={v => update('gender', v)} />
    <ChoiceField label="Origin game" value={draft.origingame} options={gameOptions} onChange={v => update('origingame', v)} game />
    <ChoiceField label="Current game" value={draft.currentgame} options={gameOptions} onChange={v => update('currentgame', v)} game />
    {draft.species && <Panel style={{ backgroundColor: !compatible ? colors.warning : colors.paper, padding: 12 }}><PixelText style={ui.label}>RIBBON PLANNING</PixelText><PixelText>{!compatible ? 'This species or form is not compatible with the selected current game. Check your details.' : `${transfer.lastChance.length} last-chance awards in this generation. ${p.ribbons.length} recorded ribbons kept.`}</PixelText><PixelText style={{ fontSize: 14 }}>Saving details recalculates eligibility. Recorded ribbons and previous Journey stops remain in your passport; this does not record a transfer.</PixelText></Panel>}
    {!!error && <PixelText accessibilityRole="alert">{state.error || error}</PixelText>}
    <Button primary disabled={state.busy || !draft.species} onPress={save}>{record ? 'Save Pokémon' : 'Add to box'}</Button>
  </EditorSheet>;
}
export function BoxEditor({ box, onClose }: { box?: Box; onClose(): void }) {
  const state = useCollection();
  const [name, setName] = useState(box?.name ?? `Box ${String(state.collection!.boxes.length + 1).padStart(2, '0')}`), [wallpaper, setWallpaper] = useState(box?.wallpaper?.sunMoon ?? wallpapers[state.collection!.boxes.findIndex(b => b.id === box?.id) % wallpapers.length]?.id ?? 'sm01'), [error, setError] = useState('');
  return <EditorSheet title={box ? 'Box settings' : 'Create box'} onClose={onClose}>
    <Field label="Box name" value={name} onChange={setName} />
    {box && <><PixelText style={ui.label}>SUN / MOON WALLPAPER</PixelText><View style={[ui.row, { gap: 8 }]}>{wallpapers.map(w => <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`Wallpaper ${w.name}`} accessibilityState={{ selected: wallpaper === w.id }} onPress={() => setWallpaper(w.id)} style={{ width: '30%', flexGrow: 1, padding: 4, borderWidth: wallpaper === w.id ? 2 : 1, borderColor: wallpaper === w.id ? colors.ink : colors.border }}><w.Preview /><PixelText style={{ fontSize: 13, textAlign: 'center', padding: 4 }}>{w.name}</PixelText></Pressable>)}</View></>}
    {!!error && <PixelText accessibilityRole="alert">{state.error || error}</PixelText>}
    <Button primary disabled={state.busy} onPress={async () => {
      const result = box ? await state.updateBox(box.id, { name, wallpaper: { ...box.wallpaper, sunMoon: wallpaper } }) : await state.addBox(name);
      if (result) onClose(); else setError('Could not save this box.');
    }}>{box ? 'Save box' : 'Create box'}</Button>
  </EditorSheet>;
}
