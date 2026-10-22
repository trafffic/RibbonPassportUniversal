import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Pokemon } from '../domain/model';
import { useTheme } from './theme';
import { PixelText } from './primitives';
import { PassportHero, PassportOverview } from './PassportPanels';
export function PokemonSummary({
  pokemon,
  full = false,
}: {
  pokemon: Pokemon;
  full?: boolean;
}) {
  const { colors } = useTheme(),
    router = useRouter(),
    open = () =>
      router.push({
        pathname: '/passport/[id]',
        params: { id: pokemon.id, tab: 'overview' },
      });
  return (
    <View
      style={{
        borderWidth: full ? 0 : 1,
        borderColor: colors.border,
        padding: full ? 0 : 18,
        gap: 14,
      }}
    >
      {!full && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open passport preview"
          onPress={open}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderColor: colors.border,
            minHeight: 38,
          }}
        >
          <PixelText style={{ fontSize: 13, color: colors.muted }}>
            PASSPORT PREVIEW
          </PixelText>
          <PixelText>↗</PixelText>
        </Pressable>
      )}
      <Pressable
        accessibilityRole={!full ? 'button' : undefined}
        accessibilityLabel={!full ? 'Open full passport' : undefined}
        onPress={!full ? open : undefined}
      >
        <PassportHero pokemon={pokemon} />
      </Pressable>
      {!full && <PassportOverview pokemon={pokemon} />}
    </View>
  );
}
