import React from 'react';
import { useTheme } from './theme';

/** The browser's own calendar picker, standing in for the iPhone DatePicker. */
export function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange(v: string): void;
}) {
  const { colors } = useTheme();
  return React.createElement('input', {
    type: 'date',
    'aria-label': 'Date',
    value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    style: {
      fontFamily: 'Pixelify',
      fontSize: 16,
      padding: 10,
      minHeight: 44,
      color: colors.ink,
      backgroundColor: colors.panel,
      border: `1px solid ${colors.border}`,
      colorScheme: 'light dark',
      alignSelf: 'flex-start',
    },
  });
}
