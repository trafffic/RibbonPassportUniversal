import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Platform,
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
import type { Pokemon } from '../domain/model';
import { createBox, ribbonMastersGuide } from '../domain/organisation';
import { deletePokemon } from '../domain/passport';
import { exportSource } from '../backup/codec';
import { saveBackup } from '../backup/files';
import { loadPreference, savePreference } from '../state/preference';
import { Art, Button, Panel, PixelText, Sprite } from './primitives';
import { BoxEditor, EditorSheet, PokemonEditor } from './Editors';
import { BackupPanel } from './BackupPanel';
import { ExportPokemon } from './ExportPokemon';
import { pcMetrics as m, wallpapers } from './wallpapers';
import { useTheme } from './theme';
import { hitTest, pageIndex, pcFrames, type Rect } from './pc-drag';
type Latest = {
  boardWidth: number;
  party: boolean;
  box: { id: string; slots: (string | null)[] };
  boxes: { id: string }[];
  index: number;
  moving: string;
  byID: Map<string, Pokemon>;
  state: ReturnType<typeof useCollection>;
};
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
    [finding, setFinding] = useState(false),
    [exportError, setExportError] = useState('');
  useEffect(() => {
    let live = true;
    loadPreference(`pc.${kind}.partyVisible`).then(
      (value) => live && setParty(value === '1'),
    );
    return () => {
      live = false;
    };
  }, [kind]);
  const [drag, setDrag] = useState<{
      pokemon: Pokemon;
      x: number;
      y: number;
    } | null>(null),
    [hoveredPage, setHoveredPage] = useState<-1 | 1 | null>(null);
  const rowRef = useRef<React.ComponentRef<typeof View>>(null),
    origin = useRef({ x: 0, y: 0 }),
    start = useRef({ moveX: 0, moveY: 0 }),
    partyRects = useRef<Rect[]>([]),
    session = useRef<{ id: string; boxID: string } | null>(null),
    paged = useRef(false),
    partyOrigin = useRef({ x: 0, y: 0 }),
    latest = useRef<Latest>(null!);
  const toggleParty = () => {
    setParty(!party);
    savePreference(`pc.${kind}.partyVisible`, party ? '0' : '1');
  };
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
  latest.current = {
    boardWidth,
    party,
    box,
    boxes,
    index,
    moving,
    byID,
    state,
  };
  const pointer = (g: { moveX: number; moveY: number }) => ({
    x:
      g.moveX - (Platform.OS === 'web' ? window.scrollX : 0) - origin.current.x,
    y:
      g.moveY - (Platform.OS === 'web' ? window.scrollY : 0) - origin.current.y,
  });
  const frames = () => {
    const L = latest.current,
      art = {
        x: L.party ? 48 : 0,
        y: 0,
        width: L.boardWidth,
        height: (L.boardWidth * m.height) / m.width,
      };
    return pcFrames(
      m,
      art,
      L.party
        ? partyRects.current.map((r) => ({
            ...r,
            x: r.x + partyOrigin.current.x,
            y: r.y + partyOrigin.current.y,
          }))
        : [],
    );
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (e) => {
        start.current = {
          moveX: e.nativeEvent.pageX,
          moveY: e.nativeEvent.pageY,
        };
        rowRef.current?.measureInWindow((x, y) => {
          origin.current = { x, y };
        });
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const L = latest.current;
        if (session.current) return true;
        if (L.state.busy || L.moving || Math.abs(g.dx) + Math.abs(g.dy) < 4)
          return false;
        const target0 = pointer(start.current),
          target = hitTest(target0, frames()),
          id =
            target?.kind === 'box'
              ? L.box.slots[target.slot]
              : target?.kind === 'party'
                ? L.state.collection!.partyIDs.filter((i: string) =>
                    L.byID.has(i),
                  )[target.slot]
                : null;
        if (!id) return false;
        session.current = { id, boxID: L.box.id };
        return true;
      },
      onPanResponderGrant: () => {
        const s = session.current;
        if (s)
          setDrag({
            pokemon: latest.current.byID.get(s.id)!,
            ...pointer(start.current),
          });
      },
      onPanResponderMove: (_, g) => {
        const p = pointer(g),
          target = hitTest(p, frames());
        setDrag((d) => d && { ...d, ...p });
        if (target?.kind !== 'page') paged.current = false;
        setHoveredPage(
          target?.kind === 'page' && !paged.current ? target.direction : null,
        );
      },
      onPanResponderRelease: (_, g) => finishDrag(g),
      onPanResponderTerminate: (_, g) => finishDrag(g, true),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  const finishDrag = async (
    g: { moveX: number; moveY: number },
    cancelled = false,
  ) => {
    const s = session.current,
      L = latest.current;
    session.current = null;
    paged.current = false;
    setDrag(null);
    setHoveredPage(null);
    if (!s) return;
    const target = cancelled ? null : hitTest(pointer(g), frames());
    let moved = false;
    if (target?.kind === 'box') {
      if (L.box.slots[target.slot] === s.id) moved = true;
      else
        moved = await L.state.move(s.id, {
          boxID: L.box.id,
          slot: target.slot,
        });
    } else if (target?.kind === 'party') {
      if (
        L.state.collection!.partyIDs.filter((i) => L.byID.has(i))[
          target.slot
        ] === s.id
      )
        moved = true;
      else moved = await L.state.move(s.id, { partySlot: target.slot });
    }
    if (!moved && L.box.id !== s.boxID) await L.state.selectBox(s.boxID);
  };
  useEffect(() => {
    if (!hoveredPage || !drag) return;
    const timer = setTimeout(() => {
      const L = latest.current;
      if (L.boxes.length < 2) return;
      paged.current = true;
      L.state.selectBox(
        L.boxes[pageIndex(L.index, L.boxes.length, hoveredPage)]!.id,
      );
      setHoveredPage(null);
    }, 650);
    return () => clearTimeout(timer);
  }, [hoveredPage, !!drag]);
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
    }, 'Box created.');
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
  const startAdd = async () => {
    if (!boxes.length && !(await addBox())) return;
    setSheet('add');
  };
  const hasDemo = c.records.some((r) => r.pokemon.source === 'demo'),
    ribbonRecords = c.records.filter((r) => !r.pokemon.showdownSet);
  const exportRibbonMasters = async () => {
    setSheet('');
    try {
      await saveBackup(
        exportSource(ribbonMastersGuide(c)),
        'RibbonBackup-RibbonMasters.json',
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
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
      {!compact && !records.length && (
        <Panel>
          <PixelText accessibilityRole="header" style={{ fontSize: 22 }}>
            {kind === 'ribbon'
              ? 'Start your ribbon journey'
              : 'Build your first team'}
          </PixelText>
          {kind === 'ribbon' ? (
            <>
              <Button onPress={() => setSheet('Backups')}>
                Import ribbons.guide backup
              </Button>
              <Button
                disabled={state.busy}
                primary
                onPress={() => state.tryDemo()}
              >
                Try demo
              </Button>
            </>
          ) : (
            <>
              <Button onPress={() => router.push('/import-showdown')}>
                Import Showdown team
              </Button>
              <Button onPress={() => router.push('/library')}>
                Browse community teams
              </Button>
            </>
          )}
          <Button disabled={state.busy} onPress={startAdd}>
            Add Pokémon
          </Button>
        </Panel>
      )}
      {!!exportError && (
        <PixelText
          accessibilityRole="alert"
          style={{ color: colors.warningInk }}
        >
          {exportError}
        </PixelText>
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
        <View
          ref={rowRef}
          {...responder.panHandlers}
          style={{ flexDirection: 'row', gap: 5, alignItems: 'stretch' }}
        >
          {party && (
            <View
              onLayout={(e) => {
                partyOrigin.current = e.nativeEvent.layout;
              }}
              style={{ width: 43, gap: 3, padding: 3 }}
            >
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
                    onLayout={(e) => {
                      partyRects.current[i] = e.nativeEvent.layout;
                    }}
                    style={{
                      flex: 1,
                      opacity: drag && drag.pokemon.id === id ? 0.08 : 1,
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
                onPress={toggleParty}
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
                      opacity: drag && drag.pokemon.id === id ? 0.08 : 1,
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
          {drag && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: drag.x - 20,
                top: drag.y - 22,
                zIndex: 10,
              }}
            >
              <Sprite pokemon={drag.pokemon} size={40} />
            </View>
          )}
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
        'Refresh demo',
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
              <Button onPress={startAdd}>Add Pokémon</Button>
              <Button onPress={() => setSheet('Backups')}>
                Import / export
              </Button>
              {kind === 'ribbon' && (
                <>
                  <Button
                    disabled={!ribbonRecords.length}
                    onPress={exportRibbonMasters}
                  >
                    Export Ribbon Masters
                  </Button>
                  <Button
                    onPress={() => {
                      if (hasDemo) setSheet('Refresh demo');
                      else {
                        setSheet('');
                        state.tryDemo();
                      }
                    }}
                  >
                    {hasDemo ? 'Refresh demo' : 'Try demo'}
                  </Button>
                </>
              )}
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
          ) : sheet === 'Refresh demo' ? (
            <>
              <PixelText>
                Replace the demo Pokémon with a fresh copy? Their notes and
                journal are kept. You can undo this change.
              </PixelText>
              <Button
                disabled={state.busy}
                primary
                onPress={async () => {
                  if (await state.tryDemo()) setSheet('');
                }}
              >
                Refresh demo Pokémon
              </Button>
            </>
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
                    savePreference(`pc.${kind}.partyVisible`, '1');
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
