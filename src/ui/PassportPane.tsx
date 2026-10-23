import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCollection } from '../state/CollectionProvider';
import { Button, PixelText } from './primitives';
import { PassportHero, PassportOverview } from './PassportPanels';
import { RibbonBoard } from './RibbonBoard';
import { Journey } from './Journey';
import {
  EditorSheet,
  MenuItem,
  PokemonEditor,
  useAnchor,
} from './Editors';
import { CornerButton } from './CornerButton';
import { displayName } from '../domain/catalog';
import { ExportPokemon } from './ExportPokemon';
import { useTheme } from './theme';
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
  const menuAnchor = useAnchor();
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
        {isPhone ? (
          <CornerButton
            title="Back"
            kind="back"
            label="Back to storage"
            onPress={() => router.replace('/')}
          />
        ) : (
          <Button onPress={() => router.replace('/')}>← Back to storage</Button>
        )}
        <PixelText
          accessibilityRole="header"
          numberOfLines={1}
          style={{ fontSize: 20, flexShrink: 1 }}
        >
          {tab === 'Ribbons' ? displayName(p).toUpperCase() : 'PASSPORT'}
        </PixelText>
        <View ref={menuAnchor.ref} collapsable={false}>
          <CornerButton
            title="Options"
            label="Passport options"
            onPress={() => menuAnchor.measure(() => setMenu('Options'))}
          />
        </View>
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
        <EditorSheet
          title="Options"
          menu
          close="Close"
          anchor={menuAnchor.rect}
          onClose={() => setMenu('')}
        >
          <MenuItem onPress={() => setMenu('Edit')}>Edit Pokémon</MenuItem>
          <MenuItem
            onPress={() => {
              setMenu('');
              router.push({
                pathname: '/notebook/[id]',
                params: { id, section: 'visits' },
              });
            }}
          >
            Edit visits
          </MenuItem>
          {['Milestones', 'Memories', 'Move Dex'].map((section) => (
            <MenuItem
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
            </MenuItem>
          ))}
          <MenuItem
            onPress={() => {
              setMenu('');
              router.push({
                pathname: '/guides',
                params: { game: p?.currentgame },
              });
            }}
          >
            Ribbon field guides
          </MenuItem>
          <MenuItem glyph="export" onPress={() => setMenu('Backups')}>
          Export
        </MenuItem>
          <MenuItem
            onPress={() => {
              setMenu('');
              router.push('/recovery');
            }}
          >
            Saved versions
          </MenuItem>
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
        <EditorSheet title="Export" close="Done" onClose={() => setMenu('')}>
          <ExportPokemon id={id} />
        </EditorSheet>
      )}
    </View>
  );
}
