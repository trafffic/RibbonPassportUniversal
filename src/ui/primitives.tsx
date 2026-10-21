import React from 'react';
import { Image, Pressable, Text, type TextProps, View, type ViewProps, StyleSheet } from 'react-native';
import { colors, ui } from './theme';
import { artwork } from './artwork';
import { preparedArtwork } from './prepared-artwork';
import { displayName, spriteKey } from '../domain/catalog';
import type { Pokemon } from '../domain/model';

export function PixelText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.text, style]} />;
}
export function Button({ children, onPress, disabled, primary, label, testID, art }: {
  children: string; onPress: () => void; disabled?: boolean; primary?: boolean; label?: string; testID?: string; art?: string;
}) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label ?? children} accessibilityState={{ disabled: !!disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, primary && styles.primary, disabled && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{art && <Art name={art} size={24} />}<PixelText style={[{ textAlign: 'center' }, primary && { color: colors.panel }]}>{children}</PixelText></View>
  </Pressable>;
}
export function Panel({ style, ...props }: ViewProps) { return <View {...props} style={[ui.panel, style]} />; }
export function Art({ name, size = 32, label }: { name: string; size?: number; label?: string }) {
  const source = preparedArtwork[name] ?? artwork[name];
  if (!source) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><PixelText accessibilityLabel={label}>?</PixelText></View>;
  const scale = /^game-(as|or)-(light|dark)$/.test(name) ? 20 / 24 : 1;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Image source={source} accessibilityLabel={label} accessible={!!label} resizeMode="contain" fadeDuration={0} style={{ width: size * scale, height: size * scale }} /></View>;
}
export function Sprite({ pokemon, size = 100, width = size, height = size }: { pokemon: Pokemon; size?: number; width?: number; height?: number }) {
  const original = spriteKey(pokemon);
  // Keep the iPhone app's original sprite artwork. Prepared copies only enlarge
  // existing pixels; containment below fits the complete silhouette in both axes.
  const source = preparedArtwork[original] ?? artwork[original];
  return <View style={{ width, height, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {source ? <Image source={source} accessibilityLabel={displayName(pokemon)} resizeMode="contain" fadeDuration={0} style={{ width: '100%', height: '100%' }} /> : <PixelText style={{ fontSize: 28 }} accessibilityLabel={`Artwork unavailable for ${displayName(pokemon)}`}>?</PixelText>}
  </View>;
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
