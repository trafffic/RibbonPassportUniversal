import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { Build } from '../../src/ui/Teams';
export default function BuildScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  return (
    <Shell narrow>
      <Build key={id} id={id} />
    </Shell>
  );
}
