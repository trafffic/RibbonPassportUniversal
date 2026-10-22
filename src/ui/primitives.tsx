import React from 'react';
import {
  Image,
  Pressable,
  Text,
  type TextProps,
  View,
  type ViewProps,
  StyleSheet,
} from 'react-native';
import { colors, ui, useTheme } from './theme';
import { artwork } from './artwork';
import { preparedArtwork } from './prepared-artwork';
import { displayName, spriteKey, gameName } from '../domain/catalog';
import type { Pokemon } from '../domain/model';
import { gameColour } from '../domain/game-colours';
export function PixelText({ style, ...props }: TextProps) {
  const { colors, ui, dark } = useTheme();
  return (
    <Text {...props} style={[styles.text, { color: colors.ink }, style]} />
  );
}
export function Button({
  children,
  onPress,
  disabled,
  primary,
  label,
  testID,
  art,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  label?: string;
  testID?: string;
  art?: string;
}) {
  const { colors, ui, dark } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={
        label ?? (typeof children === 'string' ? children : undefined)
      }
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: colors.border,
          backgroundColor: primary ? colors.accent : colors.panel,
        },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {art && <Art name={art} size={24} />}
        <PixelText
          style={[
            { textAlign: 'center', fontSize: 16 },
            art?.startsWith('game-') &&
              !primary && {
                color: gameColour(
                  art.replace(/^game-/, '').replace(/-(light|dark)$/, ''),
                  dark,
                ),
              },
            primary && { color: colors.paper },
          ]}
        >
          {children}
        </PixelText>
      </View>
    </Pressable>
  );
}
export function Panel({ style, ...props }: ViewProps) {
  const { colors, ui, dark } = useTheme();
  return <View {...props} style={[ui.panel, style]} />;
}
export function Art({
  name,
  size = 32,
  label,
}: {
  name: string;
  size?: number;
  label?: string;
}) {
  const { colors, ui, dark } = useTheme();
  name = name.replace(/-(light|dark)$/, dark ? '-dark' : '-light');
  const source = preparedArtwork[name] ?? artwork[name];
  if (!source)
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PixelText accessibilityLabel={label}>?</PixelText>
      </View>
    );
  const scale = /^game-(as|or)-(light|dark)$/.test(name) ? 20 / 24 : 1;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Image
        source={source}
        accessibilityLabel={label}
        accessible={!!label}
        resizeMode="contain"
        fadeDuration={0}
        style={{ width: size * scale, height: size * scale }}
      />
    </View>
  );
}
export function Sprite({
  pokemon,
  size = 100,
  width = size,
  height = size,
}: {
  pokemon: Pokemon;
  size?: number;
  width?: number;
  height?: number;
}) {
  const { colors, ui, dark } = useTheme();
  const original = spriteKey(pokemon);
  // Keep the iPhone app's original sprite artwork. Prepared copies only enlarge
  // existing pixels; containment below fits the complete silhouette in both axes.
  const source = preparedArtwork[original] ?? artwork[original];
  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {source ? (
        <Image
          source={source}
          accessibilityLabel={displayName(pokemon)}
          resizeMode="contain"
          fadeDuration={0}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <PixelText
          style={{ fontSize: 28 }}
          accessibilityLabel={`Artwork unavailable for ${displayName(pokemon)}`}
        >
          ?
        </PixelText>
      )}
    </View>
  );
}
export function Tag({ children }: { children: string }) {
  const { colors, ui, dark } = useTheme();
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: colors.paper, borderColor: colors.border },
      ]}
    >
      <PixelText style={{ fontSize: 13 }}>{children}</PixelText>
    </View>
  );
}
export function GameLabel({
  game,
  size = 17,
}: {
  game: string;
  size?: number;
}) {
  const { dark } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        flexShrink: 1,
      }}
    >
      <Art name={`game-${game}-${dark ? 'dark' : 'light'}`} size={size + 8} />
      <PixelText style={{ fontSize: size, color: gameColour(game, dark) }}>
        {gameName(game)}
      </PixelText>
    </View>
  );
}
const styles = StyleSheet.create({
  text: {
    fontFamily: 'Pixelify',
    fontSize: 18,
    color: colors.ink,
    flexShrink: 1,
  },
  button: {
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.panel,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 46,
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.ink },
  tag: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 9,
    backgroundColor: colors.paper,
  },
});
