import React from 'react';
import {
  Image,
  Pressable,
  Text,
  type TextProps,
  View,
  type ViewProps,
  StyleSheet,
  TextInput,
  Platform,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { colors, ui, useTheme } from './theme';
import { artwork } from './artwork';
import { preparedArtwork } from './prepared-artwork';
import { displayName, spriteKey, gameName } from '../domain/catalog';
import type { Pokemon } from '../domain/model';
import { gameColour } from '../domain/game-colours';
import { clampInt, isoToday } from './form-logic';
import { useLayout } from './layout';
import { consoleKey, itemKey, tintHex } from '../domain/art-ui';
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
  const { isTablet } = useLayout();
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
      style={({ pressed, hovered, focused }: any) => [
        styles.button,
        // Wide screens: size to content instead of stretching across the column.
        isTablet && { alignSelf: 'flex-start' as const },
        Platform.OS === 'web' && ({ cursor: disabled ? 'default' : 'pointer' } as any),
        hovered && !disabled && { opacity: 0.85 },
        focused && { borderWidth: 2 },
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
/** Held item with its icon and tint, as the iPhone HeldItemLabel. */
export function HeldItem({ item, size = 14 }: { item?: string; size?: number }) {
  const { colors, dark } = useTheme();
  const key = item ? itemKey(item) : '';
  const known = !!key && (preparedArtwork[key + '-' + (dark ? 'dark' : 'light')] || artwork[key]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {!!item && <Art name={known ? key : 'item-unknown'} size={size + 8} />}
      <PixelText
        style={{
          fontSize: size,
          color: item ? tintHex(key, dark) ?? colors.ink : colors.muted,
        }}
      >
        {item || 'No held item'}
      </PixelText>
    </View>
  );
}
/** Origin console icon for a Pokémon, when the catalogue knows the console. */
export function ConsoleIcon({ game, size = 18 }: { game: string; size?: number }) {
  const key = consoleKey(game);
  if (!key) return null;
  return <Art name={key + '-light'} size={size} label={'Origin console: ' + key.replace('console-', '')} />;
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
export function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange(v: number): void;
}) {
  const { ui } = useTheme();
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);
  const step = (d: number) => onChange(clampInt(value + d, min, max));
  return (
    <View style={[ui.between, { gap: 8, flexGrow: 1, flexBasis: 220 }]}>
      <PixelText style={{ fontSize: 15, flex: 1 }}>{label}</PixelText>
      <Button
        label={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => step(-1)}
      >
        −
      </Button>
      <TextInput
        accessibilityLabel={label}
        value={text}
        keyboardType="number-pad"
        returnKeyType="done"
        inputAccessoryViewID={DONE_BAR}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, '');
          if (!digits) return setText('');
          const next = clampInt(Number(digits), min, max);
          setText(String(next));
          onChange(next);
        }}
        onBlur={() => setText(String(value))}
        style={[ui.input, { width: 64, textAlign: 'center' }]}
      />
      <Button
        label={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => step(1)}
      >
        +
      </Button>
    </View>
  );
}
export const DONE_BAR = 'keyboardDone';
// iOS-only accessory bar with a Done button that dismisses the keyboard.
export function KeyboardDoneBar() {
  const { colors } = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR}>
      <View
        style={{
          alignItems: 'flex-end',
          padding: 6,
          backgroundColor: colors.panel,
          borderTopWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Button onPress={() => Keyboard.dismiss()}>Done</Button>
      </View>
    </InputAccessoryView>
  );
}
export function DateKnownField({
  value,
  onChange,
}: {
  value: string;
  onChange(v: string): void;
}) {
  const { ui } = useTheme();
  const [known, setKnown] = React.useState(value !== '');
  return (
    <View style={{ gap: 8 }}>
      <Button
        primary={known}
        onPress={() => {
          setKnown(!known);
          onChange(known ? '' : isoToday());
        }}
      >
        {known ? 'Date known ✓' : 'Date known'}
      </Button>
      {known && (
        <View style={{ gap: 7 }}>
          <PixelText style={ui.label}>DATE (YYYY-MM-DD)</PixelText>
          <TextInput
            accessibilityLabel="Date (YYYY-MM-DD)"
            value={value}
            onChangeText={(t) => onChange(t.trim())}
            inputAccessoryViewID={DONE_BAR}
            style={ui.input}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCapitalize="none"
          />
        </View>
      )}
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
