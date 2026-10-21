import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Platform, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CollectionProvider } from '../src/state/CollectionProvider';
import { colors } from '../src/ui/theme';
import '../src/ui/global.css';
export default function RootLayout() {
  const [loaded, error] = useFonts({ Pixelify: require('../assets/fonts/PixelifySans.ttf') });
  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !__DEV__) {
      navigator.serviceWorker.register('/sw.js').catch(e => console.error('Offline cache registration failed', e));
    }
  }, []);
  if (error) return <View><Text>Pixelify Sans could not load. Reopen the app to retry.</Text></View>;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top', 'left', 'right', 'bottom']}>
    <StatusBar style="dark" /><CollectionProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} /></CollectionProvider>
  </SafeAreaView></SafeAreaProvider>;
}
