import React from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { Art, PixelText } from './primitives';
import { preparedArtwork } from './prepared-artwork';
import { TerminalGlyph } from './TerminalGlyph';
import { useTheme } from './theme';

type Action = 'add' | 'import' | 'demo' | 'library';
type LandingCard = {
  title: string;
  label: string;
  description: string;
  action: Action;
  sprites: string[];
  ribbon: string;
};
const pages = {
  ribbon: {
    title: 'Ribbon Pokémon',
    description: 'Record ribbons and keep a passport for each Pokémon.',
    hero: [
      { species: 'raichu-alola', shiny: true },
      { species: 'jirachi', shiny: false },
      { species: 'latias', shiny: false },
    ],
    ribbons: ['champion', 'best-friends'],
    cards: [
      { title: 'Add Pokémon', label: 'Add Pokémon', description: 'Create a passport and record ribbons.', action: 'add', sprites: ['raikou'], ribbon: 'champion' },
      { title: 'Import backup', label: 'Import ribbons.guide backup', description: 'Import your collection from ribbons.guide.', action: 'import', sprites: ['latios', 'rayquaza'], ribbon: 'best-friends' },
      { title: 'Try demo', label: 'Try demo', description: 'Explore sample Pokémon, ribbons and journey notes.', action: 'demo', sprites: ['pelipper', 'durant'], ribbon: 'contest-star' },
    ] satisfies LandingCard[],
  },
  showdown: {
    title: 'Competitive Pokémon',
    description: 'Store builds, import Showdown teams and manage personal teams.',
    hero: [
      { species: 'garchomp', shiny: false },
      { species: 'metagross', shiny: false },
      { species: 'rotom-wash', shiny: false },
    ],
    ribbons: ['winning', 'champion'],
    cards: [
      { title: 'Import Showdown', label: 'Import Showdown team', description: 'Paste a team to add its Pokémon and builds.', action: 'import', sprites: ['chi-yu', 'flutter-mane', 'brute-bonnet'], ribbon: 'winning' },
      { title: 'Add Pokémon', label: 'Add Pokémon', description: 'Add one Pokémon and enter its build.', action: 'add', sprites: ['scizor-mega'], ribbon: 'effort' },
      { title: 'Team library', label: 'Browse community teams', description: 'Browse teams and save an editable copy.', action: 'library', sprites: ['lunala', 'kingdra'], ribbon: 'champion' },
    ] satisfies LandingCard[],
  },
};

