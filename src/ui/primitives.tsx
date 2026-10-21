import React from 'react';
import { Image, Pressable, Text, type TextProps, View, type ViewProps, StyleSheet } from 'react-native';
import { colors, ui } from './theme';
import { artwork } from './artwork';
import { displayName, spriteKey } from '../domain/catalog';
import type { Pokemon } from '../domain/model';

export function PixelText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.text, style]} />;
}
export function Button({ children, onPress, disabled, primary, label, testID }: {
  children: string; onPress: () => void; disabled?: boolean; primary?: boolean; label?: string; testID?: string;
}) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label ?? children} accessibilityState={{ disabled: !!disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, primary && styles.primary, disabled && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}>
    <PixelText style={[{ textAlign: 'center' }, primary && { color: colors.panel }]}>{children}</PixelText>
  </Pressable>;
}
export function Panel({ style, ...props }: ViewProps) { return <View {...props} style={[ui.panel, style]} />; }
export function Art({ name, size = 32, label }: { name: string; size?: number; label?: string }) {
  const source = artwork[name];
  if (!source) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><PixelText accessibilityLabel={label}>?</PixelText></View>;
  return <Image source={source} accessibilityLabel={label} accessible={!!label} resizeMode="contain" style={{ width: size, height: size }} />;
}
export function Sprite({ pokemon, size = 100 }: { pokemon: Pokemon; size?: number }) {
  const key = spriteKey(pokemon);
  if (!artwork[key]) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><PixelText style={{ fontSize: 28 }} accessibilityLabel={`Artwork unavailable for ${displayName(pokemon)}`}>?</PixelText></View>;
  return <Art name={key} size={size} label={displayName(pokemon)} />;
}
export function Tag({ children }: { children: string }) {
  return <View style={styles.tag}><PixelText style={{ fontSize: 13 }}>{children}</PixelText></View>;
}
const styles = StyleSheet.create({
  text: { fontFamily: 'Pixelify', fontSize: 18, color: colors.ink, flexShrink: 1 },
  button: { borderWidth: 1, borderColor: colors.ink, backgroundColor: colors.panel, paddingHorizontal: 16, paddingVertical: 11, minHeight: 46, justifyContent: 'center' },
  primary: { backgroundColor: colors.ink },
  tag: { borderWidth: 1, borderColor: colors.border, paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.paper },
});
