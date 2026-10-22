import React from 'react';
import { View } from 'react-native';
// Original bitmap glyphs from Shared/RetroStyle.swift, not platform emoji.
const glyphs = {
  back: [
    '00010000',
    '00110000',
    '01111111',
    '11111111',
    '01111111',
    '00110000',
    '00010000',
    '00000000',
  ],
  options: [
    '01000000',
    '11111111',
    '01000000',
    '00000100',
    '11111111',
    '00000100',
    '00100000',
    '11111111',
  ],
  ribbons: [
    '00111100',
    '01100110',
    '11011011',
    '11011011',
    '01100110',
    '00111100',
    '00100100',
    '01100110',
  ],
  competitive: [
    '00011000',
    '00110000',
    '01100000',
    '11111110',
    '00011100',
    '00111000',
    '01110000',
    '01100000',
  ],
  settings: [
    '00111100',
    '10111101',
    '11100111',
    '11000011',
    '11000011',
    '11100111',
    '10111101',
    '00111100',
  ],
};
export function TerminalGlyph({
  kind,
  color,
  size = 24,
}: {
  kind: keyof typeof glyphs;
  color: string;
  size?: number;
}) {
  const unit = Math.floor(size / 8),
    offset = (size - unit * 8) / 2;
  return (
    <View accessible={false} style={{ width: size, height: size }}>
      {glyphs[kind].flatMap((row, y) =>
        [...row].map((pixel, x) =>
          pixel === '1' ? (
            <View
              key={y + ':' + x}
              style={{
                position: 'absolute',
                left: offset + x * unit,
                top: offset + y * unit,
                width: unit,
                height: unit,
                backgroundColor: color,
              }}
            />
          ) : null,
        ),
      )}
    </View>
  );
}
