import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Pokemon } from '../domain/model';
import { awardName, displayName } from '../domain/catalog';
import { transferCheck } from '../domain/rules';
import { useCollection } from '../state/CollectionProvider';
import { useTheme } from './theme';
import { Density } from './density';
import { useLayout } from './layout';
import { Art, PixelText } from './primitives';
import { PCBox } from './PCBox';
import { PassportPane } from './PassportPane';
import { TransferSheet, TransferStatus } from './PassportPanels';
import { Journey } from './Journey';
import { Missing } from './Missing';
import { BuildDetail, TeamsRail } from './BuildSummary';

type Kind = 'ribbon' | 'showdown';

/**
 * The desktop studio: a boxes rail, the PC, the main pane and an inspector,
 * each scrolling on its own so the page itself never scrolls.
 */
export function StudioPanes({
  rail,
  box,
  main,
  inspector,
}: {
  rail: React.ReactNode;
  box: React.ReactNode;
  main: React.ReactNode;
  inspector: React.ReactNode;
}) {
  const { colors } = useTheme(),
    { width } = useLayout();
  const pane = (
    content: React.ReactNode,
    style: object,
    label: string,
    last = false,
  ) => (
    <View
      accessibilityLabel={label}
      style={[
        {
          minHeight: 0,
          borderRightWidth: last ? 0 : 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    </View>
  );
  return (
    <Density scale={0.8}>
      <View
        testID="studio"
        style={{
          flex: 1,
          minHeight: 0,
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.paper,
        }}
      >
        {width >= 1280 && pane(rail, { width: 160 }, 'Boxes and teams')}
        {pane(box, { width: width >= 1440 ? 330 : 290 }, 'Pokémon storage')}
        {pane(main, { flex: 1, minWidth: 0 }, 'Selected Pokémon')}
        {pane(inspector, { width: width >= 1440 ? 300 : 260 }, 'Details', true)}
      </View>
    </Density>
  );
}

function RailHeading({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <PixelText style={{ fontSize: 12, color: colors.muted, letterSpacing: 1 }}>
      {children}
    </PixelText>
  );
}

function RailItem({
  label,
  a11y,
  value,
  selected,
  onPress,
}: {
  label: string;
  /** Spoken name; rail rows must not share names with the PC's own buttons. */
  a11y?: string;
  value?: string | number;
  selected?: boolean;
  onPress(): void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 6,
        backgroundColor: selected ? colors.board : 'transparent',
      }}
    >
      <PixelText
        numberOfLines={1}
        style={{
          fontSize: 14,
          flex: 1,
          color: selected ? colors.accent : colors.ink,
        }}
      >
        {label}
      </PixelText>
      {value !== undefined && (
        <PixelText style={{ fontSize: 13, color: colors.muted }}>
          {value}
        </PixelText>
      )}
    </Pressable>
  );
}

/** Left rail: boxes with their counts, the party and this section's teams. */
export function StudioRail({ kind }: { kind: Kind }) {
  const state = useCollection(),
    router = useRouter(),
    c = state.collection!;
  const records = c.records.filter((r) =>
      kind === 'showdown' ? !!r.pokemon.showdownSet : !r.pokemon.showdownSet,
    ),
    byID = new Map(records.map((r) => [r.id, r.pokemon]));
  const boxes = c.boxes.filter((b) => (b.kind ?? 'ribbon') === kind),
    party = c.partyIDs.map((id) => byID.get(id)).filter(Boolean) as Pokemon[],
    teams = (c.teams ?? []).filter(
      (t) => t.memberIDs.length > 0 && t.memberIDs.every((id) => byID.has(id)),
    );
  return (
    <>
      <RailHeading>BOXES</RailHeading>
      {boxes.map((b) => (
        <RailItem
          key={b.id}
          label={b.name}
          a11y={`${b.name}, ${b.slots.filter(Boolean).length} Pokémon`}
          value={b.slots.filter(Boolean).length}
          selected={b.id === c.selectedBoxID}
          onPress={() => state.selectBox(b.id)}
        />
      ))}
      <RailHeading>PARTY</RailHeading>
      {party.length ? (
        party.map((p) => (
          <RailItem
            key={p.id}
            label={displayName(p)}
            a11y={`Party: ${displayName(p)}`}
            value={p.currentlevel}
            selected={p.id === c.selectedID}
            onPress={() => state.select(p.id)}
          />
        ))
      ) : (
        <PixelText style={{ fontSize: 13 }}>No party yet.</PixelText>
      )}
      <RailHeading>TEAMS</RailHeading>
      {teams.map((t) => (
        <RailItem
          key={t.id}
          label={t.name}
          a11y={`Team: ${t.name}`}
          value={t.memberIDs.length}
          selected={t.id === c.selectedTeamID}
          onPress={() =>
            router.push({
              pathname: '/teams/[id]',
              params: { id: t.id },
            } as never)
          }
        />
      ))}
      <RailItem
        label="All teams ›"
        onPress={() => router.push({ pathname: '/teams', params: { kind } })}
      />
    </>
  );
}

/** Right inspector for a ribbon Pokémon: transfer check, can-wait list, Journey. */
export function PassportInspector({ pokemon: p }: { pokemon: Pokemon }) {
  const { colors } = useTheme(),
    [transfer, setTransfer] = useState(false);
  const t = transferCheck(p.currentgame, p);
  return (
    <>
      <RailHeading>TRANSFER CHECK</RailHeading>
      <TransferStatus pokemon={p} onPress={() => setTransfer(true)} />
      {t.canWait.length > 0 && (
        <>
          <RailHeading>{`CAN WAIT · ${t.canWait.length}`}</RailHeading>
          {t.canWait.slice(0, 3).map((id) => (
            <View
              key={id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Art name={'award-' + id} size={20} />
              <PixelText numberOfLines={1} style={{ fontSize: 13, flex: 1 }}>
                {awardName(id)}
              </PixelText>
            </View>
          ))}
          {t.canWait.length > 3 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setTransfer(true)}
            >
              <PixelText style={{ fontSize: 13, color: colors.muted }}>
                {`${t.canWait.length - 3} more ›`}
              </PixelText>
            </Pressable>
          )}
        </>
      )}
      <Journey pokemon={p} compact />
      {transfer && (
        <TransferSheet pokemon={p} onClose={() => setTransfer(false)} />
      )}
    </>
  );
}

