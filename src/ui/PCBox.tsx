import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  View,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useCollection } from '../state/CollectionProvider';
import { displayName, displayedAwards, gameName } from '../domain/catalog';
import { createBox } from '../domain/organisation';
import { deletePokemon } from '../domain/passport';
import { Art, Button, PixelText, Sprite } from './primitives';
import { BoxEditor, EditorSheet, PokemonEditor } from './Editors';
import { BackupPanel } from './BackupPanel';
import { ExportPokemon } from './ExportPokemon';
import { pcMetrics as m, wallpapers } from './wallpapers';
import { useTheme } from './theme';
export function PCBox({
  kind = 'ribbon',
  compact = false,
}: {
  kind?: 'ribbon' | 'showdown';
  compact?: boolean;
}) {
  const state = useCollection(),
    router = useRouter(),
    { width } = useWindowDimensions(),
    { colors, ui } = useTheme(),
    c = state.collection!;
  const boxes = c.boxes.filter((b) => (b.kind ?? 'ribbon') === kind),
    box = boxes.find((b) => b.id === c.selectedBoxID) ??
      boxes[0] ?? {
        id: 'empty',
        name: 'Box 01',
        slots: Array(30).fill(null),
        wallpaper: undefined,
      },
    index = boxes.findIndex((b) => b.id === box.id);
  const [boardWidth, setBoardWidth] = useState(300),
    [sheet, setSheet] = useState(''),
    [moving, setMoving] = useState(''),
    [party, setParty] = useState(false),
    [search, setSearch] = useState(''),
    [finding, setFinding] = useState(false);
  const records = c.records.filter((r) =>
      kind === 'showdown' ? !!r.pokemon.showdownSet : !r.pokemon.showdownSet,
    ),
    byID = new Map(records.map((r) => [r.id, r.pokemon]));
  const selected = records.find((r) => r.id === c.selectedID) ?? records[0],
    p = selected?.pokemon;
  const wallpaper =
    wallpapers.find((w) => w.id === box.wallpaper?.sunMoon) ?? wallpapers[0]!;
  const slotW = (boardWidth * m.gridWidth) / m.width / 6,
    slotH = (boardWidth * m.gridHeight) / m.height / 5;
  const open = (tab = 'overview') => {
    if (p)
      router.push({
        pathname: kind === 'showdown' ? '/build/[id]' : '/passport/[id]',
        params: { id: p.id, tab },
      } as never);
  };
  const addBox = async () => {
    const id = Crypto.randomUUID(),
      name = `Box ${String(boxes.length + 1).padStart(2, '0')}`;
    return state.mutate((c, ctx) => {
      const next = createBox(c, id, name, ctx);
      return {
        ...next,
        boxes: next.boxes.map((b) => (b.id === id ? { ...b, kind } : b)),
      };
    }, 'Box created. Saved on this device.');
  };
  const choose = async (slot: number, id?: string | null) => {
    if (moving) {
      if (await state.move(moving, { boxID: box.id, slot })) setMoving('');
    } else if (id) {
      await state.select(id);
      if (compact)
        router.replace({ pathname: '/passport/[id]', params: { id } });
    }
  };
  return (
    <View style={{ gap: 16 }}>
      {!compact && (
        <View style={ui.between}>
          <PixelText accessibilityRole="header" style={{ fontSize: 25 }}>
            {kind === 'ribbon' ? 'RIBBON MASTERS' : 'COMPETITIVE'}
          </PixelText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Collection options"
            onPress={() => setSheet('Options')}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: width < 700 ? 0 : 14,
              borderWidth: width < 700 ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <PixelText style={{ fontSize: 14 }}>··· Options</PixelText>
          </Pressable>
        </View>
      )}
      <View style={ui.between}>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          POKÉMON STORAGE
        </PixelText>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          {box.slots.filter(Boolean).length} / 30
        </PixelText>
      </View>
      <View
        style={{
          padding: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.board,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'stretch' }}>
          {party && (
            <View style={{ width: 43, gap: 3, padding: 3 }}>
              <PixelText style={{ fontSize: 10, color: colors.muted }}>
                PARTY
              </PixelText>
              {Array.from({ length: 6 }, (_, i) => {
                const id = c.partyIDs.filter((id) => byID.has(id))[i],
                  pokemon = id ? byID.get(id) : undefined;
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={
                      moving
                        ? `Move to party slot ${i + 1}`
                        : pokemon
                          ? `Select ${displayName(pokemon)} in party`
                          : `Empty party slot ${i + 1}`
                    }
                    onPress={async () => {
                      if (moving) {
                        if (await state.move(moving, { partySlot: i }))
                          setMoving('');
                      } else if (id) await state.select(id);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: colors.panel,
                      borderRadius: 3,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pokemon && <Sprite pokemon={pokemon} size={32} />}
                  </Pressable>
                );
              })}
            </View>
          )}
          <View
            testID="pc-artwork"
            style={{
              flex: 1,
              minWidth: 0,
              aspectRatio: m.width / m.height,
              overflow: 'hidden',
            }}
            onLayout={(e) => setBoardWidth(e.nativeEvent.layout.width)}
          >
            <Image
              source={wallpaper.source}
              resizeMode="stretch"
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <View
              style={{
                position: 'absolute',
                left: '9%',
                top: '3%',
                width: '82%',
                height: '13%',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous box"
                onPress={() =>
                  boxes.length &&
                  state.selectBox(
                    boxes[(index + boxes.length - 1) % boxes.length]!.id,
                  )
                }
                style={{
                  minWidth: 20,
                  minHeight: 32,
                  justifyContent: 'center',
                }}
              >
                <PixelText style={{ color: '#FFF', fontSize: 24 }}>‹</PixelText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rename ${box.name}`}
                onPress={() => setSheet('Box settings')}
                style={{ flex: 1, minWidth: 0 }}
              >
                <PixelText
                  numberOfLines={1}
                  style={{
                    color: '#FFF',
                    fontSize: compact ? 12 : width < 600 ? 16 : 22,
                  }}
                >
                  {box.name.toUpperCase()}
                </PixelText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Party"
                onPress={() => setParty(!party)}
                style={{ minHeight: 32, justifyContent: 'center' }}
              >
                <PixelText
                  style={{ color: '#FFF', fontSize: compact ? 11 : 13 }}
                >
                  Party
                </PixelText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next box"
                onPress={() =>
                  boxes.length &&
                  state.selectBox(boxes[(index + 1) % boxes.length]!.id)
                }
                style={{
                  minWidth: 20,
                  minHeight: 32,
                  justifyContent: 'center',
                }}
              >
                <PixelText style={{ color: '#FFF', fontSize: 24 }}>›</PixelText>
              </Pressable>
            </View>
            <View
              style={{
                position: 'absolute',
                left: `${(m.x / m.width) * 100}%`,
                top: `${(m.y / m.height) * 100}%`,
                width: `${(m.gridWidth / m.width) * 100}%`,
                height: `${(m.gridHeight / m.height) * 100}%`,
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              {Array.from({ length: 30 }, (_, i) => {
                const id = box.slots[i],
                  pokemon = id ? byID.get(id) : undefined;
                return (
                  <Pressable
                    key={i}
                    testID={`pc-slot-${i + 1}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      moving
                        ? `${pokemon ? 'Swap with ' + displayName(pokemon) : 'Move to empty slot'} ${i + 1}`
                        : pokemon
                          ? 'Select ' + displayName(pokemon)
                          : 'Empty slot ' + (i + 1)
                    }
                    accessibilityState={{
                      selected: !!pokemon && pokemon.id === p?.id,
                      disabled: state.busy,
                    }}
                    disabled={state.busy}
                    onPress={() => choose(i, id)}
                    style={{
                      width: '16.666666%',
                      height: '20%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor:
                        !!pokemon && pokemon.id === p?.id
                          ? colors.accent
                          : 'transparent',
                      backgroundColor:
                        !!pokemon && pokemon.id === p?.id
                          ? '#EBF3D840'
                          : 'transparent',
                    }}
                  >
                    {pokemon && (
                      <Sprite
                        pokemon={pokemon}
                        width={Math.max(1, slotW - 10)}
                        height={Math.max(1, slotH - 10)}
                      />
                    )}{' '}
                    {pokemon?.shiny && (
                      <View
                        style={{ position: 'absolute', right: 1, bottom: 1 }}
                      >
                        <Art
                          name="shiny-dark"
                          size={compact ? 8 : width < 600 ? 10 : 14}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        {!compact && p && (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                padding: 9,
                borderRadius: 4,
                backgroundColor: colors.panel,
              }}
            >
              <Sprite pokemon={p} size={42} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <PixelText numberOfLines={1} style={{ fontSize: 19 }}>
                  {displayName(p)}
                </PixelText>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Art name={`game-${p.currentgame}-dark`} size={16} />
                  <PixelText
                    numberOfLines={1}
                    style={{ fontSize: 12, color: colors.muted }}
                  >
                    Lv. {p.currentlevel} · {gameName(p.currentgame)}
                  </PixelText>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  kind === 'ribbon' ? 'Open passport' : 'Open build'
                }
                onPress={() => open()}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <PixelText style={{ fontSize: 13 }}>
                  {kind === 'ribbon' ? 'Passport ▸' : 'Build ▸'}
                </PixelText>
              </Pressable>
              <Button
                label="Pokémon actions"
                onPress={() => setSheet('Pokémon actions')}
              >
                ···
              </Button>
            </View>
            {kind === 'ribbon' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open ribbons"
                onPress={() => open('ribbons')}
                style={{
                  borderTopWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {displayedAwards(p)
                  .slice(0, 4)
                  .map((id) => (
                    <Art key={id} name={'award-' + id} size={26} />
                  ))}
                <PixelText
                  style={{
                    marginLeft: 'auto',
                    fontSize: 14,
                    color: colors.muted,
                  }}
                >
                  {displayedAwards(p).length} awards ›
                </PixelText>
              </Pressable>
            )}
          </>
        )}
        <ScrollView horizontal contentContainerStyle={{ gap: 20 }}>
          {boxes.map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={b.name}
              onPress={() => state.selectBox(b.id)}
              style={{
                minHeight: 40,
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderColor: b.id === box.id ? colors.accent : 'transparent',
              }}
            >
              <PixelText style={{ fontSize: 12 }}>
                {b.name.toUpperCase()}
              </PixelText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {!compact && (
        <View style={ui.between}>
          <Button onPress={() => setSheet('All boxes')}>▦ All boxes</Button>
          <Button onPress={() => setSheet('Box options')}>Box options</Button>
        </View>
      )}
      {!!moving && (
        <PixelText style={{ color: colors.accent }}>
          Select a destination slot. Occupied slots swap.
        </PixelText>
      )}
      {finding && (
        <>
          <TextInput
            accessibilityLabel="Search Pokémon"
            style={ui.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Find Pokémon"
            placeholderTextColor={colors.muted}
          />
          <View style={ui.row}>
            {records
              .filter((r) =>
                (displayName(r.pokemon) + ' ' + r.pokemon.species)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((r) => (
                <Button key={r.id} onPress={() => state.select(r.id)}>
                  {displayName(r.pokemon)}
                </Button>
              ))}
          </View>
        </>
      )}
      {[
        'Options',
        'Box options',
        'Pokémon actions',
        'All boxes',
        'Delete Pokémon',
      ].includes(sheet) && (
        <EditorSheet title={sheet} onClose={() => setSheet('')}>
          {sheet === 'Options' ? (
            <>
              <Button
                onPress={() => {
                  setSheet('');
                  router.push({ pathname: '/teams', params: { kind } });
                }}
              >
                Teams
              </Button>
              {kind === 'showdown' && (
                <>
                  <Button
                    onPress={() => {
                      setSheet('');
                      router.push('/library');
                    }}
                  >
                    Team library
                  </Button>
                  <Button
                    onPress={() => {
                      setSheet('');
                      router.push('/import-showdown');
                    }}
                  >
                    Import Showdown team
                  </Button>
                </>
              )}
              <Button
                onPress={async () => {
                  if (!boxes.length && !(await addBox())) return;
                  setSheet('add');
                }}
              >
                Add Pokémon
              </Button>
              <Button onPress={() => setSheet('Backups')}>
                Import / export
              </Button>
              <Button
                onPress={async () => {
                  await addBox();
                  setSheet('');
                }}
              >
                New box
              </Button>
              <Button
                onPress={() => {
                  setFinding(!finding);
                  setSheet('');
                }}
              >
                Find Pokémon
              </Button>
              <Button onPress={() => setSheet('new')}>
                Start a new collection
              </Button>
            </>
          ) : sheet === 'Box options' ? (
            <>
              <Button onPress={() => setSheet('Box settings')}>
                Wallpaper
              </Button>
              <Button onPress={() => setSheet('Box settings')}>
                Rename box
              </Button>
              <Button
                onPress={async () => {
                  await addBox();
                  setSheet('');
                }}
              >
                New box
              </Button>
            </>
          ) : sheet === 'All boxes' ? (
            boxes.map((b) => (
              <Button
                key={b.id}
                primary={b.id === box.id}
                onPress={async () => {
                  await state.selectBox(b.id);
                  setSheet('');
                }}
              >{`${b.name} · ${b.slots.filter(Boolean).length}/30`}</Button>
            ))
          ) : sheet === 'Delete Pokémon' ? (
            <>
              <PixelText>
                Delete {p && displayName(p)}? You can undo this change and
                recover the saved collection.
              </PixelText>
              <Button
                disabled={!p || state.busy}
                onPress={async () => {
                  if (
                    p &&
                    (await state.mutate(
                      (c, ctx) => deletePokemon(c, p.id, ctx),
                      'Pokémon deleted. You can undo this change.',
                    ))
                  )
                    setSheet('');
                }}
              >
                Delete Pokémon
              </Button>
            </>
          ) : (
            <>
              <Button
                onPress={() => {
                  setSheet('');
                  open();
                }}
              >
                Open passport
              </Button>
              <Button onPress={() => setSheet('edit')}>Edit Pokémon</Button>
              <Button
                onPress={() => {
                  setMoving(moving ? '' : (p?.id ?? ''));
                  setSheet('');
                }}
              >
                {moving ? 'Cancel move' : 'Move'}
              </Button>
              <Button
                disabled={
                  !p ||
                  (!c.partyIDs.includes(p.id) &&
                    c.partyIDs.filter((id) => byID.has(id)).length >= 6)
                }
                onPress={async () => {
                  if (
                    p &&
                    (await state.move(
                      p.id,
                      c.partyIDs.includes(p.id)
                        ? { boxID: box.id, slot: box.slots.indexOf(null) }
                        : {
                            partySlot: c.partyIDs.filter((id) => byID.has(id))
                              .length,
                          },
                    ))
                  ) {
                    setParty(true);
                    setSheet('');
                  }
                }}
              >
                {p && c.partyIDs.includes(p.id)
                  ? 'Return to box'
                  : 'Add to party'}
              </Button>
              <Button onPress={() => setSheet('Export Pokémon')}>
                Export Pokémon
              </Button>
              <Button onPress={() => setSheet('Delete Pokémon')}>Delete</Button>
            </>
          )}
        </EditorSheet>
      )}
      {sheet === 'add' && (
        <PokemonEditor
          boxID={box.id}
          competitive={kind === 'showdown'}
          onClose={() => setSheet('')}
        />
      )}
      {sheet === 'edit' && selected && (
        <PokemonEditor
          record={selected}
          boxID={box.id}
          onClose={() => setSheet('')}
        />
      )}
      {sheet === 'Box settings' && (
        <BoxEditor box={box} onClose={() => setSheet('')} />
      )}
      {sheet === 'Backups' && (
        <EditorSheet title="Import / export" onClose={() => setSheet('')}>
          <BackupPanel onClose={() => setSheet('')} />
        </EditorSheet>
      )}
      {sheet === 'Export Pokémon' && p && (
        <EditorSheet title="Export Pokémon" onClose={() => setSheet('')}>
          <ExportPokemon id={p.id} />
        </EditorSheet>
      )}
      {sheet === 'new' && (
        <EditorSheet
          title="Start a new collection"
          onClose={() => setSheet('')}
        >
          <PixelText>
            The current collection is archived locally. Export a backup to keep
            an accessible copy.
          </PixelText>
          <Button
            disabled={state.busy}
            primary
            onPress={async () => {
              if (await state.startEmpty()) setSheet('');
            }}
          >
            Create empty collection
          </Button>
        </EditorSheet>
      )}
    </View>
  );
}
