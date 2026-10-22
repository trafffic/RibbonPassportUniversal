import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { Teams } from '../../src/ui/Teams';
export default function TeamList() {
  const { kind } = useLocalSearchParams<{
    kind: string;
  }>();
  return (
    <Shell>
      <Teams kind={kind} />
    </Shell>
  );
}
