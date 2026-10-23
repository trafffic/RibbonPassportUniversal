import React, { useState } from 'react';
import { Platform, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from './theme';
import { PixelText } from './primitives';

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromISO = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
};

/** The iPhone compact DatePicker; Android opens the system calendar dialog. */
export function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange(v: string): void;
}) {
  const { colors } = useTheme(),
    [open, setOpen] = useState(false);
  if (Platform.OS === 'ios')
    return (
      <DateTimePicker
        accessibilityLabel="Date"
        value={fromISO(value)}
        mode="date"
        display="compact"
        onChange={(_, d) => d && onChange(toISO(d))}
        style={{ alignSelf: 'flex-start' }}
      />
    );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Date: ${value}`}
        onPress={() => setOpen(true)}
        style={{
          alignSelf: 'flex-start',
          padding: 10,
          minHeight: 44,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.panel,
        }}
      >
        <PixelText style={{ fontSize: 16 }}>{value}</PixelText>
      </Pressable>
      {open && (
        <DateTimePicker
          value={fromISO(value)}
          mode="date"
          onChange={(event, d) => {
            setOpen(false);
            if (event.type === 'set' && d) onChange(toISO(d));
          }}
        />
      )}
    </>
  );
}
