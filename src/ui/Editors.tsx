import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  catalog,
  displayName,
  gameName,
  ruleData,
  sortGames,
  awardName,
} from '../domain/catalog';
import type { Box, PassportRecord, Pokemon } from '../domain/model';
import { blankPokemon, type PokemonDetails } from '../domain/organisation';
import { compatibleGames, transferCheck } from '../domain/rules';
import { useCollection } from '../state/CollectionProvider';
import {
  Art,
  Button,
  DONE_BAR,
  KeyboardDoneBar,
  NumberStepper,
  Panel,
  PixelText,
  Sprite,
  Toggle,
} from './primitives';
import { searchChoices } from './form-logic';
import { colors, ui, useTheme } from './theme';
import { CornerButton } from './CornerButton';
import { TerminalGlyph } from './TerminalGlyph';
import type { Glyph } from './corner-glyph';
import { useDensity } from './density';
import { wallpapers } from './wallpapers';
import { gameColour } from '../domain/game-colours';
import { captureMarkIDs, setCaptureMarks } from '../domain/passport';
import { sizeChoices } from '../domain/size-class';
const openSheets: object[] = [];
export type Anchor = { x: number; y: number; width: number; height: number };
/** Measures a menu's trigger so desktop can open the menu beside it. */
export function useAnchor() {
  const ref = useRef<React.ComponentRef<typeof View>>(null),
    [rect, setRect] = useState<Anchor>();
  const measure = (then: () => void) => {
    const node = ref.current;
    if (!node?.measureInWindow) return then();
    node.measureInWindow((x, y, width, height) => {
      setRect({ x, y, width, height });
      then();
    });
  };
  return { ref, rect, measure };
}
export function EditorSheet({
  title,
  children,
  onClose,
  close = 'Cancel',
  menu = false,
  anchor,
  confirm,
}: React.PropsWithChildren<{
  title: string;
  onClose(): void;
  /** Corner button: Cancel for forms, Done for read-only sheets, Close for menus. */
  close?: 'Cancel' | 'Done' | 'Close';
  /** An iPhone TerminalMenu: an "OPTIONS" action board of full-width rows. */
  menu?: boolean;
  /** Desktop opens a menu under its trigger instead of centred. */
  anchor?: Anchor;
  /** iPhone confirmation corner (Save / Add): Cancel moves to the left. */
  confirm?: { title: 'Save' | 'Add'; onPress(): void; disabled?: boolean };
}>) {
  const { colors, ui } = useTheme();
  const { width, height } = useWindowDimensions(),
    state = useCollection(),
    phone = width < 700,
    anchored = menu && !!anchor && width >= 1100;
  const drag = useRef(new Animated.Value(0)).current;
  const dismiss = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1) onCloseRef.current();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: false }).start();
      },
    }),
  ).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Only the topmost sheet answers Escape.
    const token = {};
    openSheets.push(token);
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && openSheets.at(-1) === token && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      openSheets.splice(openSheets.indexOf(token), 1);
    };
  }, [onClose]);
  const top = anchored ? Math.min(anchor!.y + anchor!.height + 4, height - 160) : 0,
    left = anchored
      ? Math.max(8, Math.min(anchor!.x + anchor!.width - 300, width - 308))
      : 0;
  const header = (
    <View
      style={[
        ui.between,
        {
          padding: menu ? 12 : 16,
          borderBottomWidth: 1,
          borderColor: colors.border,
          gap: 12,
        },
      ]}
    >
      {confirm && <CornerButton title={close} onPress={onClose} />}
      <PixelText
        accessibilityRole="header"
        style={[
          { fontSize: menu ? 20 : 25, flex: 1 },
          confirm && { textAlign: 'center' },
          menu && { textTransform: 'uppercase' },
        ]}
      >
        {title}
      </PixelText>
      {confirm ? (
        <CornerButton
          title={confirm.title}
          disabled={confirm.disabled}
          onPress={confirm.onPress}
        />
      ) : (
        <CornerButton title={close} onPress={onClose} />
      )}
    </View>
  );
  const body = (
    <>
      {header}
      {!!state.error && (
        <PixelText
          accessibilityRole="alert"
          style={{ padding: 14, color: colors.warningInk }}
        >
          {state.error}
        </PixelText>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: menu ? 12 : 18, gap: menu ? 8 : 18 }}
      >
        {children}
      </ScrollView>
      <KeyboardDoneBar />
    </>
  );
  if (anchored)
    return (
      <Modal transparent animationType="none" onRequestClose={onClose}>
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            position: 'absolute',
            top,
            left,
            width: 300,
            maxHeight: height - top - 16,
            backgroundColor: colors.paper,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {body}
        </View>
      </Modal>
    );
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: '#0A140CAA',
          padding: phone ? 8 : 16,
          justifyContent: phone ? 'flex-end' : 'center',
          alignItems: 'center',
        }}
      >
        <Animated.View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: menu ? 480 : 680,
            maxHeight: '94%',
            backgroundColor: menu ? colors.paper : colors.panel,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: phone ? 28 : 8,
            overflow: 'hidden',
            transform: [{ translateY: drag }],
          }}
        >
          {phone && (
            <View
              {...dismiss.panHandlers}
              accessibilityLabel="Drag down to close"
              style={{ paddingVertical: 8, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 55,
                  height: 4,
                  borderRadius: 3,
                  backgroundColor: colors.muted,
                }}
              />
            </View>
          )}
          {phone ? (
            <View {...dismiss.panHandlers} style={{ flexShrink: 1 }}>
              {body}
            </View>
          ) : (
            body
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
/** One row of an options menu, as the iPhone TerminalMenuRow / TerminalMenuLink. */
export function MenuItem({
  children,
  onPress,
  disabled,
  link = false,
  destructive = false,
  glyph,
}: {
  children: string;
  onPress(): void;
  disabled?: boolean;
  /** Leading bitmap icon, standing in for the iPhone row's SF Symbol. */
  glyph?: Glyph;
  /** Opens another screen: shows the iPhone "›". */
  link?: boolean;
  destructive?: boolean;
}) {
  const { colors } = useTheme(),
    density = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44 * density,
        paddingHorizontal: 12,
        paddingVertical: 11 * density,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: destructive ? colors.warning : colors.panel,
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {glyph && (
          <TerminalGlyph
            kind={glyph}
            size={16 * density}
            color={destructive ? colors.warningInk : colors.ink}
          />
        )}
        <PixelText
          style={{
            fontSize: 16,
            color: destructive ? colors.warningInk : colors.ink,
          }}
        >
          {children}
        </PixelText>
      </View>
      {link && <PixelText style={{ fontSize: 16 }}>›</PixelText>}
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  numeric?: boolean;
}) {
  const { colors, ui, dark } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <PixelText style={ui.label}>{label.toUpperCase()}</PixelText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        style={ui.input}
        keyboardType={numeric ? 'number-pad' : 'default'}
        inputAccessoryViewID={DONE_BAR}
        autoCapitalize={numeric ? 'none' : 'sentences'}
      />
    </View>
  );
}
export function ChoiceField({
  label,
  value,
  options,
  onChange,
  game = false,
}: {
  label: string;
  value: string;
  options: {
    id: string;
    name: string;
  }[];
  onChange(v: string): void;
  game?: boolean;
}) {
  const { colors, ui, dark } = useTheme();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [limit, setLimit] = useState(30);
  const matches = useMemo(
    () => searchChoices(options, search),
    [options, search],
  );
  return (
    <View style={{ gap: 8 }}>
      <PixelText style={ui.label}>{label.toUpperCase()}</PixelText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${options.find((o) => o.id === value)?.name ?? (value || 'Choose…')}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[
          ui.between,
          {
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            minHeight: 48,
          },
        ]}
      >
        <View style={[ui.row, { flex: 1 }]}>
          {game && value && <Art name={`game-${value}-light`} size={28} />}
          <PixelText
            style={
              game && value ? { color: gameColour(value, dark) } : undefined
            }
          >
            {options.find((o) => o.id === value)?.name ?? (value || 'Choose…')}
          </PixelText>
        </View>
        <PixelText>{open ? '−' : '+'}</PixelText>
      </Pressable>
      {open && (
        <View
          style={{
            gap: 8,
            padding: 10,
            backgroundColor: colors.paper,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TextInput
            accessibilityLabel={`Search ${label.toLowerCase()}`}
            placeholder="Search name, form or number…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setLimit(30);
            }}
            style={ui.input}
            autoFocus
          />
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 250 }}
          >
            {matches.slice(0, limit).map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${o.name}`}
                onPress={() => {
                  onChange(o.id);
                  setOpen(false);
                  setSearch('');
                }}
                style={[
                  ui.row,
                  {
                    padding: 10,
                    minHeight: 46,
                    backgroundColor: value === o.id ? colors.board : undefined,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
              >
                {game && o.id && <Art name={`game-${o.id}-light`} size={26} />}
                <PixelText
                  style={
                    game && o.id ? { color: gameColour(o.id, dark) } : undefined
                  }
                >
                  {o.name}
                </PixelText>
              </Pressable>
            ))}
            {!matches.length && <PixelText>No matches.</PixelText>}
            {matches.length > limit && (
              <Button onPress={() => setLimit(limit + 50)}>
                Show more results
              </Button>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
const compatibility = require('../../assets/data/export-compatibility.json') as {
  guideBalls: Record<string, string>;
  guideLanguages: Record<string, string>;
};
const byName = (m: Record<string, string>) =>
  Object.entries(m)
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
// Same lists, order and empty label as the iPhone capture details.
const ballOptions = [
  { id: '', name: 'Not specified' },
  ...byName(compatibility.guideBalls),
];
const languageOptions = [
  { id: '', name: 'Not specified' },
  ...byName(compatibility.guideLanguages),
];
const shadowSpecies = (id: string) =>
  !!ruleData.species[id]?.flags?.some((f: string) =>
    ['colShadow', 'xdShadow'].includes(f),
  );
const speciesOptions = Object.entries(catalog.pokemon)
  .sort((a, b) => (a[1].natdex ?? 9999) - (b[1].natdex ?? 9999))
  .map(([id, p]) => ({
    id,
    name: `#${String(p.natdex ?? '?').padStart(4, '0')} ${p.name}${p.name.toLowerCase().replace(/[^a-z0-9]/g, '') !== id.replace(/[^a-z0-9]/g, '') ? ` · ${id}` : ''}`,
  }));
