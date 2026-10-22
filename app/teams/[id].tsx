import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { PersonalTeam } from '../../src/ui/Teams';
export default function Team() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  return (
    <Shell narrow>
      <PersonalTeam key={id} id={id} />
    </Shell>
  );
}
