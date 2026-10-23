import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  awardName,
  earningLocation,
  gameName,
  generation,
  recordedVisits,
  sortAwards,
} from '../domain/catalog';
import type { Pokemon } from '../domain/model';
import { useTheme } from './theme';
import { Art, Button, GameLabel, PixelText } from './primitives';
import { roman } from './PassportPanels';
import { gameColour } from '../domain/game-colours';
import { usePassportLink } from './usePassportLink';
export function Journey({
  pokemon: p,
  compact = false,
}: {
  pokemon: Pokemon;
  compact?: boolean;
}) {
  const passport = usePassportLink();
  const { colors, ui, dark } = useTheme(),
    router = useRouter(),
    visits = recordedVisits(p);
  const [group, setGroup] = useState<'Games' | 'Generations'>('Games'),
    [page, setPage] = useState(0),
    [chosen, setChosen] = useState(p.currentgame);
  const generations = [...new Set(visits.map((v) => generation(v.game)))].sort(
      (a, b) => a - b,
    ),
    items =
      group === 'Games'
        ? visits.map((v) => ({
            id: v.game,
            gen: generation(v.game),
            title: gameName(v.game),
            game: v.game,
          }))
        : generations.map((gen) => ({
            id: String(gen),
            gen,
            title: 'Generation ' + roman(gen),
            game: visits.find((v) => generation(v.game) === gen)?.game ?? '',
          }));
  const active = items.find((i) => i.id === chosen) || items[0],
    awards = sortAwards(
      p.ribbons.filter((id) =>
        group === 'Games'
          ? p.earnedGames?.[id] === active?.game
          : p.earnedGenerations?.[id] === active?.gen ||
            generation(p.earnedGames?.[id] ?? '') === active?.gen,
      ),
    );
  const stop = (section: string) =>
    router.push({ pathname: '/notebook/[id]', params: { id: p.id, section } });
  return (
    <View style={{ gap: 14 }}>
      {!compact && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {['Milestones', 'Memories', 'Move Dex', 'Field guides'].map(
            (section) => (
              <View key={section} style={{ width: '49%' }}>
                <Button
                  onPress={() =>
                    section === 'Field guides'
                      ? router.push({
                          pathname: '/guides',
                          params: { game: p.currentgame },
                        })
                      : stop(section)
                  }
                >
                  {section}
                </Button>
              </View>
            ),
          )}
        </View>
      )}
      <View style={ui.between}>
        <PixelText style={{ fontSize: compact ? 22 : 25 }}>
          Stamp album
        </PixelText>
        {!compact && (
          <Button onPress={() => stop('visits')}>Edit visits</Button>
        )}
      </View>
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        {items.length} {group.toLowerCase()}
      </PixelText>
      {!compact && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['Generations', 'Games'] as const).map((g) => (
            <View key={g} style={{ flex: 1 }}>
              <Button
                primary={group === g}
                onPress={() => {
                  setGroup(g);
                  setPage(0);
                  setChosen('');
                }}
              >
                {g}
              </Button>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.slice(page * 6, page * 6 + 6).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Visit ${item.title}`}
            accessibilityState={{ selected: active?.id === item.id }}
            onPress={() => setChosen(item.id)}
            style={{
              width: compact ? '47%' : '31.8%',
              minHeight: 140,
              padding: 9,
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: active?.id === item.id ? 2 : 1,
              borderStyle: active?.id === item.id ? 'solid' : 'dashed',
              borderColor:
                active?.id === item.id ? colors.accent : colors.border,
              backgroundColor: colors.panel,
              gap: 14,
            }}
          >
            <PixelText style={{ fontSize: 11 }}>
              GEN {roman(item.gen)}
            </PixelText>
            <Art name={`game-${item.game}-dark`} size={28} />
            <PixelText
              style={{
                fontSize: 14,
                textAlign: 'center',
                color: gameColour(item.game, dark),
              }}
            >
              {item.title}
            </PixelText>
            <PixelText style={{ fontSize: 12, color: colors.muted }}>
              {item.game === p.origingame && item.game === p.currentgame
                ? 'Origin · Current'
                : item.game === p.origingame
                  ? 'Origin'
                  : item.game === p.currentgame
                    ? 'Current'
                    : 'Visited'}
            </PixelText>
          </Pressable>
        ))}
      </View>
      {items.length > 6 && (
        <View style={ui.between}>
          <Button disabled={!page} onPress={() => setPage(page - 1)}>
            ‹ Previous
          </Button>
          <PixelText style={{ fontSize: 13 }}>
            Stamps {page + 1}/{Math.ceil(items.length / 6)}
          </PixelText>
          <Button
            disabled={(page + 1) * 6 >= items.length}
            onPress={() => setPage(page + 1)}
          >
            Next ›
          </Button>
        </View>
      )}
      {!compact && active && (
        <View
          style={{
            padding: 14,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.panel,
          }}
        >
          <GameLabel game={active.game} />
          <PixelText>{awards.length} earned</PixelText>
          {awards.map((id) => (
            <View key={id} style={ui.row}>
              <Art name={'award-' + id} size={25} />
              <PixelText>{awardName(id)}</PixelText>
            </View>
          ))}
          {!awards.length && (
            <PixelText style={{ fontSize: 14, color: colors.muted }}>
              No confirmed earning records in this stop.
            </PixelText>
          )}
        </View>
      )}
      {compact ? (
        <Button
          onPress={() =>
            router.push(passport(p.id, 'journey'))
          }
        >
          Journey ›
        </Button>
      ) : (
        <View style={{ gap: 8 }}>
          <PixelText style={{ fontSize: 20 }}>
            Earning game not recorded
          </PixelText>
          {sortAwards(p.ribbons.filter((id) => !p.earnedGames?.[id])).map(
            (id) => (
              <View key={id} style={ui.between}>
                <PixelText style={{ fontSize: 14 }}>{awardName(id)}</PixelText>
                <PixelText style={{ fontSize: 13, color: colors.muted }}>
                  {earningLocation(p, id)}
                </PixelText>
              </View>
            ),
          )}
        </View>
      )}
    </View>
  );
}