// Catalogue group labels (e.g. ORAS) are headings, not an individual game's earning location.
const gameOptions = [
  { id: '', name: 'Not set' },
  ...sortGames(Object.keys(ruleData.games)).map((id) => ({
    id,
    name: gameName(id),
  })),
];
export function PokemonEditor({
  record,
  boxID,
  onClose,
  competitive = false,
}: {
  record?: PassportRecord;
  boxID: string;
  onClose(): void;
  competitive?: boolean;
}) {
  const { colors, ui, dark } = useTheme();
  const state = useCollection(),
    { width } = useWindowDimensions();
  const [draft, setDraft] = useState<Pokemon>(
    () =>
      record?.pokemon ?? {
        ...blankPokemon(Crypto.randomUUID()),
        ...(competitive
          ? {
              source: 'showdown',
              showdownSet: {
                item: '',
                ability: '',
                nature: '',
                evs: '',
                ivs: '',
                teraType: '',
                moves: [],
              },
            }
          : {}),
      },
  );
  const [level, setLevel] = useState(draft.currentlevel),
    [met, setMet] = useState<number | undefined>(draft.metLevel),
    [size, setSize] = useState<number | undefined>(draft.sizeScale);
  const [error, setError] = useState('');
  const [marks, setMarks] = useState(false);
  const p = {
    ...draft,
    currentlevel: level,
    metLevel: met,
    sizeScale: size,
  };
  const update = <K extends keyof PokemonDetails>(
    key: K,
    val: PokemonDetails[K],
  ) => setDraft((old) => ({ ...old, [key]: val }));
  const compatible =
    !p.currentgame || compatibleGames(p, false).includes(p.currentgame);
  const transfer = transferCheck(p.currentgame, p);
  const save = async () => {
    setError('');
    const result = record
      ? await state.edit(record.id, p, record.version.revision)
      : await state.add(p, boxID);
    if (result) onClose();
    else setError('Could not save. Check the details below and try again.');
  };
  return (
    <EditorSheet
      title={record ? 'Edit Pokémon' : 'Add Pokémon'}
      onClose={onClose}
      confirm={{
        title: record ? 'Save' : 'Add',
        onPress: save,
        disabled: state.busy || !draft.species,
      }}
    >
      <View style={[ui.row, { backgroundColor: colors.paper, padding: 12 }]}>
        {draft.species && <Sprite pokemon={p} size={width < 400 ? 64 : 88} />}
        <View style={{ flex: 1 }}>
          <PixelText style={{ fontSize: 26 }}>
            {draft.species ? displayName(draft) : 'Your next companion'}
          </PixelText>
          <PixelText style={ui.muted}>
            {record
              ? 'Identity and earning history stay with this Pokémon.'
              : 'Choose a species, then start their passport.'}
          </PixelText>
        </View>
      </View>
      <PixelText style={ui.heading}>Pokémon</PixelText>
      <ChoiceField
        label="Species / form"
        value={draft.species}
        options={speciesOptions}
        onChange={(id) =>
          setDraft((old) => ({
            ...old,
            species: id,
            gmax: false,
            shadow: false,
          }))
        }
      />
      <Field
        label="Nickname"
        value={draft.nickname}
        onChange={(v) => update('nickname', v)}
      />
      <NumberStepper
        label="Level"
        value={level}
        min={1}
        max={100}
        onChange={setLevel}
      />
      <Toggle
        label="Shiny"
        value={draft.shiny}
        onChange={(v) => update('shiny', v)}
      />
      <Selector
        title="Gender"
        value={draft.gender}
        choices={[
          { value: '', name: 'Not specified' },
          { value: 'male', name: 'Male' },
          { value: 'female', name: 'Female' },
        ]}
        onChange={(v) => update('gender', v)}
      />
      {(shadowSpecies(draft.species) || draft.shadow) && (
        <Toggle
          label="Shadow Pokémon"
          value={draft.shadow}
          onChange={(v) => update('shadow', v)}
        />
      )}
      {catalog.gmaxSpecies.includes(draft.species) && (
        <Toggle
          label="Gigantamax factor"
          value={draft.gmax}
          onChange={(v) => update('gmax', v)}
        />
      )}
      <PixelText style={ui.heading}>Journey</PixelText>
      <ChoiceField
        label="Current game"
        value={draft.currentgame}
        options={gameOptions}
        onChange={(v) => update('currentgame', v)}
        game
      />
      <ChoiceField
        label="Origin game"
        value={draft.origingame}
        options={gameOptions}
        onChange={(v) => update('origingame', v)}
        game
      />
      <Toggle
        label="Met level known"
        value={met !== undefined}
        onChange={(known) => setMet(known ? level : undefined)}
      />
      <Selector
        title="Size"
        value={size}
        choices={
          sizeChoices.some((c) => c.value === size)
            ? sizeChoices
            : [...sizeChoices, { value: size, name: `Recorded (${size})` }]
        }
        onChange={setSize}
      />
      {met !== undefined && (
        <NumberStepper
          label="Met level"
          value={met}
          min={1}
          max={100}
          onChange={setMet}
        />
      )}
      {draft.species && (
        <Panel
          style={{
            backgroundColor: !compatible ? colors.warning : colors.paper,
            padding: 12,
          }}
        >
          <PixelText style={ui.label}>RIBBON PLANNING</PixelText>
          <PixelText>
            {!compatible
              ? 'This species or form is not compatible with the selected current game. Check your details.'
              : `${transfer.lastChance.length} last-chance awards in this generation. ${p.ribbons.length} recorded ribbons kept.`}
          </PixelText>
          <PixelText style={{ fontSize: 14 }}>
            Saving details recalculates eligibility. Recorded ribbons and
            previous Journey stops remain in your passport; this does not record
            a transfer.
          </PixelText>
        </Panel>
      )}
      {!record && (
        <Disclosure title="Capture details">
          <ChoiceField
            label="Ball"
            value={draft.ball ?? ''}
            options={ballOptions}
            onChange={(v) => update('ball', v || undefined)}
          />
          <ChoiceField
            label="Language"
            value={draft.language ?? ''}
            options={languageOptions}
            onChange={(v) => update('language', v || undefined)}
          />
          <Field
            label="Original trainer"
            value={draft.trainername ?? ''}
            onChange={(v) => update('trainername', v || undefined)}
          />
        </Disclosure>
      )}
      <PixelText style={ui.heading}>Ribbons and marks</PixelText>
      <ChoiceField
        label="Equipped title"
        value={draft.title}
        options={[
          { id: 'None', name: 'No title equipped' },
          ...draft.ribbons
            .filter((id) => catalog.titles[id])
            .map((id) => ({ id, name: catalog.titles[id]! })),
        ]}
        onChange={(title) =>
          setDraft((old) => ({ ...old, title, titleText: '' }))
        }
      />
      <Field
        label="Custom title"
        value={draft.titleText}
        onChange={(v) => update('titleText', v)}
      />
      {record && (
        <Button onPress={() => setMarks(true)}>Edit capture marks</Button>
      )}
      {marks && record && (
        <EditorSheet title="Capture marks" onClose={() => setMarks(false)}>
          <PixelText>
            Record marks already present on this Pokémon. These are obtained
            when caught and cannot be earned later.
          </PixelText>
          {captureMarkIDs.map((id) => (
            <Button
              key={id}
              primary={draft.ribbons.includes(id)}
              onPress={() =>
                setDraft((old) => ({
                  ...old,
                  ribbons: old.ribbons.includes(id)
                    ? old.ribbons.filter((v) => v !== id)
                    : [...old.ribbons, id],
                }))
              }
            >
              {awardName(id)}
              {draft.ribbons.includes(id) ? ' ✓' : ''}
            </Button>
          ))}
          <Button
            primary
            disabled={state.busy}
            onPress={async () => {
              if (
                await state.mutate((c, ctx) =>
                  setCaptureMarks(
                    c,
                    record.id,
                    draft.ribbons.filter((id) => captureMarkIDs.includes(id)),
                    record.version.revision,
                    ctx,
                  ),
                )
              ) {
                setMarks(false);
                onClose();
              }
            }}
          >
            Save marks
          </Button>
        </EditorSheet>
      )}
      {!!error && (
        <PixelText accessibilityRole="alert">{state.error || error}</PixelText>
      )}
      <Button primary disabled={state.busy || !draft.species} onPress={save}>
        {record ? 'Save Pokémon' : 'Add to box'}
      </Button>
    </EditorSheet>
  );
}
export function BoxEditor({ box, onClose }: { box?: Box; onClose(): void }) {
  const { colors, ui, dark } = useTheme();
  const state = useCollection();
  const [name, setName] = useState(
      box?.name ??
        `Box ${String(state.collection!.boxes.length + 1).padStart(2, '0')}`,
    ),
    [wallpaper, setWallpaper] = useState(
      box?.wallpaper?.sunMoon ??
        wallpapers[
          state.collection!.boxes.findIndex((b) => b.id === box?.id) %
            wallpapers.length
        ]?.id ??
        'sm01',
    ),
    [error, setError] = useState('');
  return (
    <EditorSheet title={box ? 'Box settings' : 'Create box'} onClose={onClose}>
      <Field label="Box name" value={name} onChange={setName} />
      {box && (
        <>
          <PixelText style={ui.label}>SUN / MOON WALLPAPER</PixelText>
          <View style={[ui.row, { gap: 8 }]}>
            {wallpapers.map((w) => (
              <Pressable
                key={w.id}
                accessibilityRole="button"
                accessibilityLabel={`Wallpaper ${w.name}`}
                accessibilityState={{ selected: wallpaper === w.id }}
                onPress={() => setWallpaper(w.id)}
                style={{
                  width: '30%',
                  flexGrow: 1,
                  padding: 4,
                  borderWidth: wallpaper === w.id ? 2 : 1,
                  borderColor: wallpaper === w.id ? colors.ink : colors.border,
                }}
              >
                <w.Preview />
                <PixelText
                  style={{ fontSize: 13, textAlign: 'center', padding: 4 }}
                >
                  {w.name}
                </PixelText>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {!!error && (
        <PixelText accessibilityRole="alert">{state.error || error}</PixelText>
      )}
      <Button
        primary
        disabled={state.busy}
        onPress={async () => {
          const result = box
            ? await state.updateBox(box.id, {
                name,
                wallpaper: { ...box.wallpaper, sunMoon: wallpaper },
              })
            : await state.addBox(name);
          if (result) onClose();
          else setError('Could not save this box.');
        }}
      >
        {box ? 'Save box' : 'Create box'}
      </Button>
    </EditorSheet>
  );
}
/**
 * The iPhone TerminalSelector: shows "Title  value ▾" and opens a panel of
 * choices with a check beside the current one.
 */
export function Selector<T>({
  title,
  value,
  choices,
  onChange,
}: {
  title: string;
  value: T;
  choices: readonly { value: T; name: string }[];
  onChange(v: T): void;
}) {
  const { colors } = useTheme(),
    [open, setOpen] = useState(false),
    current = choices.find((c) => c.value === value)?.name ?? '';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${current}`}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 40,
          paddingHorizontal: 8,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <PixelText style={{ flex: 1, fontSize: 15 }}>{title}</PixelText>
        <PixelText style={{ fontSize: 15, color: colors.accent }}>
          {current}
        </PixelText>
        <PixelText style={{ fontSize: 15 }}>▾</PixelText>
      </Pressable>
      {open && (
        <EditorSheet title={title} menu close="Close" onClose={() => setOpen(false)}>
          {choices.map((c) => (
            <Pressable
              key={c.name}
              accessibilityRole="button"
              accessibilityLabel={c.name}
              accessibilityState={{ selected: c.value === value }}
              onPress={() => {
                onChange(c.value);
                setOpen(false);
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: 44,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.panel,
              }}
            >
              <PixelText style={{ fontSize: 16 }}>{c.name}</PixelText>
              {c.value === value && <PixelText>✓</PixelText>}
            </Pressable>
          ))}
        </EditorSheet>
      )}
    </>
  );
}
/** The iPhone TerminalDisclosureGroup: a full-width row that expands its content. */
export function Disclosure({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  const { colors } = useTheme(),
    [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 44,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.panel,
        }}
      >
        <PixelText style={{ fontSize: 16 }}>{title}</PixelText>
        <PixelText>{open ? '−' : '+'}</PixelText>
      </Pressable>
      {open && children}
    </View>
  );
}
