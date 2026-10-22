import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
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
export default function Settings() {
  const state = useCollection(),
    router = useRouter(),
    { colors, ui } = useTheme();
  const [sheet, setSheet] = useState(''),
    [query, setQuery] = useState('');
  return (
    <Shell>
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
      <PixelText style={ui.heading}>Rarity</PixelText>
      <Button onPress={() => setSheet('Estimated rarity guide')}>
        Estimated rarity guide
      </Button>
      <PixelText style={ui.heading}>Credits</PixelText>
      <Button onPress={() => setSheet('Sources & credits')}>
        Sources & credits
      </Button>
      <View style={ui.row}>
        <Button onPress={() => router.push('/library')}>Team library</Button>
        <Button onPress={() => router.push('/guides')}>Field guides</Button>
      </View>
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        Unofficial fan app. Pokémon artwork © its respective owners. Pixelify
        Sans is bundled under SIL OFL 1.1.
      </PixelText>
      {!!sheet && (
        <EditorSheet title={sheet} onClose={() => setSheet('')}>
          {sheet === 'App backup' ? (
            <BackupPanel onClose={() => setSheet('')} />
          ) : sheet === 'Sources & credits' ? (
            <>
              <TextInput
                accessibilityLabel="Find an author or website"
                value={query}
                onChangeText={setQuery}
                style={ui.input}
                placeholder="Find an author or website"
                placeholderTextColor={colors.muted}
              />
              <SourceLinks
                ids={community.sources
                  .filter((s) =>
                    (s.author + ' ' + s.title + ' ' + s.url)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((s) => s.id)}
              />
            </>
          ) : (
            <>
              <PixelText>
                Rankings are editorial estimates of availability and acquisition
                challenge, not measured ownership percentages. Top-three
                displays show ribbons; full boards and totals include marks.
              </PixelText>
              {Object.entries(
                (
                  require('../assets/data/catalog.json') as {
                    rarity: Record<
                      string,
                      {
                        tier: string;
                        reason: string;
                      }
                    >;
                  }
                ).rarity ?? {},
              ).map(([id, r]) => (
                <Panel key={id}>
                  <View style={ui.row}>
                    <Art name={'award-' + id} size={28} />
                    <PixelText>{catalog.ribbons[id] ?? id}</PixelText>
                  </View>
                  <PixelText>
                    {r.tier} · {r.reason}
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
