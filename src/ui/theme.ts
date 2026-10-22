import { StyleSheet } from 'react-native';
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useCollection } from '../state/CollectionProvider';
export const lightColors = {
  paper: '#E6EDDB',
  panel: '#F7F9EE',
  ink: '#2D412B',
  muted: '#566C48',
  board: '#D2DFBA',
  border: '#9BAD80',
  accent: '#4B7030',
  dark: '#2C3D2A',
  warning: '#F5DEB6',
  warningInk: '#713709',
  white: '#FFFFFF',
};
export const darkColors: typeof lightColors = {
  paper: '#1E2C1F',
  panel: '#2C3D2A',
  ink: '#EBF3D8',
  muted: '#B5C9A3',
  board: '#3C5132',
  border: '#667D52',
  accent: '#BEDB8C',
  dark: '#1E2C1F',
  warning: '#4D341F',
  warningInk: '#FFD38B',
  white: '#FFFFFF',
};
export const colors = darkColors;
const styles = (colors: typeof lightColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.paper },
    content: {
      width: '100%',
      maxWidth: 1240,
      alignSelf: 'center',
      padding: 24,
      gap: 22,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    },
    between: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    },
    panel: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      gap: 18,
    },
    label: { fontSize: 13, color: colors.muted, letterSpacing: 1.4 },
    heading: { fontSize: 30, color: colors.ink },
    body: { fontSize: 18, color: colors.ink },
    muted: { color: colors.muted },
    rule: { borderTopWidth: 1, borderColor: colors.border },
    input: {
      fontFamily: 'Pixelify',
      color: colors.ink,
      fontSize: 18,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
    },
  });
export const ui = styles(colors);
const ThemeContext = createContext({ colors, ui, dark: true });
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }: React.PropsWithChildren) {
  const { collection } = useCollection(),
    system = useColorScheme();
  const dark =
    collection?.appearance === 'light'
      ? false
      : collection?.appearance === 'automatic'
        ? system === 'dark'
        : true;
  const value = useMemo(() => {
    const colors = dark ? darkColors : lightColors;
    return { colors, ui: styles(colors), dark };
  }, [dark]);
  return React.createElement(ThemeContext.Provider, { value }, children);
}