/** Ribbons studio. `id` comes from a /passport link and selects that Pokémon. */
export function RibbonStudio({
  id,
  requested,
}: {
  id?: string;
  requested?: string;
}) {
  const state = useCollection(),
    c = state.collection!;
  useEffect(() => {
    if (id && c.selectedID !== id && c.records.some((r) => r.id === id))
      state.select(id);
  }, [id]);
  const ribbon = c.records.filter((r) => !r.pokemon.showdownSet);
  const missing = !!id && !c.records.some((r) => r.id === id);
  const p = missing
    ? undefined
    : (ribbon.find((r) => r.id === (id ?? c.selectedID))?.pokemon ??
      ribbon.find((r) => r.id === c.selectedID)?.pokemon ??
      ribbon[0]?.pokemon);
  return (
    <StudioPanes
      rail={<StudioRail kind="ribbon" />}
      box={<PCBox />}
      main={
        missing ? (
          <Missing message="This Pokémon is no longer in your collection." />
        ) : p ? (
          <PassportPane key={p.id} id={p.id} requested={requested} studio />
        ) : (
          <EmptyPane text="Add a Pokémon or try the demo to see its passport here." />
        )
      }
      inspector={
        p ? (
          <PassportInspector pokemon={p} />
        ) : (
          <EmptyPane text="Transfer checks and Journey appear here." />
        )
      }
    />
  );
}

/** Competitive studio: the build in the main pane and teams on the right. */
export function CompetitiveStudio() {
  const c = useCollection().collection!;
  const builds = c.records.filter((r) => r.pokemon.showdownSet);
  const p =
    builds.find((r) => r.id === c.selectedID)?.pokemon ?? builds[0]?.pokemon;
  return (
    <StudioPanes
      rail={<StudioRail kind="showdown" />}
      box={<PCBox kind="showdown" />}
      main={
        p ? (
          <BuildDetail pokemon={p} />
        ) : (
          <EmptyPane text="Import a Showdown team or add a Pokémon to see its build here." />
        )
      }
      inspector={
        <TeamsRail
          teams={(c.teams ?? []).filter(
            (t) =>
              t.memberIDs.length > 0 &&
              t.memberIDs.every((id) => builds.some((r) => r.id === id)),
          )}
        />
      }
    />
  );
}

function EmptyPane({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <PixelText style={{ color: colors.muted, fontSize: 15 }}>{text}</PixelText>
  );
}
