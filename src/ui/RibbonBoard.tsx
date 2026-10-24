import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  awardName,
  catalog,
  displayedAwards,
  earningLocation,
  gameName,
  ruleData,
  sortAwards,
} from '../domain/catalog';
import {
  assignableGames,
  compatibleGames,
  earningGames,
  generationEarningGames,
  optionalSizeMarks,
  transferCheck,
  unavailableReason,
} from '../domain/rules';
import { assignGame } from '../domain/collection';
import { sizeName } from '../domain/size-class';
import {
  nextPageSize,
  validPageSize,
  ribbonView,
  tileStatus,
  type RibbonCategory,
} from '../domain/ribbon-view';
import type { Pokemon } from '../domain/model';
import { useCollection } from '../state/CollectionProvider';
import { loadPreference, savePreference } from '../state/preference';
import { useTheme } from './theme';
import { Art, Button, GameLabel, Panel, PixelText } from './primitives';
import { EditorSheet, ChoiceField } from './Editors';
import {
  AwardGrid,
  roman,
  TransferSheet,
  TransferStatus,
} from './PassportPanels';
export function RibbonBoard({
  pokemon: p,
  planner = false,
}: {
  pokemon: Pokemon;
  planner?: boolean;
}) {
  const state = useCollection(),
    router = useRouter(),
    { colors, ui } = useTheme();
  const [game, setGame] = useState(p.currentgame),
    [earnable, setEarnable] = useState(true),
    [catalogue, setCatalogue] = useState(false),
    [category, setCategory] = useState<RibbonCategory>('All'),
    [size, setSize] = useState(12),
    [page, setPage] = useState(0),
    [sheet, setSheet] = useState(''),
    [selected, setSelected] = useState(''),
    [chosenGame, setChosenGame] = useState(''),
    [originals, setOriginals] = useState(false);
  useEffect(() => {
    let live = true;
    loadPreference('ribbons.pageSize').then(
      (value) => live && setSize(validPageSize(Number(value))),
    );
    return () => {
      live = false;
    };
  }, []);
  const check = transferCheck(game, p),
    ids = ribbonView(p, game, catalogue, earnable, category),
    pages = Math.max(1, Math.ceil(ids.length / size)),
    visiblePage = Math.min(page, pages - 1),
    owned = displayedAwards(p),
    selectedOwned = p.ribbons.includes(selected) || owned.includes(selected),
    memoryGroup = selected.startsWith('contest-memory-ribbon')
      ? 'contest'
      : selected.startsWith('battle-memory-ribbon')
        ? 'battle'
        : '',
    represented = memoryGroup
      ? p.ribbons.filter((id) => catalog.merges[id] === memoryGroup)
      : [],
    requiredSize = selected === 'mini-mark' ? 0 : selected === 'jumbo-mark' ? 255 : undefined,
    options = selected ? earningGames(selected, p) : [],
    assignOptions = selected ? assignableGames(p, selected) : [];
  const detail = (id: string) => {
    setSelected(id);
    setChosenGame('');
  };
  return (
    <View style={{ gap: 14 }}>
      <View style={ui.between}>
        <View style={{ gap: 4, flex: 1 }}>
          <GameLabel game={game} />
          <PixelText style={{ fontSize: 11, color: colors.muted }}>
            GEN {roman(ruleData.games[game]?.gen)} ·{' '}
            {game === p.currentgame ? 'Current game' : `Browsing, not its current game`}
          </PixelText>
        </View>
        <Button onPress={() => setSheet('games')}>Browse game</Button>
      </View>
      <View style={ui.between}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Earnable only"
          accessibilityState={{ checked: earnable }}
          onPress={() => {
            setEarnable(!earnable);
            setPage(0);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            minHeight: 40,
          }}
        >
          <View
            style={{
              padding: 9,
              minWidth: 42,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: earnable ? colors.board : colors.panel,
            }}
          >
            <PixelText style={{ fontSize: 13 }}>
              {earnable ? 'ON' : 'OFF'}
            </PixelText>
          </View>
          <PixelText style={{ fontSize: 14 }}>Earnable only</PixelText>
        </Pressable>
        <Button
          primary={catalogue}
          onPress={() => {
            setCatalogue(!catalogue);
            setCategory('All');
            setPage(0);
          }}
        >
          All games
        </Button>
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {(['All', 'Last chance', 'Later gens'] as const).map((value) => (
          <View key={value} style={{ flex: 1 }}>
            <Button
              primary={category === value}
              onPress={() => {
                setCategory(value);
                setPage(0);
              }}
            >
              {value}
            </Button>
          </View>
        ))}
      </View>
      <View style={ui.between}>
        <PixelText style={{ fontSize: 11, color: colors.muted }}>
          {ids.length} {ids.length === 1 ? 'match' : 'matches'} ·{' '}
          {catalogue ? 'All games' : 'This game'}
        </PixelText>
        <Button
          onPress={() => {
            const next = nextPageSize(size);
            setSize(next);
            savePreference('ribbons.pageSize', String(next));
            setPage(0);
          }}
          label={`${size} ribbons per page. Change to ${nextPageSize(size)}`}
        >{`${size} per page`}</Button>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          minHeight: 220,
        }}
      >
        {ids.slice(visiblePage * size, (visiblePage + 1) * size).map((id) => {
          const has = p.ribbons.includes(id) || owned.includes(id),
            last = check.lastChance.includes(id),
            status = tileStatus(p, id, game, { owned: has, lastChance: last });
          return (
            <View
              key={id}
              style={{
                flexGrow: 1,
                flexBasis: 104,
                minWidth: 96,
                maxWidth: 220,
                borderWidth: 1,
                borderColor: last
                  ? colors.warningInk
                  : has
                    ? colors.accent
                    : colors.border,
                backgroundColor: last
                  ? colors.warning
                  : has
                    ? colors.board
                    : colors.panel,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Details for ${awardName(id)}`}
                onPress={() => detail(id)}
                style={{ alignItems: 'center', padding: 6, gap: 3 }}
              >
                <Art name={'award-' + id} size={40} />
                <PixelText
                  numberOfLines={2}
                  style={{
                    fontSize: 13,
                    textAlign: 'center',
                    color: last ? colors.warningInk : colors.ink,
                  }}
                >
                  {awardName(id)}
                </PixelText>
                <PixelText
                  style={{
                    fontSize: 11,
                    color: last
                      ? colors.warningInk
                      : has
                        ? colors.accent
                        : colors.muted,
                  }}
                >
                  {status.optional && !has
                    ? `${status.label} · OPT`
                    : status.label}
                </PixelText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  status.action === 'record'
                    ? `Record ${awardName(id)} in ${gameName(game)}`
                    : status.action === 'remove'
                      ? `Remove ${awardName(id)}`
                      : `Open ${awardName(id)}`
                }
                disabled={state.busy}
                onPress={() =>
                  status.action === 'record'
                    ? state.change(p.id, id, game)
                    : status.action === 'remove'
                      ? state.change(p.id, id)
                      : detail(id)
                }
                style={{
                  borderTopWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 6,
                  alignItems: 'center',
                  opacity: state.busy ? 0.5 : 1,
                }}
              >
                <PixelText style={{ fontSize: 13 }}>
                  {status.action === 'record'
                    ? '+ Record'
                    : status.action === 'remove'
                      ? '− Remove'
                      : 'Details ›'}
                </PixelText>
              </Pressable>
            </View>
          );
        })}
        {!ids.length && (
          <PixelText style={{ color: colors.muted }}>
            {game
              ? 'Nothing left to earn here. Try All games or Later gens.'
              : 'Set a current game to choose ribbons.'}
          </PixelText>
        )}
      </View>
      <View style={ui.between}>
        <Button
          disabled={visiblePage === 0}
          onPress={() => setPage(visiblePage - 1)}
        >
          ‹ Previous
        </Button>
        <PixelText style={{ fontSize: 13 }}>
          Page {visiblePage + 1}/{pages}
        </PixelText>
        <Button
          disabled={visiblePage + 1 >= pages}
          onPress={() => setPage(visiblePage + 1)}
        >
          Next ›
        </Button>
      </View>
      <TransferStatus
        pokemon={{ ...p, currentgame: game }}
        onPress={() => setSheet('transfer')}
      />
      <View style={ui.row}>
        <Button
          onPress={() => setSheet('owned')}
        >{`Owned (${owned.length})`}</Button>
        <Button onPress={() => setSheet('size')}>Size marks</Button>
      </View>
      {sheet === 'games' && (
        <EditorSheet title="Browse game" onClose={() => setSheet('')}>
          <ChoiceField
            label="Game"
            game
            value={game}
            onChange={(g) => {
              setGame(g);
              setPage(0);
              setSheet('');
            }}
            options={compatibleGames(p).map((id) => ({
              id,
              name: gameName(id),
            }))}
          />
        </EditorSheet>
      )}
      {sheet === 'transfer' && (
        <TransferSheet pokemon={p} from={game} onClose={() => setSheet('')} />
      )}
      {sheet === 'size' && (
        <EditorSheet title="Size marks" close="Done" onClose={() => setSheet('')}>
          <PixelText>
            Choose a mark to confirm its size and record the game where it was earned.
          </PixelText>
          {optionalSizeMarks.map((id) => (
            <Button
              key={id}
              art={'award-' + id}
              label={`Details for ${awardName(id)}`}
              onPress={() => {
                setSheet('');
                detail(id);
              }}
            >
              {awardName(id)}{p.ribbons.includes(id) ? ' · Owned' : ''}
            </Button>
          ))}
        </EditorSheet>
      )}
      {sheet === 'owned' && (
        <EditorSheet title="Owned awards" close="Done" onClose={() => setSheet('')}>
          <PixelText>{owned.length} awards owned</PixelText>
          <Button onPress={() => setOriginals(!originals)}>
            {originals
              ? 'Show current ribbon case'
              : `Show original records (${p.ribbons.length})`}
          </Button>
          <AwardGrid
            ids={originals ? sortAwards(p.ribbons) : owned}
            onSelect={(id) => {
              setSheet('');
              detail(id);
            }}
          />
        </EditorSheet>
      )}
      {!!selected && (
        <EditorSheet
          title={awardName(selected)}
          close="Done"
          onClose={() => setSelected('')}
        >
          <View style={ui.row}>
            <Art name={'award-' + selected} size={40} />
            <PixelText style={{ fontSize: 22 }}>
              {awardName(selected)}
            </PixelText>
          </View>
          <PixelText>
            {ruleData.awards[selected]?.description ??
              'No bundled description is available for this imported award.'}
          </PixelText>
          {selectedOwned ? (
            <>
              {represented.length ? (
                <>
                  <PixelText>
                    {represented.length} original ribbons represented. Their
                    earning history is kept individually.
                  </PixelText>
                  {sortAwards(represented).map((id) => (
                    <View key={id} style={ui.between}>
                      <PixelText style={{ fontSize: 14 }}>
                        {awardName(id)}
                      </PixelText>
                      <PixelText style={{ fontSize: 13, color: colors.muted }}>
                        {earningLocation(p, id)}
                      </PixelText>
                      <Button
                        disabled={state.busy}
                        onPress={() => state.change(p.id, id)}
                      >
                        Remove
                      </Button>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <PixelText>
                    Earned in: {earningLocation(p, selected)}
                  </PixelText>
                  {!!assignOptions.length && (
                    <>
                      <PixelText style={ui.label}>SET GAME</PixelText>
                      <View style={ui.row}>
                        {assignOptions.map((g) => (
                          <Button
                            key={g}
                            art={`game-${g}-dark`}
                            disabled={state.busy}
                            label={`Set game ${gameName(g)}`}
                            onPress={async () => {
                              if (
                                await state.mutate(
                                  (c, context) =>
                                    assignGame(c, p.id, selected, g, context),
                                  'Earning game saved.',
                                )
                              )
                                setSelected('');
                            }}
                          >
                            {gameName(g)}
                          </Button>
                        ))}
                      </View>
                    </>
                  )}
                  <Button
                    disabled={state.busy}
                    label={`Remove ${awardName(selected)}`}
                    onPress={async () => {
                      if (await state.change(p.id, selected)) setSelected('');
                    }}
                  >
                    Remove ribbon
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {requiredSize !== undefined && (
                <>
                  <PixelText>Recorded size: {sizeName(p.sizeScale)}</PixelText>
                  {p.sizeScale !== requiredSize && (
                    <>
                      <PixelText>
                        {awardName(selected)} requires {sizeName(requiredSize)} size ({requiredSize}).
                        {' '}Confirm this Pokémon has that size before recording the mark.
                      </PixelText>
                      <Button
                        disabled={state.busy}
                        onPress={async () => {
                          const record = state.collection?.records.find((r) => r.id === p.id);
                          if (record) await state.edit(p.id,
                            { ...record.pokemon, sizeScale: requiredSize }, record.version.revision);
                        }}
                      >
                        Confirm {sizeName(requiredSize)} size
                      </Button>
                    </>
                  )}
                </>
              )}
              <PixelText style={ui.label}>EARNED IN</PixelText>
              <View style={ui.row}>
                {options.map((g) => (
                  <Button
                    key={g}
                    art={`game-${g}-dark`}
                    primary={chosenGame === g}
                    onPress={() => setChosenGame(g)}
                  >
                    {gameName(g)}
                  </Button>
                ))}
              </View>
              {!options.length && (requiredSize === undefined || p.sizeScale === requiredSize) && (
                <PixelText>
                  {unavailableReason(selected, game, p) ||
                    'This award cannot be earned manually in a reachable game.'}
                </PixelText>
              )}
              <Button
                primary
                disabled={!chosenGame || state.busy}
                label={`Record ${awardName(selected)}`}
                onPress={async () => {
                  if (await state.change(p.id, selected, chosenGame))
                    setSelected('');
                }}
              >
                Record ribbon
              </Button>
            </>
          )}
          <Button
            onPress={() => {
              setSelected('');
              router.push({
                pathname: '/guides',
                params: { award: selected, game },
              });
            }}
          >
            Field guide ›
          </Button>
        </EditorSheet>
      )}
    </View>
  );
}