/** Decorative, bundled artwork; these Pokémon are not collection records. */
function LandingSprite({ species, size, shiny = false }: { species: string; size: number; shiny?: boolean }) {
  return (
    <Image
      testID={`landing-sprite-${shiny ? 'shiny-' : ''}${species}`}
      accessible={false}
      source={preparedArtwork[`sprite-${shiny ? 'shiny' : 'regular'}_${species}`]}
      resizeMode="contain"
      fadeDuration={0}
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}

export function CollectionLanding({
  kind,
  disabled,
  onAdd,
  onImport,
  onDemo,
  onLibrary,
}: {
  kind: 'ribbon' | 'showdown';
  disabled: boolean;
  onAdd(): void;
  onImport(): void;
  onDemo(): void;
  onLibrary(): void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const phone = width < 700;
  const page = pages[kind];
  const actions = { add: onAdd, import: onImport, demo: onDemo, library: onLibrary };
  const heroWidth = phone ? Math.min(280, width - 64) : 320;

  return (
    <View testID="collection-landing" style={{ flexGrow: 1, gap: phone ? 24 : 32 }}>
      <View style={{ flexDirection: phone ? 'column' : 'row', alignItems: phone ? 'stretch' : 'center', gap: 24, paddingVertical: phone ? 8 : 24 }}>
        <View style={{ flex: phone ? undefined : 1, gap: 14, minWidth: 0 }}>
          <PixelText style={{ fontSize: 12, color: colors.muted }}>0 Pokémon</PixelText>
          <PixelText accessibilityRole="header" style={{ fontSize: phone ? 28 : 36 }}>{page.title}</PixelText>
          <PixelText style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>{page.description}</PixelText>
        </View>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ width: heroWidth, height: phone ? 140 : 165, alignSelf: 'center' }}
        >
          <View style={{ position: 'absolute', bottom: 10, left: 8, right: 8, height: 20, borderRadius: 100, backgroundColor: colors.board }} />
          {page.hero.map(({ species, shiny }, index) => {
            const size = phone ? 94 : 110;
            return (
              <View key={species} style={{ position: 'absolute', left: index * (heroWidth - size) / 2, bottom: index === 1 ? 26 : 12, zIndex: index === 1 ? 1 : 2 }}>
                <LandingSprite species={species} shiny={shiny} size={size} />
              </View>
            );
          })}
          <View style={{ position: 'absolute', right: 8, top: 0, flexDirection: 'row', gap: 12 }}>
            {page.ribbons.map(ribbon => <Art key={ribbon} name={`award-${ribbon}-ribbon`} size={24} />)}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: phone ? 'column' : 'row', gap: 16 }}>
        {page.cards.map((card, index) => (
          <Pressable
            key={card.action}
            testID={`landing-action-${card.action}`}
            accessibilityRole="button"
            accessibilityLabel={card.label}
            accessibilityHint={card.description}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={actions[card.action]}
            style={({ hovered, pressed, focused }: any) => ({
              flex: phone ? undefined : 1,
              minWidth: 0,
              flexDirection: phone ? 'row' : 'column',
              borderWidth: 1,
              borderColor: index === 0 || hovered || focused ? colors.accent : colors.border,
              backgroundColor: pressed || hovered ? colors.board : colors.panel,
              opacity: disabled ? 0.5 : 1,
              minHeight: phone ? 145 : 280,
            })}
          >
            {index === 0 && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.accent }} />}
            <View style={{ flex: phone ? 1 : undefined, padding: phone ? 16 : 22, gap: 14, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <PixelText style={{ flex: 1, fontSize: phone ? 18 : 22 }}>{card.title}</PixelText>
                <View testID="landing-pixel-arrow" style={{ paddingTop: 3 }}>
                  <TerminalGlyph kind="northEast" color={colors.accent} size={16} />
                </View>
              </View>
              <PixelText style={{ fontSize: phone ? 14 : 15, lineHeight: 22, color: colors.muted }}>{card.description}</PixelText>
            </View>
            <View
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ width: phone ? 86 : '100%', height: phone ? undefined : 150, minHeight: phone ? 145 : undefined, marginTop: phone ? 0 : 'auto', alignItems: 'center', justifyContent: 'center', borderLeftWidth: phone ? 1 : 0, borderColor: colors.border }}
            >
              <View style={{ position: 'absolute', bottom: 18, left: '23%', right: '23%', height: 11, borderRadius: 100, backgroundColor: colors.paper }} />
              <View style={{ flexDirection: phone ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: phone ? 0 : 4 }}>
                {card.sprites.map(species => <LandingSprite key={species} species={species} size={phone ? card.sprites.length === 3 ? 43 : card.sprites.length === 2 ? 54 : 66 : card.sprites.length === 3 ? 56 : 76} />)}
              </View>
              <View style={{ position: 'absolute', top: 10, left: phone ? 4 : 22 }}>
                <Art name={`award-${card.ribbon}-ribbon`} size={phone ? 19 : 30} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <View
        testID="landing-reference"
        style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 16, paddingBottom: 8, gap: 6, alignItems: 'flex-start' }}
      >
        <PixelText style={{ fontSize: 13, lineHeight: 20, color: colors.muted }}>Ribbon Passport is not affiliated with ribbons.guide.</PixelText>
        <Link
          href="https://ribbons.guide"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'Pixelify', fontSize: 13, lineHeight: 20, color: colors.muted, textDecorationLine: 'underline' }}
        >
          for a tracker made free from ai go to ribbons.guide
        </Link>
      </View>
    </View>
  );
}
