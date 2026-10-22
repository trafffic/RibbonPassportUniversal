import React from 'react';
import { useRouter } from 'expo-router';
import { Shell } from '../src/ui/Shell';
import { Button, PixelText } from '../src/ui/primitives';
export default function NotFound() {
  const router = useRouter();
  return (
    <Shell>
      <PixelText>This page is not in your passport.</PixelText>
      <Button onPress={() => router.replace('/')}>Back to collection</Button>
    </Shell>
  );
}
