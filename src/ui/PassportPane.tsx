import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCollection } from '../state/CollectionProvider';
import { Button, PixelText } from './primitives';
import { PassportHero, PassportOverview } from './PassportPanels';
import { RibbonBoard } from './RibbonBoard';
import { Journey } from './Journey';
import { EditorSheet, PokemonEditor } from './Editors';
import { ExportPokemon } from './ExportPokemon';
import { useTheme } from './theme';
import { TerminalGlyph } from './TerminalGlyph';
import { useLayout } from './layout';
import { Missing } from './Missing';

const tabFor = (requested?: string) =>
  requested === 'ribbons'
    ? 'Ribbons'
    : requested === 'journey'
      ? 'Journey'
      : 'Overview';

/**
 * One Pokémon's passport: header, Overview / Ribbons / Journey tabs and the
 * passport options. Used full-screen on phones and as the studio's main pane.
 */
export function PassportPane({
  id,
  requested,
  studio = false,
}: {
  id: string;
  requested?: string;
  studio?: boolean;
}) {
  const router = useRouter(),
    state = useCollection(),
    { isPhone } = useLayout(),
    { colors, ui } = useTheme();
  const record = state.collection?.records.find((r) => r.id === id),
    p = record?.pokemon;
  const [tab, setTab] = useState(tabFor(requested)),
    [menu, setMenu] = useState('');
  useEffect(() => setTab(tabFor(requested)), [id, requested]);
  if (!p)
    return <Missing message="This Pokémon is no longer in your collection." />;
  return (
    <View style={{ gap: studio ? 14 : 20, minWidth: 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {studio ? (
          <View />
        ) : isPhone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to storage"
            onPress={() => router.replace('/')}
            style={{
              width: 42,
              height: 42,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.panel,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TerminalGlyph kind="back" color={colors.ink} size={20} />
          </Pressable>
        ) : (
          <Button onPress={() => router.replace('/')}>← Back to storage</Button>
        )}
        <PixelText accessibilityRole="header" style={{ fontSize: 20 }}>
          PASSPORT
        </PixelText>
        {isPhone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Passport options"
            onPress={() => setMenu('Options')}
            style={{
              width: 42,
              height: 42,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.panel,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TerminalGlyph kind="options" color={colors.ink} size={20} />
          </Pressable>
        ) : (
          <Button onPress={() => setMenu('Options')}>Options</Button>
        )}
      </View>
      {tab === 'Overview' && <PassportHero pokemon={p} />}
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Passport sections"
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        {['Overview', 'Ribbons', 'Journey'].map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityLabel={t}
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 2,
              borderColor: tab === t ? colors.accent : 'transparent',
            }}
          >
            <PixelText
              style={{
                fontSize: 16,
                color: tab === t ? colors.accent : colors.muted,
              }}
            >
              {t}
            </PixelText>
          </Pressable>
        ))}
      </View>
      {tab === 'Overview' ? (
        <PassportOverview pokemon={p} />
      ) : tab === 'Ribbons' ? (
        <RibbonBoard key={p.id} pokemon={p} planner />
      ) : (
        <Journey pokemon={p} />
      )}
      {menu === 'Options' && (
        <EditorSheet title="Passport options" onClose={() => setMenu('')}>
          <Button onPress={() => setMenu('Edit')}>Edit Pokémon</Button>
          <Button
            onPress={() => {
              setMenu('');
              router.push({
                pathname: '/notebook/[id]',
                params: { id, section: 'visits' },
              });
            }}
          >
            Edit visits
          </Button>
          {['Milestones', 'Memories', 'Move Dex'].map((section) => (
            <Button
              key={section}
              onPress={() => {
                setMenu('');
                router.push({
                  pathname: '/notebook/[id]',
                  params: { id, section },
                });
              }}
            >
              {section}
            </Button>
          ))}
          <Button
            onPress={() => {
              setMenu('');
              router.push({
                pathname: '/guides',
                params: { game: p?.currentgame },
              });
            }}
          >
            Ribbon field guides
          </Button>
          <Button onPress={() => setMenu('Backups')}>Export</Button>
          <Button
            onPress={() => {
              setMenu('');
              router.push('/recovery');
            }}
          >
            Saved versions
          </Button>
        </EditorSheet>
      )}
      {menu === 'Edit' && record && (
        <PokemonEditor
          record={record}
          boxID={state.collection!.selectedBoxID}
          onClose={() => setMenu('')}
        />
      )}
      {menu === 'Backups' && (
        <EditorSheet title="Export" onClose={() => setMenu('')}>
          <ExportPokemon id={id} />
        </EditorSheet>
      )}
    </View>
  );
}
