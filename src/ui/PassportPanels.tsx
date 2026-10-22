import React, { useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  awardName,
  catalog,
  displayName,
  displayedAwards,
  earningLocation,
  recordedVisits,
  sortGames,
  gameName,
  generation,
} from '../domain/catalog';
import {
  compatibleGames,
  generationEarningGames,
  transferCheck,
} from '../domain/rules';
import type { Pokemon } from '../domain/model';
import { editPokemon } from '../domain/organisation';
import { patchPassport } from '../domain/passport';
import { useCollection } from '../state/CollectionProvider';
import { useTheme } from './theme';
import { Art, Button, GameLabel, Panel, PixelText, Sprite } from './primitives';
import { ChoiceField, EditorSheet, Field } from './Editors';
export function PassportHero({ pokemon: p }: { pokemon: Pokemon }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        paddingVertical: 12,
      }}
    >
      <Sprite pokemon={p} size={70} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <PixelText style={{ fontSize: 25 }}>{displayName(p)}</PixelText>
          {p.shiny && <Art name="shiny-dark" label="Shiny" size={17} />}
        </View>
        <PixelText style={{ fontSize: 14, color: colors.muted }}>
          {p.titleText || catalog.titles[p.title] || 'No title equipped'}
        </PixelText>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          Lv. {p.currentlevel} · {displayedAwards(p).length} awards
        </PixelText>
      </View>
    </View>
  );
}
export function GamePair({ pokemon: p }: { pokemon: Pokemon }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 18,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
    >
      {[
        ['ORIGIN', p.origingame],
        ['CURRENT', p.currentgame],
      ].map(([label, game]) => (
        <View key={label} style={{ flex: 1, gap: 12 }}>
          <PixelText style={{ fontSize: 12, color: colors.muted }}>
            {label}
          </PixelText>
          <GameLabel game={game!} />
        </View>
      ))}
    </View>
  );
}
export function AwardGrid({
  ids,
  onSelect,
}: {
  ids: string[];
  onSelect(id: string): void;
}) {
  const { width } = useWindowDimensions(),
    { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {ids.map((id) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`Details for ${awardName(id)}`}
          onPress={() => onSelect(id)}
          style={{
            width: width < 360 ? '18.5%' : '15.4%',
            minHeight: 55,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
          }}
        >
          <Art name={'award-' + id} size={34} />
        </Pressable>
      ))}
    </View>
  );
}
export function TransferStatus({
  pokemon: p,
  onPress,
}: {
  pokemon: Pokemon;
  onPress(): void;
}) {
  const t = transferCheck(p.currentgame, p),
    { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Review transfer check"
      onPress={onPress}
      style={{
        paddingVertical: 14,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <PixelText
        style={{
          fontSize: 26,
          color:
            t.lastChance.length || t.warnings.length
              ? colors.warningInk
              : colors.accent,
        }}
      >
        {t.isSafe ? '✓' : '!'}
      </PixelText>
      <View style={{ flex: 1, gap: 4 }}>
        <PixelText
          style={{
            fontSize: 17,
            color: t.isSafe ? colors.accent : colors.warningInk,
          }}
        >
          {!t.canAssess
            ? 'Set a compatible current game'
            : !t.nextGeneration
              ? 'No compatible later generation'
              : t.lastChance.length
                ? `Not safe to leave Gen ${roman(t.generation)}`
                : t.warnings.length
                  ? 'Transfer eligibility needs checking'
                  : `Safe to leave Gen ${roman(t.generation)}`}
        </PixelText>
        <PixelText style={{ fontSize: 13, color: colors.warningInk }}>
          {t.lastChance.length
            ? `${t.lastChance.length} last-chance ${t.lastChance.length === 1 ? 'ribbon remains' : 'ribbons remain'}`
            : t.warnings[0] || 'Generation-wide transfer check'}
        </PixelText>
      </View>
      <PixelText style={{ fontSize: 14, color: colors.warningInk }}>
        Review ›
      </PixelText>
    </Pressable>
  );
}
export function PassportOverview({ pokemon: p }: { pokemon: Pokemon }) {
  const router = useRouter(),
    { colors, ui } = useTheme();
  const [selected, setSelected] = useState(''),
    [owned, setOwned] = useState(false),
    [transfer, setTransfer] = useState(false);
  return (
    <View style={{ gap: 22 }}>
      <GamePair pokemon={p} />
      <View style={ui.between}>
        <PixelText style={{ fontSize: 22 }}>Owned awards</PixelText>
        <Button onPress={() => setOwned(true)}>
          {String(displayedAwards(p).length) + ' ›'}
        </Button>
      </View>
      <AwardGrid ids={displayedAwards(p).slice(0, 12)} onSelect={setSelected} />
      {!!selected && (
        <Panel style={{ padding: 14, gap: 10 }}>
          <View style={ui.between}>
            <PixelText style={{ fontSize: 20, flex: 1 }}>
              {awardName(selected)}
            </PixelText>
            <Button onPress={() => setSelected('')}>×</Button>
          </View>
          <PixelText>
            {selected && catalog.ribbons[selected]
              ? (require('../../assets/data/ribbon-rules.json').awards[selected]
                  ?.description ?? '')
              : ''}
          </PixelText>
          <Button
            onPress={() =>
              router.push({
                pathname: '/guides',
                params: { award: selected, game: p.currentgame },
              })
            }
          >
            Field guide ›
          </Button>
        </Panel>
      )}
      <TransferStatus pokemon={p} onPress={() => setTransfer(true)} />
      {owned && (
        <EditorSheet title="Owned awards" onClose={() => setOwned(false)}>
          <PassportHero pokemon={p} />
          <View style={ui.between}>
            <PixelText>Ribbons and marks</PixelText>
            <PixelText>{displayedAwards(p).length}</PixelText>
          </View>
          <AwardGrid
            ids={displayedAwards(p)}
            onSelect={(id) => {
              setOwned(false);
              setSelected(id);
            }}
          />
        </EditorSheet>
      )}
      {transfer && (
        <TransferSheet pokemon={p} onClose={() => setTransfer(false)} />
      )}
    </View>
  );
}
export function TransferSheet({
  pokemon: p,
  onClose,
}: {
  pokemon: Pokemon;
  onClose(): void;
}) {
  const state = useCollection(),
    { colors, ui } = useTheme();
  const t = transferCheck(p.currentgame, p),
    [game, setGame] = useState(''),
    [award, setAward] = useState(''),
    [met, setMet] = useState(
      p.metLevel === undefined ? '' : String(p.metLevel),
    );
  const later = compatibleGames(p).filter(
    (id) => generation(id) > generation(p.currentgame),
  );
  return (
    <EditorSheet title="Transfer check" onClose={onClose}>
      <PixelText>
        Gen {roman(t.generation)} → Gen {roman(t.nextGeneration)}
      </PixelText>
      <Panel
        style={{ backgroundColor: t.isSafe ? colors.board : colors.warning }}
      >
        <PixelText
          style={{ color: t.isSafe ? colors.accent : colors.warningInk }}
        >
          {t.lastChance.length
            ? `Not safe to leave Gen ${roman(t.generation)}`
            : t.warnings.length
              ? t.warnings[0]
              : t.isSafe
                ? 'Safe to transfer'
                : 'No compatible later generation'}
        </PixelText>
        <PixelText>{t.lastChance.length} last-chance ribbons remain</PixelText>
      </Panel>
      <PixelText style={ui.heading}>Earn before leaving</PixelText>
      {t.lastChance.map((id) => (
        <View key={id} style={{ gap: 8 }}>
          <View style={ui.between}>
            <Art name={'award-' + id} size={32} />
            <PixelText style={{ flex: 1 }}>{awardName(id)}</PixelText>
            <Button onPress={() => setAward(award === id ? '' : id)}>+</Button>
          </View>
          {award === id && (
            <View style={ui.row}>
              {generationEarningGames(id, p.currentgame, p).map((g) => (
                <Button
                  key={g}
                  disabled={state.busy}
                  art={`game-${g}-dark`}
                  onPress={() => state.change(p.id, id, g)}
                >
                  {gameName(g)}
                </Button>
              ))}
            </View>
          )}
        </View>
      ))}
      {!t.lastChance.length && (
        <PixelText>No last-chance ribbons remain.</PixelText>
      )}
      <PixelText style={ui.heading}>Can wait · {t.canWait.length}</PixelText>
      {t.canWait.map((id) => (
        <View key={id} style={ui.row}>
          <Art name={'award-' + id} size={22} />
          <PixelText>{awardName(id)}</PixelText>
        </View>
      ))}
      {!!t.warnings.length && (
        <>
          <Field label="Met level" value={met} onChange={setMet} numeric />
          <Button
            disabled={state.busy || !met.trim()}
            onPress={() => {
              const r = state.collection!.records.find((r) => r.id === p.id)!;
              state.edit(
                p.id,
                { ...p, metLevel: Number(met) },
                r.version.revision,
              );
            }}
          >
            Save met level
          </Button>
        </>
      )}
      <ChoiceField
        label="Move to game"
        game
        value={game}
        onChange={setGame}
        options={[
          { id: '', name: 'Choose…' },
          ...later.map((id) => ({ id, name: gameName(id) })),
        ]}
      />
      <Button
        primary
        disabled={!t.isSafe || !game || state.busy}
        onPress={() =>
          state.mutate((c, ctx) => {
            const r = c.records.find((r) => r.id === p.id)!;
            const currentCheck = transferCheck(
              r.pokemon.currentgame,
              r.pokemon,
            );
            if (
              !currentCheck.isSafe ||
              !compatibleGames(r.pokemon).includes(game) ||
              generation(game) <= generation(r.pokemon.currentgame)
            )
              throw new Error('Resolve the transfer check before moving.');
            const next = editPokemon(
              c,
              p.id,
              { ...r.pokemon, currentgame: game },
              r.version.revision,
              ctx,
            );
            return patchPassport(
              next,
              p.id,
              {
                visits: [
                  ...recordedVisits(r.pokemon),
                  { id: ctx.id + ':visit', game },
                ],
              },
              ctx.id,
              { ...ctx, id: ctx.id + ':visit' },
            );
          }, 'Transfer recorded. Saved on this device.')
        }
      >
        Move to selected game
      </Button>
      <Button disabled={!state.canUndo || state.busy} onPress={state.undo}>
        Undo last change
      </Button>
    </EditorSheet>
  );
}
export function roman(gen?: number) {
  return (
    ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][gen ?? 0] ||
    '?'
  );
}
