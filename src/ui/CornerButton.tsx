import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from './theme';
import { PixelText } from './primitives';
import { TerminalGlyph } from './TerminalGlyph';
import { useDensity } from './density';

import { cornerGlyph, cornerLabelled, type Glyph } from './corner-glyph';

/** The iPhone TerminalCornerButton: a bitmap glyph in a bordered square. */
export function CornerButton({
  title,
  kind,
  onPress,
  disabled,
  label,
}: {
  title: string;
  /** Spoken name when it differs from the title. */
  label?: string;
  kind?: Glyph;
  onPress(): void;
  disabled?: boolean;
}) {
  const { colors } = useTheme(),
    density = useDensity(),
    labelled = cornerLabelled(title);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 40 * density,
        minHeight: 40 * density,
        paddingHorizontal: labelled ? 8 : 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: colors.panel,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}
    >
      <View accessible={false}>
        <TerminalGlyph
          kind={kind ?? cornerGlyph(title)}
          color={colors.ink}
          size={(labelled ? 16 : 24) * density}
        />
      </View>
      {labelled && <PixelText style={{ fontSize: 14 }}>{title}</PixelText>}
    </Pressable>
  );
}
