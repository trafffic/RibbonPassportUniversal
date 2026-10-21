import { StyleSheet } from 'react-native';
export const colors = {
  paper: '#E6EDDB', panel: '#F7F9EE', ink: '#2D412B', muted: '#566C48',
  board: '#D2DFBA', border: '#9BAD80', accent: '#4B7030', dark: '#2C3D2A',
  warning: '#F5DEB6', warningInk: '#713709', white: '#FFFFFF',
};
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: 24, gap: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  panel: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 18 },
  label: { fontSize: 13, color: colors.muted, letterSpacing: 1.4 },
  heading: { fontSize: 30, color: colors.ink },
  body: { fontSize: 18, color: colors.ink },
  muted: { color: colors.muted },
  rule: { borderTopWidth: 1, borderColor: colors.border },
  input: { fontFamily: 'Pixelify', color: colors.ink, fontSize: 18, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
});
