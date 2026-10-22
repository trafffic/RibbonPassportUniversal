import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { TeamDetail } from '../../src/ui/Community';
export default function Team() {
  const { id, game } = useLocalSearchParams<{
    id: string;
    game: string;
  }>();
  return (
    <Shell>
      <TeamDetail key={id} id={id} initialGame={game} />
    </Shell>
  );
}
