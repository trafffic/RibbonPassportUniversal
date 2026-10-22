import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { GuideDetail } from '../../src/ui/Community';
export default function Guide() {
  const { id, game, award } = useLocalSearchParams<{
    id: string;
    game: string;
    award: string;
  }>();
  return (
    <Shell narrow>
      <GuideDetail key={id} id={id} initialGame={game} award={award} />
    </Shell>
  );
}
