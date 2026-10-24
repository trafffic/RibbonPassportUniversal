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
import { usePassportLink } from './usePassportLink';
import { displayName, displayedAwards, gameName } from '../domain/catalog';
import type { Pokemon } from '../domain/model';
import { createBox } from '../domain/organisation';
import { deletePokemon } from '../domain/passport';
import { exportRibbonsGuide } from '../backup/codec';
import { saveBackup } from '../backup/files';
import { loadPreference, savePreference } from '../state/preference';
import { Art, Button, PixelText, Sprite } from './primitives';
import {
  BoxEditor,
  EditorSheet,
  MenuItem,
  PokemonEditor,
  useAnchor,
} from './Editors';
import { BackupPanel } from './BackupPanel';
import { ExportPokemon } from './ExportPokemon';
import { pcMetrics as m, wallpapers } from './wallpapers';
import { useTheme } from './theme';
import { TerminalGlyph } from './TerminalGlyph';
import { CollectionLanding } from './CollectionLanding';
import {
  headerScale as scaleFor,
  hitTest,
  pageIndex,
  pcFrames,
  pcHeader,
  type Rect,
} from './pc-drag';
type Latest = {
  boardWidth: number;
  boardHeight: number;
  area: { width: number; height: number };
  classic: boolean;
  fit: boolean;
  party: boolean;
  box: { id: string; slots: (string | null)[] };
  boxes: { id: string }[];
  index: number;
  moving: string;
  byID: Map<string, Pokemon>;
  state: ReturnType<typeof useCollection>;
};
const menuSheets = ['Options', 'Box options', 'Pokémon actions'];
export function PCBox({
  kind = 'ribbon',
  compact = false,
  classic = false,
  followPassport = false,
  fit = false,
}: {
  kind?: 'ribbon' | 'showdown';
  compact?: boolean;
  /** Prominent landscape storage and a horizontal party on desktop. */
  classic?: boolean;
  followPassport?: boolean;
  /** Fit the mobile website's storage controls and board into the viewport. */
  fit?: boolean;
}) {
  const passport = usePassportLink();
  const state = useCollection(),
    router = useRouter(),
    { width, height } = useWindowDimensions(),
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
  const optionsAnchor = useAnchor(),
    boxAnchor = useAnchor(),
    actionsAnchor = useAnchor();
  const [boardWidth, setBoardWidth] = useState(300),
    [boardArea, setBoardArea] = useState({ width: 300, height: 300 }),
    [boardHeight, setBoardHeight] = useState(300 * m.height / m.width),
    [sheet, setSheet] = useState(''),
    [moving, setMoving] = useState(''),
    [party, setParty] = useState(classic),
    [search, setSearch] = useState(''),
    [finding, setFinding] = useState(false),
    [exportError, setExportError] = useState('');
  useEffect(() => {
    let live = true;
    loadPreference(`pc.${kind}.partyVisible`).then(
      (value) => live && setParty(value === null ? classic : value === '1'),
    );
    return () => {
      live = false;
    };
  }, [kind, classic]);
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
    partyRefs = useRef<Array<React.ComponentRef<typeof View> | null>>([]),
    session = useRef<{ id: string; boxID: string } | null>(null),
    paged = useRef(false),
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
  const wallpaper = wallpapers[Math.max(0, index) % wallpapers.length]!;
  const headerScale = scaleFor(boardWidth);
  const header = pcHeader({ x: 0, y: 0, width: boardWidth, height: boardHeight });
  const arrowSize = boardWidth >= 500 ? 24 : 16;
  const slotW = (boardWidth * m.gridWidth) / m.width / 6,
    slotH = (boardHeight * m.gridHeight) / m.height / 5;
  latest.current = {
    boardWidth,
    boardHeight,
    area: boardArea,
    classic,
    fit: classic || fit,
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
        x: (L.classic ? 0 : L.party ? 48 : 0) + (L.fit ? Math.max(0, (L.area.width - L.boardWidth) / 2) : 0),
        y: L.fit ? Math.max(0, (L.area.height - L.boardHeight) / 2) : 0,
        width: L.boardWidth,
        height: L.boardHeight,
      };
    return pcFrames(
      m,
      art,
      L.party ? partyRects.current : [],
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
          // Fixed-size party slots can move when their parent resizes without
          // firing onLayout. Measure their current positions for every drag.
          partyRefs.current.forEach((ref, i) => ref?.measureInWindow((px, py, width, height) => {
            partyRects.current[i] = { x: px - x, y: py - y, width, height };
          }));
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
      router.push(kind === 'showdown'
        ? { pathname: '/build/[id]', params: { id: p.id, tab } }
        : passport(p.id, tab));
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
      if (compact || followPassport)
        router.replace(passport(id));
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
        exportRibbonsGuide(c),
        'RibbonBackup-RibbonMasters.json',
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  };
  const partyRail = party && (
    <View
      style={{ width: classic ? '100%' : 43, flexDirection: classic ? 'row' : 'column', alignItems: classic ? 'center' : 'stretch', gap: classic ? 8 : 3, padding: classic ? 8 : 3, backgroundColor: classic ? colors.panel : undefined, borderWidth: classic ? 1 : 0, borderColor: colors.border }}
    >
      <PixelText style={{ fontSize: classic ? 12 : 10, color: colors.muted, marginRight: classic ? 'auto' : 0 }}>
        {classic ? `YOUR PARTY · ${c.partyIDs.filter(id => byID.has(id)).length} / 6` : 'PARTY'}
      </PixelText>
      {Array.from({ length: 6 }, (_, i) => {
        const id = c.partyIDs.filter((id) => byID.has(id))[i],
          pokemon = id ? byID.get(id) : undefined;
        return (
          <Pressable
            key={i}
            ref={(ref) => { partyRefs.current[i] = ref; }}
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
              } else if (id) {
                await state.select(id);
                if (followPassport) router.replace(passport(id));
              }
            }}
            style={{
              flex: classic ? undefined : 1,
              width: classic ? (height < 850 ? 36 : 42) : undefined,
              height: classic ? (height < 850 ? 36 : 42) : undefined,
              opacity: drag && drag.pokemon.id === id ? 0.08 : 1,
              backgroundColor: classic ? colors.board : colors.panel,
              borderRadius: 3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {pokemon && <Sprite pokemon={pokemon} size={classic ? (height < 850 ? 30 : 36) : 32} />}
          </Pressable>
        );
      })}
    </View>
  );
  if (!compact && !records.length) {
    return (
      <View style={{ flexGrow: 1 }}>
        <CollectionLanding
          kind={kind}
          disabled={state.busy || !!state.conflict}
          onAdd={startAdd}
          onImport={() => kind === 'ribbon' ? setSheet('Backups') : router.push('/import-showdown')}
          onDemo={() => state.tryDemo()}
          onLibrary={() => router.push('/library')}
        />
        {sheet === 'add' && <PokemonEditor boxID={box.id} competitive={kind === 'showdown'} onClose={() => setSheet('')} />}
        {sheet === 'Backups' && (
          <EditorSheet title="Import / export" onClose={() => setSheet('')}>
            <BackupPanel onClose={() => setSheet('')} />
          </EditorSheet>
        )}
      </View>
    );
  }
  return (
    <View testID={classic ? 'classic-storage' : fit ? 'mobile-storage' : undefined} style={{ gap: fit ? 4 : classic ? 10 : 16, flex: classic || fit ? 1 : undefined, minHeight: 0 }}>
      {!compact && (
        <View style={ui.between}>
          <View style={{ gap: fit ? 3 : 5 }}>
            {(classic || fit) && <PixelText style={{ fontSize: fit ? 11 : 12, letterSpacing: fit ? 0 : 1.5, color: colors.muted }}>POKÉMON STORAGE · {box.slots.filter(Boolean).length} / 30</PixelText>}
            <PixelText accessibilityRole="header" style={{ fontSize: classic ? 30 : 25 }}>
              {classic ? 'Your collection' : kind === 'ribbon' ? 'RIBBON MASTERS' : 'COMPETITIVE'}
            </PixelText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {classic && records.length > 0 && <Button disabled={state.busy} onPress={startAdd}>+ Add Pokémon</Button>}
          <Pressable
            ref={optionsAnchor.ref}
            accessibilityRole="button"
            accessibilityLabel="Collection options"
            onPress={() => optionsAnchor.measure(() => setSheet('Options'))}
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
        </View>
      )}
      {!!exportError && (
        <PixelText
          accessibilityRole="alert"
          style={{ color: colors.warningInk }}
        >
          {exportError}
        </PixelText>
      )}
      {!classic && !fit && <View style={ui.between}>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          POKÉMON STORAGE
        </PixelText>
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          {box.slots.filter(Boolean).length} / 30
        </PixelText>
      </View>}
      <View
        style={{
          padding: classic || fit ? 0 : 8,
          borderRadius: 10,
          borderWidth: classic || fit ? 0 : 1,
          borderColor: colors.border,
          backgroundColor: classic || fit ? 'transparent' : colors.board,
          gap: fit ? 4 : 10,
          flex: classic || fit ? 1 : undefined,
          minHeight: 0,
        }}
      >
        <View
          ref={rowRef}
          {...responder.panHandlers}
          style={{ flexDirection: classic ? 'column' : 'row', gap: classic ? 10 : 5, alignItems: 'stretch', flex: classic || fit ? 1 : undefined, minHeight: 0 }}
        >
          {!classic && partyRail}
          <View
            onLayout={classic || fit ? (e) => setBoardArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }) : undefined}
            style={{ flex: 1, minHeight: 0, minWidth: 0, alignItems: classic || fit ? 'center' : 'stretch', justifyContent: classic || fit ? 'center' : undefined }}
          >
          <View
            testID="pc-artwork"
            style={{
              minWidth: 0,
              aspectRatio: m.width / m.height,
              width: classic || fit ? Math.max(1, Math.min(boardArea.width, boardArea.height * m.width / m.height)) : undefined,
              flex: classic || fit ? undefined : 1,
              overflow: 'hidden',
              borderRadius: boardWidth * 8 / m.width,
            }}
            onLayout={(e) => { setBoardWidth(e.nativeEvent.layout.width); setBoardHeight(e.nativeEvent.layout.height); }}
          >
            <Image
              source={wallpaper.source}
              accessibilityLabel={`Box background: ${wallpaper.name}`}
              resizeMode="contain"
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <View
              style={{
                position: 'absolute',
                left: header.x,
                top: header.y,
                width: header.width,
                height: header.height,
                flexDirection: 'row',
                alignItems: 'center',
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
                  width: header.arrowWidth,
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TerminalGlyph kind="previous" color="#FFF" size={arrowSize} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rename ${box.name}`}
                onPress={() => setSheet('Box settings')}
                style={{ flex: 1, minWidth: 0, height: '100%', justifyContent: 'center' }}
              >
                <PixelText
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={{ color: '#FFF', fontSize: 15 * headerScale, textAlign: classic ? 'center' : undefined }}
                >
                  {box.name.toUpperCase()}
                </PixelText>
              </Pressable>
              {!classic && <Pressable
                accessibilityRole="button"
                accessibilityLabel="Party"
                onPress={toggleParty}
                style={{
                  minWidth: 44 * headerScale,
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PixelText
                  style={{ color: '#FFF', fontSize: 13 * headerScale }}
                >
                  Party
                </PixelText>
              </Pressable>}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next box"
                onPress={() =>
                  boxes.length &&
                  state.selectBox(boxes[(index + 1) % boxes.length]!.id)
                }
                style={{
                  width: header.arrowWidth,
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TerminalGlyph kind="next" color="#FFF" size={arrowSize} />
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
                        testID={`pc-shiny-${i + 1}`}
                        style={{ position: 'absolute', right: 1, top: 1 }}
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
          {classic && partyRail}
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
        {!compact && !classic && p && (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                padding: fit ? 4 : 9,
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
              <View ref={actionsAnchor.ref} collapsable={false}>
                <Button
                  label="Pokémon actions"
                  onPress={() =>
                    actionsAnchor.measure(() => setSheet('Pokémon actions'))
                  }
                >
                  ···
                </Button>
              </View>
            </View>
            {kind === 'ribbon' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open ribbons"
                onPress={() => open('ribbons')}
                style={{
                  borderTopWidth: 1,
                  borderColor: colors.border,
                  minHeight: 44,
                  paddingVertical: fit ? 6 : 12,
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
        <ScrollView horizontal scrollEnabled={!fit} showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: fit ? 8 : classic ? 8 : 20, ...(fit ? { width: '100%' } : {}) }}>
          {(fit ? boxes.slice(Math.floor(Math.max(0, index) / 3) * 3, Math.floor(Math.max(0, index) / 3) * 3 + 3) : boxes).map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={b.name}
              onPress={() => state.selectBox(b.id)}
              style={{
                minHeight: 40,
                flex: fit ? 1 : undefined,
                minWidth: 0,
                paddingVertical: 10,
                borderWidth: classic ? 1 : 0,
                borderBottomWidth: classic ? 1 : 2,
                paddingHorizontal: classic ? 12 : 0,
                backgroundColor: classic ? b.id === box.id ? colors.accent : colors.panel : undefined,
                borderColor: classic ? colors.border : b.id === box.id ? colors.accent : 'transparent',
              }}
            >
              <PixelText numberOfLines={1} style={{ fontSize: classic ? 14 : 12, color: classic && b.id === box.id ? colors.paper : colors.ink }}>
                {b.name.toUpperCase()}
              </PixelText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {!compact && (
        <View style={ui.between}>
          {classic && <>
            <Button label="Party" onPress={toggleParty}>{party ? 'Hide party' : 'Show party'}</Button>
            {p && <View ref={actionsAnchor.ref} collapsable={false}><Button label="Pokémon actions" onPress={() => actionsAnchor.measure(() => setSheet('Pokémon actions'))}>Pokémon actions ···</Button></View>}
          </>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="All boxes"
            onPress={() => setSheet('All boxes')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <PixelText style={{ fontSize: 14, color: colors.muted }}>
              ▦ All boxes
            </PixelText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add box"
            disabled={state.busy}
            onPress={addBox}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
          >
            <PixelText style={{ fontSize: 14, color: colors.accent }}>+ Box</PixelText>
          </Pressable>
          <Pressable
            ref={boxAnchor.ref}
            accessibilityRole="button"
            accessibilityLabel="Box options"
            onPress={() => boxAnchor.measure(() => setSheet('Box options'))}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <PixelText style={{ fontSize: 14, color: colors.muted }}>
              ▣ Box options
            </PixelText>
          </Pressable>
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
        <EditorSheet
          title={menuSheets.includes(sheet) ? 'Options' : sheet}
          close={menuSheets.includes(sheet) ? 'Close' : 'Cancel'}
          menu={menuSheets.includes(sheet)}
          anchor={
            sheet === 'Options'
              ? optionsAnchor.rect
              : sheet === 'Box options'
                ? boxAnchor.rect
                : sheet === 'Pokémon actions'
                  ? actionsAnchor.rect
                  : undefined
          }
          onClose={() => setSheet('')}
        >
          {sheet === 'Options' ? (
            <>
              <MenuItem
                link
                onPress={() => {
                  setSheet('');
                  router.push({ pathname: '/teams', params: { kind } });
                }}
              >
                Teams
              </MenuItem>
              {kind === 'showdown' && (
                <>
                  <MenuItem
                    link
                    onPress={() => {
                      setSheet('');
                      router.push('/library');
                    }}
                  >
                    Team library
                  </MenuItem>
                  <MenuItem
                    glyph="download"
                    onPress={() => {
                      setSheet('');
                      router.push('/import-showdown');
                    }}
                  >
                    Import Showdown team
                  </MenuItem>
                </>
              )}
              <MenuItem glyph="add" onPress={startAdd}>
                Add Pokémon
              </MenuItem>
              {kind === 'ribbon' && (
                <MenuItem glyph="download" onPress={() => setSheet('Backups')}>
                  Import ribbons.guide backup
                </MenuItem>
              )}
              {kind === 'ribbon' && (
                <>
                  <MenuItem
                    glyph="export"
                    disabled={!ribbonRecords.length}
                    onPress={exportRibbonMasters}
                  >
                    Export Ribbon Masters
                  </MenuItem>
                  <MenuItem
                    onPress={() => {
                      if (hasDemo) setSheet('Refresh demo');
                      else {
                        setSheet('');
                        state.tryDemo();
                      }
                    }}
                  >
                    {hasDemo ? 'Refresh demo' : 'Try demo'}
                  </MenuItem>
                </>
              )}
              <MenuItem
                glyph="add"
                onPress={async () => {
                  await addBox();
                  setSheet('');
                }}
              >
                New box
              </MenuItem>
              <MenuItem onPress={() => setSheet('Backups')}>
                Backups
              </MenuItem>
              <MenuItem
                onPress={() => {
                  setFinding(!finding);
                  setSheet('');
                }}
              >
                Find Pokémon
              </MenuItem>
              <MenuItem onPress={() => setSheet('new')}>
                Start a new collection
              </MenuItem>
            </>
          ) : sheet === 'Box options' ? (
            <>
              <MenuItem onPress={() => setSheet('Box settings')}>
                Rename box
              </MenuItem>
              <MenuItem
                onPress={async () => {
                  await addBox();
                  setSheet('');
                }}
              >
                New box
              </MenuItem>
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
              <MenuItem
                link
                onPress={() => {
                  setSheet('');
                  open();
                }}
              >
                {kind === 'ribbon' ? 'Open passport' : 'Open build'}
              </MenuItem>
              <MenuItem onPress={() => setSheet('edit')}>Edit Pokémon</MenuItem>
              <MenuItem
                onPress={() => {
                  setMoving(moving ? '' : (p?.id ?? ''));
                  setSheet('');
                }}
              >
                {moving ? 'Cancel move' : 'Move'}
              </MenuItem>
              <MenuItem
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
              </MenuItem>
              <MenuItem onPress={() => setSheet('Export Pokémon')}>
                Export Pokémon
              </MenuItem>
              <MenuItem destructive onPress={() => setSheet('Delete Pokémon')}>
                Delete
              </MenuItem>
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
        <EditorSheet
          title="Export Pokémon"
          close="Done"
          onClose={() => setSheet('')}
        >
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
