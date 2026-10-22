import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { Notebook } from '../../src/ui/Notebook';
export default function Notes() {
  const { id, section } = useLocalSearchParams<{
    id: string;
    section: string;
  }>();
  return (
    <Shell>
      <Notebook key={id + section} id={id} initialSection={section} />
    </Shell>
  );
}
