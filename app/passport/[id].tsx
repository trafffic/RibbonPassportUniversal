import React, { useState, useEffect } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCollection } from '../../src/state/CollectionProvider';
import { Shell } from '../../src/ui/Shell';
import { Button, PixelText } from '../../src/ui/primitives';
import { PassportHero, PassportOverview } from '../../src/ui/PassportPanels';
import { RibbonBoard } from '../../src/ui/RibbonBoard';
import { Journey } from '../../src/ui/Journey';
import { PCBox } from '../../src/ui/PCBox';
import { EditorSheet, PokemonEditor } from '../../src/ui/Editors';
import { BackupPanel } from '../../src/ui/BackupPanel';
import { ExportPokemon } from '../../src/ui/ExportPokemon';
import { useTheme } from '../../src/ui/theme';
import { TerminalGlyph } from '../../src/ui/TerminalGlyph';
export default function PassportScreen() {
  const { id, tab: requested } = useLocalSearchParams<{
      id: string;
      tab: string;
    }>(),
    router = useRouter(),
    state = useCollection(),
    { width } = useWindowDimensions(),
    { colors, ui } = useTheme();
  const p = state.collection?.records.find((r) => r.id === id)?.pokemon;
  const [tab, setTab] = useState(
      requested === 'ribbons'
        ? 'Ribbons'
        : requested === 'journey'
          ? 'Journey'
          : 'Overview',
    ),
    [menu, setMenu] = useState('');
  useEffect(() => {
    setTab(
      requested === 'ribbons'
        ? 'Ribbons'
        : requested === 'journey'
          ? 'Journey'
          : 'Overview',
    );
  }, [id, requested]);
  const record = state.collection?.records.find((r) => r.id === id);
  return (
    <Shell>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {width < 700 ? (
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
        {width < 700 ? (
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
      {p ? (
        <View
          style={{
            flexDirection: width >= 980 ? 'row' : 'column',
            gap: 22,
            alignItems: 'flex-start',
          }}
        >
          {width >= 980 && (
            <View style={{ width: 220 }}>
              <PCBox compact />
            </View>
          )}
          <View
            style={{
              flex: 1,
              width: width >= 980 ? undefined : '100%',
              gap: 20,
              minWidth: 0,
            }}
          >
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
          </View>
          {width >= 1100 && tab !== 'Journey' && (
            <View
              style={{
                width: 230,
                borderLeftWidth: 1,
                borderColor: colors.border,
                paddingLeft: 18,
              }}
            >
              <Journey pokemon={p} compact />
            </View>
          )}
        </View>
      ) : (
        <PixelText>Pokémon not found in this collection.</PixelText>
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
    </Shell>
  );
}
