import React, { useRef, useState } from 'react';
import { View, Pressable, ScrollView, useWindowDimensions } from 'react-native';
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
import { guidesFor } from '../domain/community';
import { useCollection } from '../state/CollectionProvider';
import { useTheme } from './theme';
import { Art, Button, GameLabel, Panel, PixelText, Sprite } from './primitives';
import { ChoiceField, EditorSheet, Field } from './Editors';
import { bubblePlacement, type Rect } from './bubble-placement';
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
  selected,
}: {
  ids: string[];
  onSelect(id: string, anchor?: Rect): void;
  selected?: string;
}) {
  const { width } = useWindowDimensions(),
    { colors } = useTheme(),
    rects = useRef<Record<string, Rect>>({});
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {ids.map((id) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`Details for ${awardName(id)}`}
          accessibilityState={{ selected: selected === id }}
          onLayout={(e) => {
            rects.current[id] = e.nativeEvent.layout;
          }}
          onPress={() => onSelect(id, rects.current[id])}
          style={{
            width: width < 360 ? '18.5%' : '15.4%',
            minHeight: 55,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: selected === id ? colors.accent : 'transparent',
            backgroundColor: selected === id ? colors.panel : 'transparent',
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
function RibbonDescription({
  awardID,
  onGuide,
  onHeight,
}: {
  awardID: string;
  onGuide(): void;
  onHeight?(height: number): void;
}) {
  const { colors } = useTheme(),
    description =
      require('../../assets/data/ribbon-rules.json').awards[awardID]
        ?.description ?? 'No in-game description available.';
  return (
    <View onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}>
      <View
        style={{
          padding: 10,
          backgroundColor: colors.board,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <PixelText style={{ fontSize: 17 }}>{awardName(awardID)}</PixelText>
      </View>
      <PixelText style={{ padding: 12 }}>{description}</PixelText>
      {guidesFor(awardID).length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Field guide"
          onPress={onGuide}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <PixelText style={{ fontSize: 14 }}>Field guide ›</PixelText>
        </Pressable>
      )}
    </View>
  );
}
export function RibbonBubble({
  awardID,
  anchor,
  container,
  onGuide,
}: {
  awardID: string;
  anchor: Rect;
  container: { width: number; height: number };
  onGuide(): void;
}) {
  const { colors } = useTheme(),
    [height, setHeight] = useState(120),
    place = bubblePlacement(container, anchor, height);
  return (
    <View
      accessibilityLabel="Ribbon description"
      style={{
        position: 'absolute',
        left: place.frame.x,
        top: place.frame.y,
        width: place.frame.width,
        height: place.frame.height,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <ScrollView>
          <RibbonDescription
            awardID={awardID}
            onGuide={onGuide}
            onHeight={setHeight}
          />
        </ScrollView>
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: place.tipX - 5,
          [place.above ? 'bottom' : 'top']: -6,
          width: 10,
          height: 10,
          transform: [{ rotate: '45deg' }],
          backgroundColor: place.above ? colors.panel : colors.board,
          borderColor: colors.border,
          [place.above ? 'borderRightWidth' : 'borderLeftWidth']: 1,
          [place.above ? 'borderBottomWidth' : 'borderTopWidth']: 1,
        }}
      />
    </View>
  );
}
export function PassportOverview({ pokemon: p }: { pokemon: Pokemon }) {
  const router = useRouter(),
    { colors, ui } = useTheme();
  const [selected, setSelected] = useState(''),
    [anchor, setAnchor] = useState<Rect | null>(null),
    [gridAt, setGridAt] = useState({ x: 0, y: 0 }),
    [size, setSize] = useState({ width: 0, height: 0 }),
    [owned, setOwned] = useState(false),
    [gallery, setGallery] = useState(''),
    [transfer, setTransfer] = useState(false);
  const close = () => {
    setSelected('');
    setAnchor(null);
  };
  return (
    <View style={{ gap: 22 }} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {!!selected && (
        <Pressable
          accessibilityLabel="Hide description"
          onPress={close}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}
      <GamePair pokemon={p} />
      <View style={ui.between}>
        <PixelText style={{ fontSize: 22 }}>Owned awards</PixelText>
        <Button
          onPress={() => {
            close();
            setOwned(true);
          }}
        >
          {String(displayedAwards(p).length) + ' ›'}
        </Button>
      </View>
      <View
        onLayout={(e) =>
          setGridAt({
            x: e.nativeEvent.layout.x,
            y: e.nativeEvent.layout.y,
          })
        }
      >
        <AwardGrid
          ids={displayedAwards(p).slice(0, 12)}
          selected={selected}
          onSelect={(id, rect) => {
            if (id === selected || !rect) return close();
            setSelected(id);
            setAnchor({
              ...rect,
              x: rect.x + gridAt.x,
              y: rect.y + gridAt.y,
            });
          }}
        />
      </View>
      <TransferStatus pokemon={p} onPress={() => setTransfer(true)} />
      {!!selected && !!anchor && (
        <RibbonBubble
          key={selected}
          awardID={selected}
          anchor={anchor}
          container={size}
          onGuide={() =>
            router.push({
              pathname: '/guides',
              params: { award: selected, game: p.currentgame },
            })
          }
        />
      )}
      {owned && (
        <EditorSheet
          title="Owned awards"
          onClose={() => {
            setOwned(false);
            setGallery('');
          }}
        >
          <PassportHero pokemon={p} />
          <View style={ui.between}>
            <PixelText>Ribbons and marks</PixelText>
            <PixelText>{displayedAwards(p).length}</PixelText>
          </View>
          <AwardGrid
            ids={displayedAwards(p)}
            selected={gallery}
            onSelect={(id) => setGallery(id === gallery ? '' : id)}
          />
          {!!gallery && (
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <RibbonDescription
                awardID={gallery}
                onGuide={() => {
                  setOwned(false);
                  router.push({
                    pathname: '/guides',
                    params: { award: gallery, game: p.currentgame },
                  });
                }}
              />
            </View>
          )}
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
