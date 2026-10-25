import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Pokemon } from '../domain/model';
import { awardName, gameName } from '../domain/catalog';
import { earningGames, managedAwardIDs } from '../domain/rules';
import { patchPassport } from '../domain/passport';
import { useCollection } from '../state/CollectionProvider';
import { ChoiceField, EditorSheet } from './Editors';
import { Button, PixelText } from './primitives';
import { useTheme } from './theme';

export function RibbonGoal({ pokemon: p, compact = false }: { pokemon: Pokemon; compact?: boolean }) {
  const state = useCollection(), { colors } = useTheme();
  const [open, setOpen] = useState(false), [award, setAward] = useState(''), [game, setGame] = useState(''),
    [expected, setExpected] = useState('');
  const goal = p.ribbonGoal, completed = !!goal && p.ribbons.includes(goal.award);
  const choices = managedAwardIDs.filter(id => earningGames(id, p).length).map(id => ({ id, name: awardName(id) }));
  const games = earningGames(award, p);
  const save = async (value: Pokemon['ribbonGoal']) => {
    if (await state.mutate((c, ctx) => patchPassport(c, p.id, { ribbonGoal: value }, expected, ctx), value ? 'Ribbon goal pinned.' : 'Ribbon goal cleared.')) setOpen(false);
  };
  const edit = () => {
    setAward(completed ? '' : goal?.award ?? ''); setGame(completed ? '' : goal?.game ?? '');
    setExpected(state.collection!.records.find(r => r.id === p.id)!.version.revision); setOpen(true);
  };
  const summary = goal ? `${completed ? '✓ Goal completed' : '★ Next goal'}: ${awardName(goal.award)} · ${gameName(goal.game)}` : '';
  return <View style={{ gap: 6 }}>
    {compact ? <Pressable accessibilityRole="button" accessibilityLabel={goal ? 'Change ribbon goal' : 'Set ribbon goal'} onPress={edit} style={{ minHeight: 24, justifyContent: 'center' }}>
      <PixelText testID={goal ? 'ribbon-goal' : undefined} style={{ fontSize: 12, color: colors.accent }}>{summary || 'Set ribbon goal ›'}</PixelText>
    </Pressable> : <>
      {goal && <PixelText testID="ribbon-goal" style={{ fontSize: 13, color: completed ? colors.accent : colors.ink }}>{summary}</PixelText>}
      <Button label={goal ? 'Change ribbon goal' : 'Set ribbon goal'} onPress={edit}>{goal ? 'Change goal' : 'Set ribbon goal'}</Button>
    </>}
    {goal && !completed && !earningGames(goal.award, p).includes(goal.game) && <PixelText style={{ fontSize: 13, color: colors.warningInk }}>Review this goal: the selected game or requirements no longer match.</PixelText>}
    {open && <EditorSheet title="Ribbon goal" onClose={() => setOpen(false)}>
      <PixelText>Pin a ribbon or mark you can earn next, and the game you plan to earn it in.</PixelText>
      <ChoiceField label="Goal ribbon or mark" value={award} options={[{ id: '', name: 'Choose an award' }, ...choices]}
        onChange={id => { setAward(id); setGame(''); }} />
      <ChoiceField key={award} label="Goal earning game" value={game} options={[{ id: '', name: 'Choose a game' }, ...games.map(id => ({ id, name: gameName(id) }))]} onChange={setGame} game />
      {!choices.length && <PixelText>No unowned awards currently match this Pokémon’s details.</PixelText>}
      <Button primary disabled={state.busy || !award || !games.includes(game)} onPress={() => save({ award, game })}>Pin ribbon goal</Button>
      {goal && <Button disabled={state.busy} onPress={() => save(null)}>Clear ribbon goal</Button>}
    </EditorSheet>}
  </View>;
}
