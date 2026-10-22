import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Panel, PixelText } from './primitives';
import { useTheme } from './theme';

/** A record that no longer exists, with a way back instead of a dead end. */
export function Missing({ message }: { message: string }) {
  const router = useRouter(),
    { ui } = useTheme();
  return (
    <Panel style={{ gap: 12 }}>
      <PixelText accessibilityRole="alert">{message}</PixelText>
      <View style={ui.row}>
        <Button primary onPress={() => router.replace('/')}>
          Back to storage
        </Button>
        <Button onPress={() => router.push('/recovery')}>
          Recovery history
        </Button>
      </View>
    </Panel>
  );
}
