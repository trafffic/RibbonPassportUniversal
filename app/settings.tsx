import React, { useState } from 'react';
import { Linking, View, TextInput } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCollection } from '../src/state/CollectionProvider';
import { updateMetadata } from '../src/domain/passport';
import { community } from '../src/domain/community';
import { catalog } from '../src/domain/catalog';
import { useTheme } from '../src/ui/theme';
import { Shell } from '../src/ui/Shell';
import { Button, Panel, PixelText, Art } from '../src/ui/primitives';
import { BackupPanel } from '../src/ui/BackupPanel';
import { EditorSheet } from '../src/ui/Editors';
import { CommunityLink, SourceLinks } from '../src/ui/Community';
const rarity =
  (
    require('../assets/data/catalog.json') as {
      rarity?: Record<string, { score?: number; tier: string; reason: string }>;
    }
  ).rarity ?? {};
export default function Settings() {
  const state = useCollection(),
    router = useRouter(),
    { colors, ui } = useTheme();
  const [sheet, setSheet] = useState(''),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('All');
  const sources = community.sources
    .filter((s) => {
      const matches =
        category === 'All' ||
        (category === 'Artwork'
          ? s.kind === 'app-assets'
          : category === 'Official'
            ? s.kind === 'official'
            : s.kind !== 'app-assets' && s.kind !== 'official');
      return (
        matches &&
        (s.title + ' ' + s.author + ' ' + s.url)
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort((a, b) =>
      a.author.localeCompare(b.author, undefined, { numeric: true }),
    );
  const ranked = Object.keys(catalog.ribbons).sort((a, b) => {
    const score = (id: string) => rarity[id]?.score ?? 0;
    return (
      score(b) - score(a) ||
      (catalog.ribbons[a] ?? a).localeCompare(catalog.ribbons[b] ?? b) ||
      (a < b ? -1 : 1)
    );
  });
  return (
    <Shell narrow>
      <PixelText accessibilityRole="header" style={{ fontSize: 25 }}>
        SETTINGS
      </PixelText>
      <PixelText style={ui.heading}>Appearance</PixelText>
      <View style={ui.row}>
        {(['automatic', 'light', 'dark'] as const).map((a) => (
          <Button
            key={a}
            primary={(state.collection?.appearance ?? 'dark') === a}
            onPress={() =>
              state.mutate((c, ctx) =>
                updateMetadata(c, { appearance: a }, ctx),
              )
            }
          >
            {a === 'automatic'
              ? 'Follow device'
              : a === 'dark'
                ? 'Dark'
                : 'Light'}
          </Button>
        ))}
      </View>
      <PixelText style={ui.heading}>Collection</PixelText>
      <Button onPress={() => setSheet('App backup')}>App backup</Button>
      <Button onPress={() => router.push('/recovery')}>Recovery history</Button>
      <Button onPress={state.reload}>Reload saved collection</Button>
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        Your collection lives only on this device. Export a backup regularly.
      </PixelText>
      <PixelText style={ui.heading}>Rarity</PixelText>
      <Button onPress={() => setSheet('Estimated rarity guide')}>
        Estimated rarity guide
      </Button>
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        Rankings are editorial estimates of availability and acquisition
        challenge, not measured ownership percentages.
      </PixelText>
      <PixelText style={ui.heading}>Credits</PixelText>
      <Button onPress={() => setSheet('Sources & credits')}>
        Sources & credits
      </Button>
      <View style={ui.row}>
        <Button onPress={() => router.push('/library')}>Team library</Button>
        <Button onPress={() => router.push('/guides')}>Field guides</Button>
      </View>
      <PixelText style={ui.heading}>About</PixelText>
      <Button onPress={() => Linking.openURL('https://ribbons.guide/')}>
        Open ribbons.guide
      </Button>
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        Unofficial fan app. Pokémon artwork © its respective owners. Pixelify
        Sans is bundled under SIL OFL 1.1.
      </PixelText>
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        Ribbon Passport {Constants.expoConfig?.version ?? ''}
      </PixelText>
      {!!sheet && (
        <EditorSheet
          title={sheet}
          close={sheet === 'App backup' ? 'Cancel' : 'Done'}
          onClose={() => setSheet('')}
        >
          {sheet === 'App backup' ? (
            <BackupPanel onClose={() => setSheet('')} />
          ) : sheet === 'Sources & credits' ? (
            <>
              <CommunityLink
                title="App credits & licences"
                subtitle="Artwork, data, font and software notices"
                onPress={() => {
                  setSheet('');
                  router.push('/credits');
                }}
              />
              <TextInput
                accessibilityLabel="Find an author or website"
                value={query}
                onChangeText={setQuery}
                style={ui.input}
                placeholder="Find an author or website"
                placeholderTextColor={colors.muted}
              />
              <View style={ui.row}>
                {['All', 'Guides', 'Official', 'Artwork'].map((c) => (
                  <Button
                    key={c}
                    primary={category === c}
                    onPress={() => setCategory(c)}
                  >
                    {c}
                  </Button>
                ))}
              </View>
              <SourceLinks ids={sources.map((s) => s.id)} />
              {!sources.length && (
                <PixelText>No sources match this search.</PixelText>
              )}
            </>
          ) : (
            <>
              {ranked.map((id) => (
                <Panel key={id}>
                  <View style={ui.row}>
                    <Art name={'award-' + id} size={28} />
                    <PixelText>{catalog.ribbons[id] ?? id}</PixelText>
                  </View>
                  <PixelText>
                    {rarity[id]?.tier ?? '?'} ·{' '}
                    {rarity[id]?.reason ?? 'Unranked'}
                  </PixelText>
                </Panel>
              ))}
            </>
          )}
        </EditorSheet>
      )}
    </Shell>
  );
}
