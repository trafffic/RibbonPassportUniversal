import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Platform, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CollectionProvider } from '../src/state/CollectionProvider';
import { colors, ThemeProvider, useTheme } from '../src/ui/theme';
import '../src/ui/global.css';
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Pixelify: require('../assets/fonts/PixelifySans.ttf'),
  });
  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      !__DEV__
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((e) => console.error('Offline cache registration failed', e));
    }
  }, []);
  if (error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 12,
        }}
      >
        <Text style={{ color: colors.ink, fontSize: 18, textAlign: 'center' }}>
          Ribbon Passport could not load its font.
        </Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>
          Your collection is safe. Close and reopen the app to try again.
        </Text>
      </View>
    );
  if (!loaded)
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return (
    <SafeAreaProvider>
      <CollectionProvider>
        <ThemeProvider>
          <Navigation />
        </ThemeProvider>
      </CollectionProvider>
    </SafeAreaProvider>
  );
}
function Navigation() {
  const { colors, dark } = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      />
    </SafeAreaView>
  );
}
