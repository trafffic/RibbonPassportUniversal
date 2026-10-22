import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { FieldGuideLibrary } from '../../src/ui/Community';
export default function Guides() {
  const { award, game } = useLocalSearchParams<{
    award: string;
    game: string;
  }>();
  return (
    <Shell>
      <FieldGuideLibrary award={award} initialGame={game} />
    </Shell>
  );
}
