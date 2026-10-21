import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { awardName, catalog, displayedAwards, earningLocation, gameName, ruleData, sortAwards } from '../domain/catalog';
import { earningGames, generationEarningGames, managedAwardIDs, transferCheck } from '../domain/rules';
import type { Pokemon } from '../domain/model';
import { useCollection } from '../state/CollectionProvider';
import { Art, Button, Panel, PixelText, Tag } from './primitives';
import { colors, ui } from './theme';

export function RibbonBoard({ pokemon: p, planner = false }: { pokemon: Pokemon; planner?: boolean }) {
  const state = useCollection(), { width } = useWindowDimensions();
  const [mode, setMode] = useState<'owned' | 'plan'>(planner ? 'plan' : 'owned');
  const [originals, setOriginals] = useState(false), [allGames, setAllGames] = useState(false), [search, setSearch] = useState('');
  const [selected, setSelected] = useState(''), [chosenGame, setChosenGame] = useState('');
  const transfer = useMemo(() => transferCheck(p.currentgame, p), [p]);
  const options = useMemo(() => Object.fromEntries(managedAwardIDs.map(id => [id, allGames ? earningGames(id, p) : p.ribbons.includes(id) ? [] : generationEarningGames(id, p.currentgame, p)])), [p, allGames]);
  const owned = originals ? sortAwards(p.ribbons) : displayedAwards(p);
  const ids = (mode === 'owned' ? owned : managedAwardIDs.filter(id => options[id]?.length)).filter(id => awardName(id).toLowerCase().includes(search.toLowerCase()));
  const memoryGroup = selected.startsWith('contest-memory-ribbon') ? 'contest' : selected.startsWith('battle-memory-ribbon') ? 'battle' : '';
  const represented = memoryGroup ? p.ribbons.filter(id => catalog.merges[id] === memoryGroup) : [];
  const showDetails = (id: string) => { setSelected(selected === id ? '' : id); setChosenGame(''); };
  const details = !!selected && ids.includes(selected) && <View testID="ribbon-details" style={{ borderWidth: 2, borderColor: colors.ink, padding: 18, gap: 14, backgroundColor: colors.paper }}>
      <View style={ui.between}><View style={ui.row}><Art name={`award-${selected}`} size={36} /><PixelText style={{ fontSize: 25 }}>{awardName(selected)}</PixelText></View><Button onPress={() => setSelected('')}>Close details</Button></View>
      <PixelText>{ruleData.awards[selected]?.description ?? 'No bundled description is available for this imported award.'}</PixelText>
      {mode === 'owned' ? <>
        {represented.length ? <>
          <PixelText>{represented.length} original ribbons represented. Their earning history is kept individually.</PixelText>
          {sortAwards(represented).map(id => <View key={id} style={ui.between}><PixelText>{awardName(id)}</PixelText><PixelText style={{ fontSize: 15, color: colors.muted }}>{earningLocation(p, id)}</PixelText></View>)}
          <Button onPress={() => { setOriginals(true); setSelected(''); }}>Edit original ribbon records</Button>
        </> : <>
          <PixelText>Earned in: {earningLocation(p, selected)}</PixelText>
          <Button disabled={state.busy} label={`Remove ${awardName(selected)}`} onPress={() => state.change(p.id, selected)}>Remove ribbon</Button>
        </>}
      </> : <>
        {transfer.lastChance.includes(selected) && <Tag>Last chance before leaving this generation</Tag>}
        <PixelText style={ui.label}>EARNED IN</PixelText>
        <View style={[ui.row, { gap: 8 }]}>{options[selected]?.map(game => <Button key={game} art={`game-${game}-light`} primary={chosenGame === game} onPress={() => setChosenGame(game)}>{gameName(game)}</Button>)}</View>
        <Button primary disabled={!chosenGame || state.busy} label={`Record ${awardName(selected)}`} onPress={async () => { await state.change(p.id, selected, chosenGame); setChosenGame(''); }}>Record ribbon</Button>
      </>}
    </View>;
  return <Panel style={{ padding: width < 600 ? 16 : 22 }}>
    <View style={ui.between}><PixelText style={ui.heading}>{planner ? 'Plan the next ribbon' : 'Ribbon case'}</PixelText><PixelText style={ui.label}>{displayedAwards(p).length} AWARDS OWNED</PixelText></View>
    <View style={ui.row}>
      <Button primary={mode === 'owned'} onPress={() => { setMode('owned'); setSelected(''); }}>Owned awards</Button>
      <Button primary={mode === 'plan'} onPress={() => { setMode('plan'); setSelected(''); }}>Plan next ribbon</Button>
    </View>
    <TextInput accessibilityLabel="Search ribbons" placeholder="Search ribbons…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={ui.input} />
    {mode === 'owned' ? <View style={{ gap: 10 }}>
      <PixelText style={{ fontSize: 16, color: colors.muted }}>Select an award for its description and earning location. Memory Ribbons combine older ribbons for display.</PixelText>
      <Button onPress={() => { setOriginals(!originals); setSelected(''); }}>{originals ? 'Show current ribbon case' : `Show original records (${p.ribbons.length})`}</Button>
    </View> : <>
      <View style={ui.row}>
        <Button primary={!allGames} onPress={() => { setAllGames(false); setSelected(''); }}>This generation</Button>
        <Button primary={allGames} onPress={() => { setAllGames(true); setSelected(''); }}>All reachable games</Button>
      </View>
      <PixelText style={{ fontSize: 16, color: colors.muted }}>Choose an award, then the game where you earned it. Recording an award never changes your current game.</PixelText>
    </>}
    {ids.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {ids.map(id => <React.Fragment key={id}><Pressable accessibilityRole="button" accessibilityLabel={`Details for ${awardName(id)}`} accessibilityState={{ expanded: selected === id }} onPress={() => showDetails(id)}
        style={({ pressed }) => ({ width: width < 600 ? '100%' : '48.8%', flexGrow: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: selected === id ? 2 : 1, borderColor: selected === id ? colors.ink : colors.border, backgroundColor: selected === id ? colors.board : colors.panel, opacity: pressed ? 0.7 : 1 })}>
        <Art name={`award-${id}`} size={30} />
        <View style={{ flex: 1, gap: 4 }}><PixelText>{awardName(id)}</PixelText><PixelText style={{ fontSize: 14, color: colors.muted }}>{mode === 'owned' ? memoryLabel(id, p) : transfer.lastChance.includes(id) ? 'Last chance this generation' : `${options[id]?.length ?? 0} earning games`}</PixelText></View>
      </Pressable>{selected === id && <View style={{ width: '100%' }}>{details}</View>}</React.Fragment>)}
    </View> : <PixelText>No {mode === 'owned' ? 'owned awards' : 'eligible ribbons'} match this view.</PixelText>}

  </Panel>;
}
function memoryLabel(id: string, p: Pokemon) {
  if (id.includes('-memory-ribbon')) return 'Automatic Memory Ribbon';
  return earningLocation(p, id);
}
