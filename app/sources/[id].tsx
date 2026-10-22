import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { SourceDetail } from '../../src/ui/Community';
export default function Source() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  return (
    <Shell narrow>
      <SourceDetail key={id} id={id} />
    </Shell>
  );
}
